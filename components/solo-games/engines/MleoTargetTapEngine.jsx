import { useEffect, useRef, useState } from "react";

const DIFFICULTY_SETTINGS = {
  easy: { targetHits: 12, durationSec: 45, lifetimeMs: 1200 },
  medium: { targetHits: 18, durationSec: 50, lifetimeMs: 1000 },
  hard: { targetHits: 24, durationSec: 55, lifetimeMs: 800 },
};

const SCORE_PER_HIT = 20;

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoTargetTapEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_SETTINGS.medium.durationSec);
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;

  const fireSessionEnd = (finalScore, won, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin: won,
      difficulty,
      mistakes: missesRef.current,
      timeRemainingSec: remaining,
      levelReached: Math.floor(finalScore / 5),
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const spawnTarget = () => {
    const pad = 12;
    const size = 72;
    const x = pad + Math.random() * (100 - pad * 2 - size / 4);
    const y = pad + Math.random() * (100 - pad * 2 - size / 4);
    setTarget({ id: Date.now(), x, y, size });
  };

  const endGame = (won, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setTarget(null);
    fireSessionEnd(score, won, remaining);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    hitsRef.current = 0;
    missesRef.current = 0;
    setShowIntro(false);
    setGameOver(false);
    setScore(0);
    setHits(0);
    setTimeLeft(settings.durationSec);
    setGameRunning(true);
    spawnTarget();
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(hitsRef.current >= settings.targetHits, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning || !target) return undefined;
    const t = setTimeout(() => {
      missesRef.current += 1;
      spawnTarget();
    }, settings.lifetimeMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, target, settings.lifetimeMs]);

  const handleHit = () => {
    if (!gameRunning || !target) return;
    const nextHits = hitsRef.current + 1;
    hitsRef.current = nextHits;
    setHits(nextHits);
    const nextScore = nextHits * SCORE_PER_HIT;
    setScore(nextScore);
    if (nextHits >= settings.targetHits) {
      endGame(true, timeLeft);
      return;
    }
    spawnTarget();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white w-full relative"
      dir="rtl"
    >
      <div className="flex w-full max-w-lg shrink-0 items-center justify-between gap-2 px-3 py-2 text-sm font-bold">
        <span>ניקוד: {score}</span>
        <span>פגיעות: {hits}/{settings.targetHits}</span>
        <span>זמן: {timeLeft}s</span>
      </div>

      <div className="relative min-h-0 flex-1 w-full max-w-lg overflow-hidden px-2 pb-2">
        {showIntro ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-bold">לחצו על המטרות לפני שהן נעלמות!</p>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
            >
              התחל
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-sky-900 to-sky-950 touch-none"
            onClick={handleHit}
            aria-label="אזור משחק"
          >
            {target ? (
              <span
                className="absolute flex items-center justify-center rounded-full border-4 border-white bg-rose-500 text-2xl shadow-lg animate-pulse"
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: target.size,
                  height: target.size,
                }}
                aria-hidden
              >
                🎯
              </span>
            ) : null}
            {gameOver ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold">
                {hitsRef.current >= settings.targetHits ? "כל הכבוד!" : "הזמן נגמר"}
              </span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}
