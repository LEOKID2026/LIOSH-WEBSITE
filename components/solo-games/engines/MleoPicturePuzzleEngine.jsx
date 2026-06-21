import { useEffect, useRef, useState } from "react";

const DIFFICULTY_SETTINGS = {
  easy: { grid: 3, timeSec: 180, parMoves: 40 },
  medium: { grid: 4, timeSec: 240, parMoves: 80 },
  hard: { grid: 5, timeSec: 300, parMoves: 120 },
};

function createSolvedTiles(gridSize) {
  const tiles = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) tiles.push(i);
  tiles[tiles.length - 1] = null;
  return tiles;
}

function countInversions(arr, gridSize) {
  const filtered = arr.filter((x) => x != null);
  let inv = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    for (let j = i + 1; j < filtered.length; j += 1) {
      if (filtered[i] > filtered[j]) inv += 1;
    }
  }
  const blankRowFromBottom = gridSize - Math.floor(arr.indexOf(null) / gridSize);
  if (gridSize % 2 === 1) return inv % 2 === 0;
  return (inv + blankRowFromBottom) % 2 === 1;
}

function shuffleTiles(gridSize) {
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  do {
    tiles = [...solved].sort(() => Math.random() - 0.5);
  } while (!countInversions(tiles, gridSize) || tiles.every((t, i) => t === solved[i]));
  return tiles;
}

function isSolved(tiles, gridSize) {
  const solved = createSolvedTiles(gridSize);
  return tiles.every((t, i) => t === solved[i]);
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoPicturePuzzleEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const movesRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const gridSize = settings.grid;
  const tileCount = gridSize * gridSize;

  const computeScore = (remaining, moves) =>
    Math.max(0, 1000 - moves * 15 + remaining * 2);

  const fireSessionEnd = (didWin, remaining, moves) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    const extraMoves = Math.max(0, moves - settings.parMoves);
    onSessionEnd({
      score: computeScore(remaining, moves),
      didWin,
      difficulty,
      mistakes: extraMoves,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    fireSessionEnd(didWin, remaining, movesRef.current);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setTimeLeft(settings.timeSec);
    setTiles(shuffleTiles(gridSize));
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const tryMove = (index) => {
    if (!gameRunning || tiles[index] == null) return;
    const blankIndex = tiles.indexOf(null);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const blankRow = Math.floor(blankIndex / gridSize);
    const blankCol = blankIndex % gridSize;
    const adjacent =
      (row === blankRow && Math.abs(col - blankCol) === 1) ||
      (col === blankCol && Math.abs(row - blankRow) === 1);
    if (!adjacent) return;

    const next = [...tiles];
    [next[index], next[blankIndex]] = [next[blankIndex], next[index]];
    movesRef.current += 1;
    setMoves(movesRef.current);
    setTiles(next);
    if (isSolved(next, gridSize)) {
      endGame(true, timeLeft);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white w-full px-2 pb-2"
      dir="rtl"
    >
      <div className="flex w-full max-w-md shrink-0 items-center justify-between py-2 text-sm font-bold">
        <span>מהלכים: {moves}</span>
        <span>זמן: {timeLeft}s</span>
      </div>

      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-bold">סדרו את חלקי התמונה של ליאו!</p>
          <button
            type="button"
            onClick={startGame}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
          >
            התחל
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          <div
            className="grid w-full max-w-sm gap-1 rounded-xl border-2 border-yellow-400 bg-black/40 p-2"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {tiles.map((tile, index) => {
              if (tile == null) {
                return <div key={`blank-${index}`} className="aspect-square rounded-md bg-transparent" />;
              }
              const row = Math.floor(tile / gridSize);
              const col = tile % gridSize;
              return (
                <button
                  key={`tile-${index}`}
                  type="button"
                  className="aspect-square overflow-hidden rounded-md border border-white/20 bg-slate-700 touch-manipulation"
                  style={{
                    backgroundImage: "url(/images/dog.png)",
                    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                    backgroundPosition: `${(col / (gridSize - 1)) * 100}% ${(row / (gridSize - 1)) * 100}%`,
                  }}
                  onClick={() => tryMove(index)}
                  aria-label={`חלק ${tile + 1}`}
                />
              );
            })}
          </div>

          {gameOver ? (
            <p className="font-bold text-yellow-300">
              {won ? "כל הכבוד — הפאזל מוכן!" : "הזמן נגמר"}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
