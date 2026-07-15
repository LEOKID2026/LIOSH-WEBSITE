import { useCallback, useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import { buildMazeLevel, findPath } from "../../../lib/solo-games/maze-generator.js";

const IMG_LEO = "/images/leo.png";
const IMG_STAR = "/images/candy/star.png";
const IMG_DIAMOND = "/images/diamond.png";

const SCORE_STAR = 20;
const SCORE_KEY = 10;
const SCORE_DIAMOND = 50;
const SCORE_MAZE = 100;

const SCORE_CAP = { easy: 900, medium: 1100, hard: 1300 };

const DIFFICULTY_SETTINGS = {
  easy: {
    rows: 9,
    cols: 7,
    timeSec: 180,
    maxMistakes: 20,
    starCount: 3,
    hintAfter: 4,
    cellMin: 30,
    cellMinLg: 38,
    diamondChance: 0.75,
    diamondSec: 10,
  },
  medium: {
    rows: 11,
    cols: 9,
    timeSec: 210,
    maxMistakes: 14,
    starCount: 4,
    hintAfter: 99,
    cellMin: 24,
    cellMinLg: 32,
    diamondChance: 0.7,
    diamondSec: 10,
  },
  hard: {
    rows: 13,
    cols: 11,
    timeSec: 240,
    maxMistakes: 10,
    starCount: 5,
    hintAfter: 99,
    cellMin: 20,
    cellMinLg: 28,
    diamondChance: 0.65,
    diamondSec: 10,
  },
};

function streakBonus(mazesCompleted) {
  if (mazesCompleted < 2) return 0;
  return Math.floor((mazesCompleted - 1) / 2) * 25;
}

function computeFinalScore(sessionScore, mazesCompleted, timeRemaining, difficulty) {
  let total = sessionScore;
  if (mazesCompleted >= 1) total += timeRemaining;
  const cap = SCORE_CAP[difficulty] || SCORE_CAP.medium;
  return Math.min(total, cap);
}

function nextHintCell(maze, player, target) {
  const route = findPath(maze, player, target);
  if (route.length >= 2) return route[1];
  return null;
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoMazeEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const mazeLayoutRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, active: false });
  const hintTimerRef = useRef(null);
  const msgTimerRef = useRef(null);
  const wallHitTimerRef = useRef(null);

  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const starsTakenRef = useRef(0);
  const mazesCompletedRef = useRef(0);
  const hasKeyRef = useRef(false);
  const timeLeftRef = useRef(210);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [maze, setMaze] = useState([]);
  const [stars, setStars] = useState([]);
  const [keyCell, setKeyCell] = useState(null);
  const [start, setStart] = useState({ r: 1, c: 1 });
  const [exit, setExit] = useState({ r: 3, c: 3 });
  const [mazeId, setMazeId] = useState(0);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [starsTaken, setStarsTaken] = useState(0);
  const [mazesCompleted, setMazesCompleted] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [timeLeft, setTimeLeft] = useState(210);
  const [statusMsg, setStatusMsg] = useState("");
  const [hintCell, setHintCell] = useState(null);
  const [bonusDiamond, setBonusDiamond] = useState(null);
  const [diamondBanner, setDiamondBanner] = useState(false);
  const [wallHitCell, setWallHitCell] = useState(null);
  const [cellPx, setCellPx] = useState(24);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "maze",
    gameRunning,
    showIntro,
    gameOver,
  });

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (wallHitTimerRef.current) clearTimeout(wallHitTimerRef.current);
    },
    []
  );

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const isEasy = difficulty === "easy";

  useEffect(() => {
    if (showIntro || !gameRunning) return undefined;
    const area = mazeLayoutRef.current;
    if (!area) return undefined;

    const compute = () => {
      const rect = area.getBoundingClientRect();
      const desktopSide = window.matchMedia("(min-width: 768px)").matches;

      if (desktopSide) {
        const gapPx = 4;
        const boardPad = 14;
        const verticalReserve = 12;
        const availW = Math.max(100, rect.width - boardPad);
        const availH = Math.max(100, rect.height - boardPad - verticalReserve);
        const fromW = (availW - (settings.cols - 1) * gapPx) / settings.cols;
        const fromH = (availH - (settings.rows - 1) * gapPx) / settings.rows;
        const largeDesktop = window.matchMedia("(min-width: 1024px)").matches;
        const maxCell =
          difficulty === "hard"
            ? largeDesktop
              ? 44
              : 36
            : difficulty === "medium"
              ? largeDesktop
                ? 52
                : 44
              : largeDesktop
                ? 58
                : 50;
        setCellPx(
          Math.max(14, Math.min(maxCell, Math.floor(Math.min(fromW, fromH))))
        );
        return;
      }

      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const dpadH = portrait ? 196 : 0;
      const availW = Math.max(100, rect.width - 8);
      const availH = Math.max(100, rect.height - dpadH - 4);
      const fromW = availW / settings.cols;
      const fromH = availH / settings.rows;
      const vwCell = Math.floor(window.innerWidth * 0.04);
      const fit = Math.floor(Math.min(fromW, fromH));
      const cap = settings.cellMinLg + 4;
      setCellPx(Math.max(settings.cellMin, Math.min(cap, Math.max(vwCell, fit))));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(area);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, [showIntro, gameRunning, settings.cols, settings.rows, settings.cellMin, settings.cellMinLg, mazeId, difficulty]);

  const flashMsg = useCallback((text, ms = 1400) => {
    setStatusMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setStatusMsg(""), ms);
  }, []);

  const fireSessionEnd = (didWin, remaining, finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin,
      difficulty,
      mistakes: mistakesRef.current,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
      mazeCompleted: mazesCompletedRef.current,
      starsCollected: starsTakenRef.current,
    });
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    const finalScore = didWin
      ? computeFinalScore(scoreRef.current, mazesCompletedRef.current, remaining, difficulty)
      : 0;
    scoreRef.current = finalScore;
    setScore(finalScore);
    pendingSessionEndRef.current = { didWin, remaining, finalScore };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin, pending.remaining, pending.finalScore);
  };

  const applyLevel = useCallback(
    (level) => {
      setMaze(level.maze);
      setStart(level.start);
      setExit(level.exit);
      setKeyCell(level.key);
      setMazeId(level.mazeId);
      setPlayer(level.start);
      setStars(level.stars);
      setBonusDiamond(level.bonusDiamond);
      hasKeyRef.current = false;
      setHasKey(false);
      setHintCell(null);
      setWallHitCell(null);
      if (level.bonusDiamond) {
        setDiamondBanner(true);
        window.setTimeout(() => setDiamondBanner(false), 2200);
      }
    },
    []
  );

  const loadNextMaze = useCallback(() => {
    const level = buildMazeLevel(
      settings.rows,
      settings.cols,
      settings.starCount,
      difficulty,
      true,
      { diamondChance: settings.diamondChance, diamondSec: settings.diamondSec }
    );
    applyLevel(level);
  }, [applyLevel, difficulty, settings.cols, settings.diamondChance, settings.diamondSec, settings.rows, settings.starCount]);

  const completeMaze = useCallback(() => {
    sfx.playExit();
    mazesCompletedRef.current += 1;
    const mc = mazesCompletedRef.current;
    const bonus = SCORE_MAZE + streakBonus(mc);
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    setMazesCompleted(mc);
    flashMsg("מבוך הושלם! 🎉", 900);
    loadNextMaze();
  }, [flashMsg, loadNextMaze, sfx]);

  const pulseHint = useCallback(
    (nextPlayer) => {
      if (!isEasy || mistakesRef.current < settings.hintAfter) {
        setHintCell(null);
        return;
      }
      const target = hasKeyRef.current ? exit : keyCell || exit;
      const cell = nextHintCell(maze, nextPlayer, target);
      setHintCell(cell);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintCell(null), 2200);
    },
    [exit, isEasy, keyCell, maze, settings.hintAfter]
  );

  const flashWallHit = useCallback((r, c) => {
    setWallHitCell({ r, c });
    if (wallHitTimerRef.current) clearTimeout(wallHitTimerRef.current);
    wallHitTimerRef.current = setTimeout(() => setWallHitCell(null), 400);
  }, []);

  const addMistake = useCallback(() => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    flashMsg("יש קיר!");
    pulseHint(player);
    if (mistakesRef.current >= settings.maxMistakes) {
      endGame(mazesCompletedRef.current >= 1, timeLeftRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashMsg, player, pulseHint, settings.maxMistakes]);

  const startGame = () => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    mistakesRef.current = 0;
    starsTakenRef.current = 0;
    mazesCompletedRef.current = 0;
    hasKeyRef.current = false;
    timeLeftRef.current = settings.timeSec;

    setScore(0);
    setMistakes(0);
    setStarsTaken(0);
    setMazesCompleted(0);
    setHasKey(false);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setStatusMsg("");
    setHintCell(null);
    setWallHitCell(null);
    setDiamondBanner(false);
    setTimeLeft(settings.timeSec);
    loadNextMaze();
    syncPortraitPromptForRun();
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(mazesCompletedRef.current >= 1, 0);
      return undefined;
    }
    const t = setTimeout(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning || !bonusDiamond?.active) return undefined;
    const tick = setInterval(() => {
      setBonusDiamond((prev) => {
        if (!prev?.active) return null;
        const next = prev.secondsLeft - 1;
        if (next <= 0) return null;
        return { ...prev, secondsLeft: next };
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [bonusDiamond?.active, gameRunning]);

  const tryMove = (dr, dc) => {
    if (!gameRunning) return;
    const nr = player.r + dr;
    const nc = player.c + dc;
    if (!maze[nr] || maze[nr][nc] === 1) {
      if (maze[nr]?.[nc] === 1) flashWallHit(nr, nc);
      addMistake();
      return;
    }

    const next = { r: nr, c: nc };
    setPlayer(next);
    setHintCell(null);

    if (keyCell && !hasKeyRef.current && nr === keyCell.r && nc === keyCell.c) {
      hasKeyRef.current = true;
      setHasKey(true);
      scoreRef.current += SCORE_KEY;
      setScore(scoreRef.current);
      sfx.playKey();
      flashMsg("מצאתם מפתח! 🔑", 1000);
    }

    const starIdx = stars.findIndex((s) => !s.taken && s.r === nr && s.c === nc);
    if (starIdx >= 0) {
      setStars((prev) => prev.map((s, i) => (i === starIdx ? { ...s, taken: true } : s)));
      starsTakenRef.current += 1;
      setStarsTaken(starsTakenRef.current);
      scoreRef.current += SCORE_STAR;
      setScore(scoreRef.current);
      sfx.playStar();
    }

    if (
      bonusDiamond?.active &&
      nr === bonusDiamond.r &&
      nc === bonusDiamond.c
    ) {
      scoreRef.current += SCORE_DIAMOND;
      setScore(scoreRef.current);
      setBonusDiamond(null);
      sfx.playDiamond();
      flashMsg("יהלום! +50 💎", 1000);
    }

    if (nr === exit.r && nc === exit.c) {
      if (!hasKeyRef.current) {
        flashMsg("צריך למצוא את המפתח קודם!");
        return;
      }
      completeMaze();
    }
  };

  const tryMoveRef = useRef(tryMove);
  tryMoveRef.current = tryMove;

  useEffect(() => {
    if (!gameRunning || gameOver) return undefined;
    const onKey = (e) => {
      const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        KeyW: [-1, 0],
        KeyS: [1, 0],
        KeyA: [0, -1],
        KeyD: [0, 1],
      };
      const mv = moves[e.code];
      if (!mv) return;
      e.preventDefault();
      tryMoveRef.current(mv[0], mv[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameRunning, gameOver]);

  const handleSwipeEnd = (clientX, clientY) => {
    const s = swipeRef.current;
    if (!s.active) return;
    s.active = false;
    const dx = clientX - s.x;
    const dy = clientY - s.y;
    const min = 28;
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
    else tryMove(dy > 0 ? 1 : -1, 0);
  };

  const goalArrow = () => {
    const target = hasKey ? exit : keyCell || exit;
    const dr = target.r - player.r;
    const dc = target.c - player.c;
    if (Math.abs(dr) >= Math.abs(dc)) return dr < 0 ? "↑" : "↓";
    return dc < 0 ? "←" : "→";
  };

  const isHint = (r, c) => hintCell && hintCell.r === r && hintCell.c === c;
  const isStartCell = (r, c) => start.r === r && start.c === c;
  const isExitCell = (r, c) => exit.r === r && exit.c === c;
  const isKeyCell = (r, c) => keyCell && keyCell.r === r && keyCell.c === c;
  const isBonusDiamond = (r, c) =>
    bonusDiamond?.active && bonusDiamond.r === r && bonusDiamond.c === c;
  const isWallHit = (r, c) => wallHitCell && wallHitCell.r === r && wallHitCell.c === c;

  return (
    <>
      <style>{`
        @keyframes mazeWallHit {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <img src={IMG_LEO} alt="" className="h-20 w-20 object-contain drop-shadow-lg" />
          <h2 className="text-xl font-extrabold text-yellow-300">מרוץ מבוכים - ליאו</h2>
          <p className="max-w-sm text-sm font-semibold text-lime-100">
            פתרו כמה שיותר מבוכים לפני שנגמר הזמן!
          </p>
          <ul className="max-w-sm space-y-1 text-sm text-gray-300">
            <li>🔑 מצאו מפתח → 🚪 הגיעו לשער</li>
            <li>⭐ +20 · 💎 +50 · מבוך +100</li>
            <li>כל מבוך חדש - אספו ורוצו הלאה!</li>
          </ul>
          <button
            type="button"
            onClick={startGame}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black"
          >
            התחל משחק
          </button>
        </div>
      ) : (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
          {showFullscreenButton ? (
            <div className="pointer-events-auto absolute right-2 top-[5.5rem] z-[70]">
              <SoloGameMobileFullscreenButton
                isFullscreen={isFullscreen}
                onToggle={toggleFromUserGesture}
              />
            </div>
          ) : null}

          <div className="pointer-events-none absolute left-1/2 top-1.5 z-[80] w-[98vw] max-w-lg -translate-x-1/2 rounded-xl border border-yellow-400/30 bg-black/70 px-2 py-2 text-center text-xs font-bold leading-relaxed sm:text-sm md:top-0">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              <span className="text-amber-300">ניקוד: {score}</span>
              <span>⏱ {timeLeft} שנ׳</span>
              <span className="text-emerald-300">מבוכים: {mazesCompleted}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
              <span>{hasKey ? "🔑 יש מפתח!" : "🔑 אין מפתח"}</span>
              <span>⭐ {starsTaken}</span>
              <span>טעויות: {mistakes}/{settings.maxMistakes}</span>
              {bonusDiamond?.active ? (
                <span className="animate-pulse text-cyan-300">💎 {bonusDiamond.secondsLeft}s</span>
              ) : null}
            </div>
          </div>

          <p className="pointer-events-none absolute left-1/2 top-[5.25rem] z-[80] max-w-[95vw] -translate-x-1/2 px-2 text-center text-[11px] font-semibold leading-snug text-lime-200 sm:top-[4.4rem] sm:text-xs md:top-[3.25rem]">
            🎯 {hasKey ? "הגיעו לשער!" : "מצאו את המפתח!"}
            {isEasy ? ` כיוון: ${goalArrow()}` : ""}
            {mazeId ? ` · מבוך #${mazeId}` : ""}
          </p>

          <div className="relative z-0 mx-auto mt-16 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-emerald-950/80 to-slate-950 shadow-lg sm:mt-[4.25rem] md:mt-9 md:max-w-[min(92vw,1360px)] lg:max-w-[min(94vw,1480px)]">
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-emerald-950/35 via-slate-950 to-slate-900 p-1 sm:p-2 md:p-1.5">
              {statusMsg ? (
                <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-xl bg-orange-600/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  {statusMsg}
                </div>
              ) : null}

              {diamondBanner ? (
                <div className="pointer-events-none absolute left-1/2 top-12 z-30 -translate-x-1/2 animate-pulse rounded-xl border border-cyan-300/60 bg-cyan-950/90 px-4 py-2 text-sm font-extrabold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.45)]">
                  יהלום הופיע! 💎
                </div>
              ) : null}

              <div
                ref={mazeLayoutRef}
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 max-md:landscape:flex-row max-md:landscape:gap-2 md:overflow-hidden"
              >
                <div
                  ref={boardRef}
                  className="mx-auto w-fit max-w-full shrink-0 rounded-2xl border-[3px] border-amber-700/50 bg-amber-950/20 p-1 shadow-inner sm:p-1.5"
                  style={{ touchAction: "manipulation" }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (!t) return;
                    swipeRef.current = { x: t.clientX, y: t.clientY, active: true };
                  }}
                  onTouchEnd={(e) => {
                    const t = e.changedTouches[0];
                    if (t) handleSwipeEnd(t.clientX, t.clientY);
                  }}
                >
                  <div
                    className="grid gap-[2px] sm:gap-1"
                    dir="ltr"
                    style={{
                      gridTemplateColumns: `repeat(${settings.cols}, ${cellPx}px)`,
                    }}
                  >
                  {maze.map((row, r) =>
                    row.map((cell, c) => {
                      const isPlayer = player.r === r && player.c === c;
                      const isWall = cell === 1;
                      const star = stars.find((s) => !s.taken && s.r === r && s.c === c);
                      const onPath = !isWall;

                      const isWallHitCell = isWallHit(r, c);

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`relative flex items-center justify-center overflow-hidden rounded-md sm:rounded-lg ${
                            isWall
                              ? isWallHitCell
                                ? "bg-gradient-to-br from-orange-600/95 via-red-700/90 to-red-900/95 shadow-[inset_0_0_10px_rgba(251,146,60,0.5)] ring-2 ring-orange-400 animate-[mazeWallHit_0.4s_ease-in-out]"
                                : "bg-gradient-to-br from-[#0a3d22] via-[#052e16] to-[#021a0f] shadow-[inset_0_3px_8px_rgba(0,0,0,0.55)] ring-1 ring-[#031a0e]"
                              : isExitCell(r, c)
                                ? hasKey
                                  ? "bg-amber-100/35 ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.5)]"
                                  : "bg-slate-700/40 ring-2 ring-slate-500/60"
                                : isBonusDiamond(r, c)
                                  ? "animate-pulse bg-cyan-300/30 ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                                  : isKeyCell(r, c) && !hasKey
                                    ? "bg-yellow-200/25 ring-2 ring-yellow-400/70"
                                    : isHint(r, c)
                                      ? "bg-sky-300/35 ring-2 ring-sky-400 animate-pulse"
                                      : isStartCell(r, c)
                                        ? "bg-teal-500/45 ring-1 ring-teal-200/50"
                                        : "bg-gradient-to-br from-teal-500/50 via-emerald-400/40 to-cyan-600/35 ring-1 ring-teal-300/30 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]"
                          }`}
                          style={{
                            width: cellPx,
                            height: cellPx,
                          }}
                        >
                          {isWall ? (
                            <span
                              className={`text-sm sm:text-base ${isWallHitCell ? "opacity-95" : "opacity-75"}`}
                              aria-hidden
                            >
                              🌿
                            </span>
                          ) : null}
                          {isPlayer ? (
                            <img
                              src={IMG_LEO}
                              alt=""
                              className="absolute z-10 h-[82%] w-[82%] object-contain drop-shadow-lg"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && star ? (
                            <img
                              src={IMG_STAR}
                              alt=""
                              className="h-[68%] w-[68%] object-contain drop-shadow-md"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && !star && isKeyCell(r, c) && !hasKey ? (
                            <span className="text-xl drop-shadow-md sm:text-2xl" aria-hidden>
                              🔑
                            </span>
                          ) : null}
                          {!isPlayer && !star && isBonusDiamond(r, c) ? (
                            <img
                              src={IMG_DIAMOND}
                              alt=""
                              className="h-[70%] w-[70%] animate-pulse object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && !star && isExitCell(r, c) ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg sm:text-xl">{hasKey ? "🚪" : "🔒"}</span>
                              <span className="text-[7px] font-extrabold text-amber-100 sm:text-[8px]">
                                {hasKey ? "שער" : "נעול"}
                              </span>
                            </div>
                          ) : null}
                          {!isPlayer && !star && isStartCell(r, c) && !isExitCell(r, c) ? (
                            <span className="absolute bottom-0 text-[7px] font-bold text-lime-200/90 sm:text-[8px]">
                              🏁
                            </span>
                          ) : null}
                          {!isWall &&
                          !isPlayer &&
                          !star &&
                          !isExitCell(r, c) &&
                          !isStartCell(r, c) &&
                          !isKeyCell(r, c) &&
                          !isBonusDiamond(r, c) &&
                          onPath ? (
                            <span className="pointer-events-none absolute inset-0.5 rounded border border-dashed border-teal-100/15" />
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                dir="ltr"
                className="mx-auto grid w-full max-w-[252px] shrink-0 grid-cols-3 gap-2 pb-1 pt-1 max-md:landscape:mx-0 max-md:landscape:max-w-[196px] max-md:landscape:pb-0 md:hidden"
              >
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(-1, 0)}
                  aria-label="למעלה"
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, -1)}
                  aria-label="שמאלה"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(1, 0)}
                  aria-label="למטה"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, 1)}
                  aria-label="ימינה"
                >
                  →
                </button>
              </div>
              </div>
            </div>

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
    </>
  );
}

