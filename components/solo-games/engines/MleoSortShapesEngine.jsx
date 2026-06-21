import { useEffect, useRef, useState } from "react";

const DIFFICULTY_SETTINGS = {
  easy: { itemCount: 12, durationSec: 90, startScore: 600 },
  medium: { itemCount: 18, durationSec: 90, startScore: 900 },
  hard: { itemCount: 24, durationSec: 90, startScore: 1200 },
};

const SHAPES = [
  { id: "red-circle", emoji: "🔴", bin: "red", label: "אדום" },
  { id: "blue-square", emoji: "🔵", bin: "blue", label: "כחול" },
  { id: "yellow-triangle", emoji: "🟡", bin: "yellow", label: "צהוב" },
];

const BINS = [
  { id: "red", label: "אדום", className: "border-rose-400 bg-rose-950/60" },
  { id: "blue", label: "כחול", className: "border-sky-400 bg-sky-950/60" },
  { id: "yellow", label: "צהוב", className: "border-yellow-400 bg-yellow-950/60" },
];

function buildQueue(count) {
  const queue = [];
  for (let i = 0; i < count; i += 1) {
    queue.push(SHAPES[i % SHAPES.length]);
  }
  return queue.sort(() => Math.random() - 0.5);
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoSortShapesEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const mistakesRef = useRef(0);
  const sortedRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sortedCount, setSortedCount] = useState(0);

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
      mistakes: mistakesRef.current,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (won, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setSelected(null);
    fireSessionEnd(score, won, remaining);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    mistakesRef.current = 0;
    sortedRef.current = 0;
    setSortedCount(0);
    setShowIntro(false);
    setGameOver(false);
    setScore(settings.startScore);
    setTimeLeft(settings.durationSec);
    setQueue(buildQueue(settings.itemCount));
    setSelected(null);
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(sortedRef.current >= settings.itemCount, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const currentItem = queue[0] || null;

  const handleBinTap = (binId) => {
    if (!gameRunning || !currentItem) return;
    if (currentItem.bin !== binId) {
      mistakesRef.current += 1;
      setScore((s) => Math.max(0, s - 10));
      setSelected(null);
      return;
    }
    sortedRef.current += 1;
    setSortedCount(sortedRef.current);
    setQueue((q) => q.slice(1));
    setSelected(null);
    if (sortedRef.current >= settings.itemCount) {
      endGame(true, timeLeft);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white w-full relative px-2 pb-2"
      dir="rtl"
    >
      <div className="flex w-full max-w-lg shrink-0 items-center justify-between gap-2 py-2 text-sm font-bold">
        <span>ניקוד: {score}</span>
        <span>
          ממוין: {sortedCount}/{settings.itemCount}
        </span>
        <span>זמן: {timeLeft}s</span>
      </div>

      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-bold">בחרו פריט ואז את התיבה הנכונה!</p>
          <button
            type="button"
            onClick={startGame}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
          >
            התחל
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 w-full max-w-lg flex-col gap-3">
          <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm text-gray-300">הפריט הבא:</p>
            {currentItem ? (
              <button
                type="button"
                className={`min-h-[72px] min-w-[72px] rounded-2xl border-4 text-4xl ${
                  selected ? "border-yellow-400 scale-105" : "border-white/20"
                }`}
                onClick={() => setSelected(currentItem.id)}
              >
                {currentItem.emoji}
              </button>
            ) : (
              <span className="text-lg font-bold text-emerald-300">סיימתם!</span>
            )}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
            {BINS.map((bin) => (
              <button
                key={bin.id}
                type="button"
                disabled={!gameRunning || !currentItem}
                onClick={() => handleBinTap(bin.id)}
                className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-sm font-bold ${bin.className} disabled:opacity-40`}
              >
                <span className="text-2xl">
                  {bin.id === "red" ? "🔴" : bin.id === "blue" ? "🔵" : "🟡"}
                </span>
                {bin.label}
              </button>
            ))}
          </div>

          {gameOver ? (
            <p className="text-center text-lg font-bold text-yellow-300">
              {sortedRef.current >= settings.itemCount ? "כל הכבוד!" : "הזמן נגמר"}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
