import { useEffect, useRef, useState } from "react";
import { useSoloBoardTap } from "./solo-v2-ui.jsx";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
const BG_TARGET = "/images/game-day.png";
const IMG_COIN = "/images/coin.png";
const IMG_DIAMOND = "/images/diamond.png";
const IMG_STAR = "/images/candy/star.png";
const IMG_BOMB = "/images/obstacle1.png";

const MAX_LIVES = 3;
const MISSES_PER_LIFE = 3;
const COMBO_EVERY = 5;
const COMBO_BONUS = 5;

const SCORE_COIN = 20;
const SCORE_DIAMOND = 40;
const SCORE_STAR = 30;

const DIFFICULTY_BASE = {
  easy: { targetHits: 12, durationSec: 50, lifetimeMs: 1700, sizePx: 86, bombChance: 0.1 },
  medium: { targetHits: 16, durationSec: 55, lifetimeMs: 1350, sizePx: 78, bombChance: 0.13 },
  hard: { targetHits: 20, durationSec: 60, lifetimeMs: 1100, sizePx: 72, bombChance: 0.16 },
};

/**
 * @param {number} level
 * @param {string} difficulty
 */
function levelConfig(level, difficulty) {
  const base = DIFFICULTY_BASE[difficulty] || DIFFICULTY_BASE.medium;
  const lv = Math.max(1, level);
  return {
    ...base,
    lifetimeMs: Math.max(650, base.lifetimeMs - (lv - 1) * 90),
    sizePx: Math.max(58, base.sizePx - (lv - 1) * 3),
    spawnMs: Math.max(700, 1300 - (lv - 1) * 85),
    maxOnScreen: Math.min(3, 1 + Math.floor((lv - 1) / 2)),
    bombChance: Math.min(0.24, base.bombChance + (lv - 1) * 0.014),
    diamondChance: 0.09,
    starChance: 0.07,
    targetHits: base.targetHits + Math.floor((lv - 1) / 2) * 2,
  };
}

/**
 * @param {number} level
 * @param {string} difficulty
 */
function rollKind(level, difficulty) {
  const c = levelConfig(level, difficulty);
  const r = Math.random();
  if (r < c.bombChance) return "bomb";
  if (r < c.bombChance + c.diamondChance) return "diamond";
  if (r < c.bombChance + c.diamondChance + c.starChance) return "star";
  return "coin";
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoTargetTapEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const captureRef = useRef(null);
  const tickRef = useRef(null);
  const spawnRef = useRef(null);
  const timerRef = useRef(null);
  const idRef = useRef(0);

  const runningRef = useRef(false);
  const difficultyRef = useRef(initialDifficulty);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const comboRef = useRef(0);
  const levelRef = useRef(1);
  const livesRef = useRef(MAX_LIVES);
  const timeLeftRef = useRef(55);
  const targetHitsRef = useRef(16);
  const targetsRef = useRef([]);

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(55);
  const [level, setLevel] = useState(1);
  const [targetGoal, setTargetGoal] = useState(16);
  const [targets, setTargets] = useState([]);
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
    gameKey: "target-tap",
    gameRunning,
    showIntro,
    gameOver,
  });

  useEffect(() => {
    if (initialDifficulty) difficultyRef.current = initialDifficulty;
  }, [initialDifficulty]);

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
    setPopFx((prev) => [...prev.slice(-10), { id, xPct, yPct, text }]);
    setTimeout(() => {
      setPopFx((prev) => prev.filter((f) => f.id !== id));
    }, 650);
  };

  const loseLife = (remaining) => {
    comboRef.current = 0;
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) endGame(false, remaining);
  };

  const registerMiss = (remaining) => {
    comboRef.current = 0;
    missesRef.current += 1;
    setMisses(missesRef.current);
    if (missesRef.current % MISSES_PER_LIFE === 0) loseLife(remaining);
  };

  const levelUp = () => {
    sfx.playLevelUp();
    levelRef.current += 1;
    const cfg = levelConfig(levelRef.current, difficultyRef.current);
    targetHitsRef.current = cfg.targetHits;
    setLevel(levelRef.current);
    setTargetGoal(cfg.targetHits);
    setLevelFlash(true);
    setTimeout(() => setLevelFlash(false), 1600);
  };

  const scoringKind = (kind) => kind === "coin" || kind === "diamond" || kind === "star";

  const registerHit = (target, remaining) => {
    let pts = SCORE_COIN;
    if (target.kind === "diamond") pts = SCORE_DIAMOND;
    if (target.kind === "star") {
      pts = SCORE_STAR;
      sfx.playStar();
    } else {
      sfx.playTargetHit();
    }

    scoreRef.current += pts;
    hitsRef.current += 1;
    comboRef.current += 1;
    setScore(scoreRef.current);
    setHits(hitsRef.current);
    addPopFx(target.xPct, target.yPct, `+${pts}`);

    if (comboRef.current > 0 && comboRef.current % COMBO_EVERY === 0) {
      scoreRef.current += COMBO_BONUS;
      setScore(scoreRef.current);
      sfx.playCombo();
      addPopFx(target.xPct, target.yPct - 3, `+${COMBO_BONUS} combo!`);
    }

    if (hitsRef.current > 0 && hitsRef.current % 4 === 0) levelUp();

    if (hitsRef.current >= targetHitsRef.current) {
      endGame(true, remaining);
    }
  };

  const fireSessionEnd = (didWin, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
      didWin,
      difficulty: difficultyRef.current,
      mistakes: missesRef.current,
      timeRemainingSec: remaining,
      levelReached: Math.floor(scoreRef.current / 5),
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
    targetsRef.current = [];
    setTargets([]);
    if (tickRef.current) clearInterval(tickRef.current);
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

  const spawnTarget = () => {
    const cfg = levelConfig(levelRef.current, difficultyRef.current);
    if (targetsRef.current.length >= cfg.maxOnScreen) return;

    idRef.current += 1;
    const pad = 12;
    const t = {
      id: idRef.current,
      kind: rollKind(levelRef.current, difficultyRef.current),
      xPct: pad + Math.random() * (100 - pad * 2),
      yPct: pad + Math.random() * (100 - pad * 2),
      size: cfg.sizePx,
      expiresAt: Date.now() + cfg.lifetimeMs,
    };
    targetsRef.current = [...targetsRef.current, t];
    setTargets([...targetsRef.current]);
  };

  const removeTarget = (id) => {
    targetsRef.current = targetsRef.current.filter((t) => t.id !== id);
    setTargets([...targetsRef.current]);
  };

  const expireTargets = () => {
    if (!runningRef.current) return;
    const now = Date.now();
    const remaining = timeLeftRef.current;
    const next = [];

    for (const t of targetsRef.current) {
      if (t.expiresAt > now) {
        next.push(t);
        continue;
      }
      if (t.kind === "bomb") continue;
      if (scoringKind(t.kind)) registerMiss(remaining);
    }

    targetsRef.current = next;
    setTargets([...next]);
  };

  const findTargetAt = (x, y, rect) => {
    const padHit = Math.max(22, rect.width * 0.055);

    for (let i = targetsRef.current.length - 1; i >= 0; i -= 1) {
      const t = targetsRef.current[i];
      const tx = (t.xPct / 100) * rect.width;
      const ty = (t.yPct / 100) * rect.height;
      const r = t.size / 2 + padHit;
      if (Math.hypot(x - tx, y - ty) <= r) return t;
    }
    return null;
  };

  const handleBoardTap = (x, y, rect) => {
    const t = findTargetAt(x, y, rect);
    if (!t) return;

    const remaining = timeLeftRef.current;
    removeTarget(t.id);

    if (t.kind === "bomb") {
      addPopFx(t.xPct, t.yPct, "💣");
      loseLife(remaining);
      return;
    }

    registerHit(t, remaining);
  };

  useSoloBoardTap(boardRef, captureRef, runningRef, handleBoardTap, gameRunning && !gameOver);

  const startGame = () => {
    const diff = difficultyRef.current;
    const cfg = levelConfig(1, diff);

    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    comboRef.current = 0;
    levelRef.current = 1;
    livesRef.current = MAX_LIVES;
    timeLeftRef.current = cfg.durationSec;
    targetHitsRef.current = cfg.targetHits;
    targetsRef.current = [];

    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setHits(0);
    setMisses(0);
    setLives(MAX_LIVES);
    setTimeLeft(cfg.durationSec);
    setLevel(1);
    setTargetGoal(cfg.targetHits);
    setTargets([]);
    setPopFx([]);
    setLevelFlash(false);

    syncPortraitPromptForRun();
    setGameRunning(true);
    runningRef.current = true;

    spawnTarget();

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(expireTargets, 120);

    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      if (runningRef.current) spawnTarget();
    }, cfg.spawnMs);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!runningRef.current) return;
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        endGame(hitsRef.current >= targetHitsRef.current, 0);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!gameRunning) return undefined;
    const cfg = levelConfig(levelRef.current, difficultyRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      if (runningRef.current) spawnTarget();
    }, cfg.spawnMs);
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [gameRunning, level]);

  useEffect(() => {
    if (autoStart) startGame();
    return () => {
      runningRef.current = false;
      if (tickRef.current) clearInterval(tickRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const targetImg = (kind) => {
    if (kind === "bomb") return IMG_BOMB;
    if (kind === "diamond") return IMG_DIAMOND;
    if (kind === "star") return IMG_STAR;
    return IMG_COIN;
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
            <span>פגיעות: {hits}/{targetGoal}</span>
            {" · "}
            <span>רמה: {level}</span>
            {" · "}
            <span>{"❤️".repeat(Math.max(0, lives)) || "-"}</span>
            {" · "}
            <span>טעויות: {misses}</span>
            {" · "}
            <span>{timeLeft} שנ׳</span>
          </div>

          <div
            ref={boardRef}
            className="relative z-0 mx-auto mt-11 flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 shadow-lg sm:mt-12"
            style={{
              backgroundImage: `url(${BG_TARGET})`,
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

            {targets.map((t) => (
              <div
                key={t.id}
                className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{
                  left: `${t.xPct}%`,
                  top: `${t.yPct}%`,
                  width: t.size,
                  height: t.size,
                }}
              >
                <img
                  src={targetImg(t.kind)}
                  alt=""
                  className="h-full w-full object-contain drop-shadow-sm"
                  draggable={false}
                />
              </div>
            ))}

            {popFx.map((fx) => (
              <div
                key={fx.id}
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 text-base font-extrabold text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:text-lg"
                style={{ left: `${fx.xPct}%`, top: `${fx.yPct}%` }}
              >
                {fx.text}
              </div>
            ))}

            {levelFlash ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-black/35 pt-[18%]">
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
