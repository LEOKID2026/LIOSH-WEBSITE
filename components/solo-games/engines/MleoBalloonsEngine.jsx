import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import { useSoloBoardTap } from "./solo-v2-ui.jsx";

const BG_BALLOONS = "/images/game-balloons-bg.png";
const IMG_BOMB = "/images/obstacle1.png";
const IMG_DIAMOND = "/images/diamond.png";

const GAME_DURATION_SEC = 60;
const MAX_LIVES = 3;
const MISSES_PER_LIFE = 4;

const SCORE_GOOD = 10;
const SCORE_GOLD = 25;
const SCORE_DIAMOND = 40;
const COMBO_EVERY = 5;
const COMBO_BONUS = 5;

const TICK_MS = 32;
const BALLOON_SIZE_PX = 72;

/**
 * @param {number} level
 */
function levelConfig(level) {
  const lv = Math.max(1, level);
  return {
    riseSpeed: 1.6 + (lv - 1) * 0.28,
    spawnMs: Math.max(520, 980 - (lv - 1) * 70),
    maxOnScreen: Math.min(9, 3 + Math.floor(lv / 2)),
    bombChance: Math.min(0.17, 0.06 + lv * 0.012),
    goldChance: Math.min(0.2, 0.1 + lv * 0.008),
    diamondChance: 0.035,
    clockChance: 0.038,
    heartChance: 0.028,
    targetPops: 10 + (lv - 1) * 2,
  };
}

/**
 * @param {number} level
 */
function rollKind(level) {
  const c = levelConfig(level);
  const r = Math.random();
  if (r < c.bombChance) return "bomb";
  if (r < c.bombChance + c.goldChance) return "gold";
  if (r < c.bombChance + c.goldChance + c.diamondChance) return "diamond";
  if (r < c.bombChance + c.goldChance + c.diamondChance + c.clockChance) return "clock";
  if (
    r <
    c.bombChance + c.goldChance + c.diamondChance + c.clockChance + c.heartChance
  ) {
    return "heart";
  }
  return "good";
}

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoBalloonsEngine({ autoStart = false, onSessionEnd }) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const captureRef = useRef(null);
  const loopRef = useRef(null);
  const spawnRef = useRef(null);
  const timerRef = useRef(null);
  const idRef = useRef(0);

  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const scoringPopsRef = useRef(0);
  const missesRef = useRef(0);
  const comboRef = useRef(0);
  const levelRef = useRef(1);
  const livesRef = useRef(MAX_LIVES);
  const timeLeftRef = useRef(GAME_DURATION_SEC);
  const targetRef = useRef(10);
  const balloonsRef = useRef([]);

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [pops, setPops] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(10);
  const [balloons, setBalloons] = useState([]);
  const [popFx, setPopFx] = useState([]);
  const [levelFlash, setLevelFlash] = useState(false);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "balloons",
    gameRunning,
    showIntro,
    gameOver,
  });

  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return undefined;
    const block = (e) => {
      if (e.target?.closest?.("button")) return;
      e.preventDefault();
    };
    wrapper.addEventListener("contextmenu", block);
    return () => wrapper.removeEventListener("contextmenu", block);
  }, []);

  const addPopFx = (xPct, yPct, text) => {
    const id = Date.now() + Math.random();
    setPopFx((prev) => [...prev.slice(-8), { id, xPct, yPct, text }]);
    setTimeout(() => {
      setPopFx((prev) => prev.filter((f) => f.id !== id));
    }, 700);
  };

  const registerMiss = (remaining) => {
    comboRef.current = 0;
    missesRef.current += 1;
    setMisses(missesRef.current);
    if (missesRef.current % MISSES_PER_LIFE === 0) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) endGame(false, remaining);
    }
  };

  const levelUp = () => {
    levelRef.current += 1;
    const cfg = levelConfig(levelRef.current);
    targetRef.current = cfg.targetPops;
    setLevel(levelRef.current);
    setTarget(cfg.targetPops);
    setLevelFlash(true);
    setTimeout(() => setLevelFlash(false), 1600);
  };

  const addScore = (pts, balloon) => {
    if (pts > 0) {
      scoreRef.current += pts;
      setScore(scoreRef.current);
      addPopFx(balloon.x, balloon.y, `+${pts}`);
    }
    scoringPopsRef.current += 1;
    comboRef.current += 1;
    setPops(scoringPopsRef.current);
    if (comboRef.current > 0 && comboRef.current % COMBO_EVERY === 0) {
      scoreRef.current += COMBO_BONUS;
      setScore(scoreRef.current);
      sfx.playCombo();
      addPopFx(balloon.x, balloon.y - 4, `+${COMBO_BONUS} combo!`);
    }
    if (scoringPopsRef.current > 0 && scoringPopsRef.current % 5 === 0) {
      levelUp();
    }
  };

  const fireSessionEnd = (didWin, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
      didWin,
      levelReached: 0,
      mistakes: missesRef.current,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (didWin, remaining) => {
    runningRef.current = false;
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    balloonsRef.current = [];
    setBalloons([]);
    if (loopRef.current) clearInterval(loopRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pendingSessionEndRef.current = { didWin, remaining };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin, pending.remaining);
  };

  const loseLife = (remaining) => {
    comboRef.current = 0;
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) endGame(false, remaining);
  };

  const spawnBalloon = () => {
    const cfg = levelConfig(levelRef.current);
    if (balloonsRef.current.length >= cfg.maxOnScreen) return;
    idRef.current += 1;
    balloonsRef.current.push({
      id: idRef.current,
      kind: rollKind(levelRef.current),
      x: 8 + Math.random() * 84,
      y: -8,
    });
  };

  const popBalloon = (balloon) => {
    if (!runningRef.current || !balloon) return;
    balloonsRef.current = balloonsRef.current.filter((b) => b.id !== balloon.id);
    setBalloons([...balloonsRef.current]);

    const remaining = timeLeftRef.current;

    if (balloon.kind === "bomb") {
      addPopFx(balloon.x, balloon.y, "💣");
      sfx.playHit();
      loseLife(remaining);
      return;
    }

    if (balloon.kind === "clock") {
      timeLeftRef.current = Math.min(GAME_DURATION_SEC + 15, timeLeftRef.current + 5);
      setTimeLeft(timeLeftRef.current);
      addPopFx(balloon.x, balloon.y, "+5s");
      return;
    }

    if (balloon.kind === "heart") {
      if (livesRef.current < MAX_LIVES) {
        livesRef.current += 1;
        setLives(livesRef.current);
        addPopFx(balloon.x, balloon.y, "+❤️");
      } else {
        addPopFx(balloon.x, balloon.y, "❤️");
      }
      return;
    }

    let pts = SCORE_GOOD;
    if (balloon.kind === "gold") {
      pts = SCORE_GOLD;
      sfx.playStar();
    } else {
      sfx.playPop();
    }
    if (balloon.kind === "diamond") pts = SCORE_DIAMOND;
    addScore(pts, balloon);

    if (scoringPopsRef.current >= targetRef.current) {
      sfx.playSuccessSm();
      endGame(true, remaining);
    }
  };

  const findBalloonAt = (x, y, rect) => {
    const hitR = Math.max(52, rect.width * 0.12);

    for (let i = balloonsRef.current.length - 1; i >= 0; i -= 1) {
      const b = balloonsRef.current[i];
      const bx = (b.x / 100) * rect.width;
      const byFromTop = rect.height - (b.y / 100) * rect.height - BALLOON_SIZE_PX / 2;
      if (Math.hypot(x - bx, y - byFromTop) <= hitR) return b;
    }
    return null;
  };

  const handleBoardTap = (x, y, rect) => {
    const b = findBalloonAt(x, y, rect);
    if (b) popBalloon(b);
  };

  useSoloBoardTap(boardRef, captureRef, runningRef, handleBoardTap, gameRunning && !gameOver);

  const tick = () => {
    if (!runningRef.current) return;
    const cfg = levelConfig(levelRef.current);
    const next = [];

    for (const b of balloonsRef.current) {
      const ny = b.y + cfg.riseSpeed;
      if (ny > 108) {
        if (b.kind !== "bomb" && b.kind !== "clock" && b.kind !== "heart") {
          registerMiss(timeLeftRef.current);
        }
      } else {
        next.push({ ...b, y: ny });
      }
    }

    balloonsRef.current = next;
    setBalloons([...next]);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    scoringPopsRef.current = 0;
    missesRef.current = 0;
    comboRef.current = 0;
    levelRef.current = 1;
    livesRef.current = MAX_LIVES;
    timeLeftRef.current = GAME_DURATION_SEC;
    targetRef.current = levelConfig(1).targetPops;
    balloonsRef.current = [];

    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setPops(0);
    setMisses(0);
    setLives(MAX_LIVES);
    setTimeLeft(GAME_DURATION_SEC);
    setLevel(1);
    setTarget(targetRef.current);
    setBalloons([]);
    setPopFx([]);
    setLevelFlash(false);

    syncPortraitPromptForRun();
    setGameRunning(true);
    runningRef.current = true;

    spawnBalloon();
    spawnBalloon();

    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(tick, TICK_MS);

    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      if (runningRef.current) spawnBalloon();
    }, levelConfig(1).spawnMs);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!runningRef.current) return;
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        endGame(scoringPopsRef.current >= targetRef.current, 0);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (spawnRef.current) clearInterval(spawnRef.current);
    const cfg = levelConfig(levelRef.current);
    spawnRef.current = setInterval(() => {
      if (runningRef.current) spawnBalloon();
    }, cfg.spawnMs);
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [gameRunning, level]);

  useEffect(() => {
    if (autoStart) startGame();
    return () => {
      runningRef.current = false;
      if (loopRef.current) clearInterval(loopRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const balloonVisual = (kind) => {
    if (kind === "bomb") {
      return <img src={IMG_BOMB} alt="" className="pointer-events-none h-14 w-14 object-contain drop-shadow-sm" draggable={false} />;
    }
    if (kind === "gold") {
      return <span className="pointer-events-none text-4xl drop-shadow-sm">⭐</span>;
    }
    if (kind === "diamond") {
      return <img src={IMG_DIAMOND} alt="" className="pointer-events-none h-14 w-14 object-contain drop-shadow-sm" draggable={false} />;
    }
    if (kind === "clock") {
      return <span className="pointer-events-none text-4xl drop-shadow-sm">⏱️</span>;
    }
    if (kind === "heart") {
      return <span className="pointer-events-none text-4xl drop-shadow-sm">💖</span>;
    }
    return <span className="pointer-events-none text-5xl drop-shadow-sm">🎈</span>;
  };

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      {!showIntro && (
        <div className="relative flex min-h-0 w-full flex-1 flex-col px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {score}</span>
            {" · "}
            <span>יעד: {pops}/{target}</span>
            {" · "}
            <span>רמה: {level}</span>
            {" · "}
            <span>{"❤️".repeat(Math.max(0, lives)) || "-"}</span>
            {" · "}
            <span>פספוסים: {misses}</span>
            {" · "}
            <span>{timeLeft} שנ׳</span>
          </div>

          <div
            ref={boardRef}
            className="relative z-0 mx-auto mt-11 flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30 shadow-lg sm:mt-12"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(0,0,0,0.12)), url(${BG_BALLOONS})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              touchAction: "none",
            }}
          >
            {showFullscreenButton ? (
              <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                <SoloGameMobileFullscreenButton
                  isFullscreen={isFullscreen}
                  onToggle={toggleFromUserGesture}
                />
              </div>
            ) : null}

            {balloons.map((b) => (
              <div
                key={b.id}
                className="pointer-events-none absolute flex h-[72px] w-[72px] -translate-x-1/2 items-center justify-center"
                style={{ left: `${b.x}%`, bottom: `${b.y}%` }}
              >
                {balloonVisual(b.kind)}
              </div>
            ))}

            {popFx.map((fx) => (
              <div
                key={fx.id}
                className="pointer-events-none absolute z-20 -translate-x-1/2 animate-bounce text-base font-extrabold text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:text-lg"
                style={{ left: `${fx.xPct}%`, bottom: `${fx.yPct}%` }}
              >
                {fx.text}
              </div>
            ))}

            {levelFlash ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-black/35 pt-[20%]">
                <span className="rounded-xl bg-yellow-400 px-5 py-2 text-xl font-extrabold text-black shadow-lg sm:text-2xl">
                  רמה {level}!
                </span>
              </div>
            ) : null}

            <div
              ref={captureRef}
              className={`absolute inset-0 z-[60] ${gameRunning && !gameOver ? "cursor-pointer" : "pointer-events-none"}`}
              style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
              aria-hidden
            />

            {gameOver ? (
              <SoloGameEndInterstitialOverlay
                didWin={won}
                onDone={completeEndInterstitial}
              />
            ) : null}
          </div>
        </div>
      )}

      <SoloGamePortraitRecommendationModal
        show={showPortraitPrompt}
        onDismissRotate={() => {
          dismissPortraitPrompt(false);
          enterFromUserGesture();
        }}
        onContinueAnyway={() => {
          dismissPortraitPrompt(true);
          enterFromUserGesture();
        }}
      />
    </div>
  );
}
