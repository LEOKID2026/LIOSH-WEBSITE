import { useEffect, useRef, useState } from "react";

const DIFFICULTY_SETTINGS = {
  easy: { size: 7, timeSec: 120, parMoves: 35 },
  medium: { size: 9, timeSec: 180, parMoves: 55 },
  hard: { size: 11, timeSec: 240, parMoves: 80 },
};

function generateMaze(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const stack = [[1, 1]];
  grid[1][1] = 0;

  const dirs = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const neighbors = dirs
      .map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(([nr, nc]) => nr > 0 && nc > 0 && nr < size - 1 && nc < size - 1 && grid[nr][nc] === 1);

    if (!neighbors.length) {
      stack.pop();
    } else {
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      const [nr, nc, wr, wc] = pick;
      grid[nr][nc] = 0;
      grid[wr][wc] = 0;
      stack.push([nr, nc]);
    }
  }

  grid[size - 2][size - 2] = 0;
  return grid;
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoMazeEngine({
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
  const [maze, setMaze] = useState([]);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const exit = { r: settings.size - 2, c: settings.size - 2 };

  const computeScore = (remaining, moves) =>
    Math.max(0, 500 + remaining * 3 - moves * 2);

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
    setMaze(generateMaze(settings.size));
    setPlayer({ r: 1, c: 1 });
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

  const tryMove = (dr, dc) => {
    if (!gameRunning) return;
    const nr = player.r + dr;
    const nc = player.c + dc;
    if (!maze[nr] || maze[nr][nc] === 1) return;
    movesRef.current += 1;
    setMoves(movesRef.current);
    const next = { r: nr, c: nc };
    setPlayer(next);
    if (nr === exit.r && nc === exit.c) {
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
          <p className="text-lg font-bold">מצאו את היציאה 🏁</p>
          <button
            type="button"
            onClick={startGame}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
          >
            התחל
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 w-full max-w-md flex-col gap-2">
          <div
            className="grid min-h-0 flex-1 gap-0.5 overflow-hidden rounded-xl border-2 border-yellow-400 bg-black/40 p-1"
            style={{
              gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))`,
            }}
          >
            {maze.map((row, r) =>
              row.map((cell, c) => {
                const isPlayer = player.r === r && player.c === c;
                const isExit = exit.r === r && exit.c === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square rounded-sm ${
                      cell === 1
                        ? "bg-slate-800"
                        : isExit
                          ? "bg-emerald-700/80"
                          : "bg-slate-600/80"
                    } flex items-center justify-center text-lg`}
                  >
                    {isPlayer ? "🐶" : isExit && cell === 0 ? "🏁" : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2">
            <span />
            <button
              type="button"
              className="min-h-[44px] rounded-xl bg-yellow-400 font-bold text-black"
              onClick={() => tryMove(-1, 0)}
            >
              ↑
            </button>
            <span />
            <button
              type="button"
              className="min-h-[44px] rounded-xl bg-yellow-400 font-bold text-black"
              onClick={() => tryMove(0, -1)}
            >
              ←
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-xl bg-yellow-400 font-bold text-black"
              onClick={() => tryMove(1, 0)}
            >
              ↓
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-xl bg-yellow-400 font-bold text-black"
              onClick={() => tryMove(0, 1)}
            >
              →
            </button>
          </div>

          {gameOver ? (
            <p className="text-center font-bold text-yellow-300">
              {won ? "כל הכבוד — מצאתם את היציאה!" : "הזמן נגמר"}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
