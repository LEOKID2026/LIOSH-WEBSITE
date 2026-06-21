import { useEffect, useRef, useState } from "react";

const GAME_DURATION_SEC = 60;
const SCORE_PER_POP = 10;
const WIN_SCORE = 150;
const BALLOON_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899"];

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoBalloonsEngine({ autoStart = false, onSessionEnd }) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const scoreRef = useRef(0);
  const idRef = useRef(0);

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [balloons, setBalloons] = useState([]);

  const fireSessionEnd = (finalScore, won, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin: won,
      levelReached: 0,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setBalloons([]);
    fireSessionEnd(scoreRef.current, scoreRef.current >= WIN_SCORE, remaining);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    setShowIntro(false);
    setGameOver(false);
    setScore(0);
    setTimeLeft(GAME_DURATION_SEC);
    setBalloons([]);
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    const spawn = setInterval(() => {
      idRef.current += 1;
      const id = idRef.current;
      setBalloons((prev) => [
        ...prev.slice(-14),
        {
          id,
          x: 8 + Math.random() * 84,
          color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        },
      ]);
    }, 900);
    return () => clearInterval(spawn);
  }, [gameRunning]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    const rise = setInterval(() => {
      setBalloons((prev) =>
        prev
          .map((b) => ({ ...b, y: (b.y || 100) - 4 }))
          .filter((b) => (b.y || 100) > -15)
      );
    }, 120);
    return () => clearInterval(rise);
  }, [gameRunning]);

  const popBalloon = (id) => {
    if (!gameRunning) return;
    setBalloons((prev) => prev.filter((b) => b.id !== id));
    const next = scoreRef.current + SCORE_PER_POP;
    scoreRef.current = next;
    setScore(next);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white w-full relative"
      dir="rtl"
    >
      <div className="flex w-full max-w-lg shrink-0 items-center justify-between gap-2 px-3 py-2 text-sm font-bold">
        <span>ניקוד: {score}</span>
        <span>יעד: {WIN_SCORE}</span>
        <span>זמן: {timeLeft}s</span>
      </div>

      <div className="relative min-h-0 flex-1 w-full max-w-lg overflow-hidden px-2 pb-2">
        {showIntro ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-bold">פוצצו בלונים לפני שהזמן נגמר!</p>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
            >
              התחל
            </button>
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-t from-green-900/40 to-sky-900">
            {balloons.map((b) => (
              <button
                key={b.id}
                type="button"
                className="absolute min-h-[56px] min-w-[56px] rounded-full border-2 border-white/40 text-3xl shadow-md transition active:scale-90"
                style={{
                  left: `${b.x}%`,
                  bottom: `${b.y ?? 100}%`,
                  backgroundColor: b.color,
                  transform: "translateX(-50%)",
                }}
                onClick={() => popBalloon(b.id)}
                aria-label="בלון"
              >
                🎈
              </button>
            ))}
            {gameOver ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold">
                {scoreRef.current >= WIN_SCORE ? "כל הכבוד!" : "הזמן נגמר"}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
