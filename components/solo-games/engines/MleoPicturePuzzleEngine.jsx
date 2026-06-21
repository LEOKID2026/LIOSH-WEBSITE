import { useEffect, useRef, useState } from "react";

/** 10 תמונות ייעודיות לפאזל — public/images/puzzle/ */
export const PUZZLE_IMAGES = Object.freeze([
  { id: "01-leo", label: "ליאו חייך", src: "/images/puzzle/01-leo.png" },
  { id: "02-leo-smile", label: "ליאו מחייך", src: "/images/puzzle/02-leo-smile.png" },
  { id: "03-dog", label: "כלב חבר", src: "/images/puzzle/03-dog.png" },
  { id: "04-leo-play", label: "ליאו משחק", src: "/images/puzzle/04-leo-play.png" },
  { id: "05-leo-intro", label: "ליאו מברך", src: "/images/puzzle/05-leo-intro.png" },
  { id: "06-leo-keeper", label: "ליאו שומר", src: "/images/puzzle/06-leo-keeper.png" },
  { id: "07-leo-keeper2", label: "ליאו כחול", src: "/images/puzzle/07-leo-keeper2.png" },
  { id: "08-lio", label: "ליו", src: "/images/puzzle/08-lio.png" },
  { id: "09-shiba", label: "שייבה חמוד", src: "/images/puzzle/09-shiba.png" },
  { id: "10-leo-run", label: "ליאו רץ", src: "/images/puzzle/10-leo-run.png" },
]);

const DIFFICULTY_SETTINGS = {
  easy: { grid: 2, timeSec: 300, parMoves: 8, gentleMoves: 4, maxGridWidth: "max-w-[min(92vw,340px)]" },
  medium: { grid: 3, timeSec: 240, parMoves: 35, gentleMoves: 0, maxGridWidth: "max-w-[min(92vw,360px)]" },
  hard: { grid: 4, timeSec: 300, parMoves: 70, gentleMoves: 0, maxGridWidth: "max-w-[min(92vw,400px)]" },
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

function getAdjacentIndices(index, gridSize) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const out = [];
  if (col > 0) out.push(index - 1);
  if (col < gridSize - 1) out.push(index + 1);
  if (row > 0) out.push(index - gridSize);
  if (row < gridSize - 1) out.push(index + gridSize);
  return out;
}

function gentleShuffle(gridSize, shuffleMoves) {
  let tiles = createSolvedTiles(gridSize);
  let blankIndex = tiles.indexOf(null);
  for (let i = 0; i < shuffleMoves; i += 1) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
    blankIndex = pick;
  }
  return tiles;
}

function shuffleTiles(gridSize, gentleMoves) {
  if (gentleMoves > 0) return gentleShuffle(gridSize, gentleMoves);
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  do {
    tiles = [...solved].sort(() => Math.random() - 0.5);
  } while (!countInversions(tiles, gridSize) || tiles.every((t, i) => t === solved[i]));
  return tiles;
}

function isSolved(tiles, gridSize) {
  return tiles.every((t, i) => t === createSolvedTiles(gridSize)[i]);
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
  const [selectedImageId, setSelectedImageId] = useState(PUZZLE_IMAGES[0].id);
  const [showPicker, setShowPicker] = useState(true);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const gridSize = settings.grid;
  const puzzleImage = PUZZLE_IMAGES.find((img) => img.id === selectedImageId)?.src || PUZZLE_IMAGES[0].src;
  const isEasy = difficulty === "easy";

  const computeWinScore = (remaining, moveCount) => {
    const extra = Math.max(0, moveCount - settings.parMoves);
    const timeBonus = isEasy ? remaining * 2 : remaining * 3;
    return Math.max(0, 400 + timeBonus - extra * 8);
  };

  const fireSessionEnd = (didWin, remaining, moveCount, finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin,
      difficulty,
      mistakes: Math.max(0, moveCount - settings.parMoves),
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
    const finalScore = didWin ? computeWinScore(remaining, movesRef.current) : 0;
    fireSessionEnd(didWin, remaining, movesRef.current, finalScore);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowPicker(false);
    setGameOver(false);
    setWon(false);
    setTimeLeft(settings.timeSec);
    setTiles(shuffleTiles(gridSize, settings.gentleMoves));
    setGameRunning(true);
  };

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
    if (isSolved(next, gridSize)) endGame(true, timeLeft);
  };

  const tileBg = (tile) => {
    const row = Math.floor(tile / gridSize);
    const col = tile % gridSize;
    const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
    const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;
    return {
      backgroundImage: `url(${puzzleImage})`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
    };
  };

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none"
      dir="rtl"
    >
      {showPicker ? (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="mx-auto w-full max-w-lg text-center">
            <img src="/images/leo.png" alt="" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <h2 className="text-lg font-extrabold text-yellow-300 sm:text-xl">בחרו תמונה לפאזל</h2>
            <p className="mt-1 text-sm text-gray-300">לחצו על תמונה ואז התחילו את המשחק</p>
          </div>

          <div className="mx-auto mt-4 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
            {PUZZLE_IMAGES.map((img) => {
              const selected = selectedImageId === img.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageId(img.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-4 p-1 transition ${
                    selected
                      ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20"
                      : "border-white/20 bg-black/30 hover:border-white/40"
                  }`}
                >
                  <img
                    src={img.src}
                    alt={img.label}
                    className="aspect-square w-full rounded-lg object-cover"
                    draggable={false}
                  />
                  <span className="pb-1 text-xs font-bold text-white">{img.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 flex w-full max-w-lg flex-col items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-yellow-400/40 bg-black/40 px-4 py-2">
              <img
                src={puzzleImage}
                alt=""
                className="h-14 w-14 rounded-lg object-cover ring-2 ring-yellow-400"
              />
              <span className="text-sm font-semibold text-yellow-100">התמונה שנבחרה</span>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[48px] w-full max-w-xs rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black shadow-md"
            >
              התחל משחק
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {won ? computeWinScore(timeLeft, moves) : 0}</span>
            {" · "}
            <span>מהלכים: {moves}</span>
            {" · "}
            <span>{timeLeft}s</span>
            {" · "}
            <span>{gridSize}×{gridSize}</span>
          </div>

          <div className="relative z-0 mx-auto mt-11 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg sm:mt-12">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-3 sm:flex-row sm:items-start sm:justify-center sm:gap-5 sm:p-4">
              <div
                className={`shrink-0 rounded-xl border-2 border-yellow-400/60 bg-black/40 p-2 text-center ${
                  isEasy ? "ring-2 ring-sky-400/50" : ""
                }`}
              >
                <p className="mb-2 text-xs font-bold text-yellow-200 sm:text-sm">כך צריכה להיראות התמונה 🐶</p>
                <img
                  src={puzzleImage}
                  alt=""
                  className={`rounded-lg object-cover ring-2 ring-yellow-400 ${
                    isEasy ? "h-28 w-28 sm:h-32 sm:w-32" : "h-20 w-20 sm:h-24 sm:w-24"
                  }`}
                />
              </div>

              <div className={`w-full shrink-0 ${settings.maxGridWidth}`}>
                <div
                  className={`grid gap-1.5 rounded-xl border-2 border-yellow-400 bg-slate-950/80 p-2 shadow-inner sm:gap-2 sm:p-3 ${
                    isEasy ? "gap-2 p-3" : ""
                  }`}
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                  {tiles.map((tile, index) => {
                    if (tile == null) {
                      return (
                        <div
                          key={`blank-${index}`}
                          className={`aspect-square rounded-lg border-2 border-dashed transition ${
                            isEasy
                              ? "border-sky-400/70 bg-sky-950/40 ring-2 ring-sky-400/30"
                              : "border-white/25 bg-white/5"
                          }`}
                          aria-hidden
                        />
                      );
                    }
                    return (
                      <button
                        key={`tile-${index}`}
                        type="button"
                        className={`aspect-square overflow-hidden rounded-lg border-2 border-yellow-300/80 bg-slate-800 shadow-md transition touch-manipulation active:scale-[0.97] ${
                          isEasy ? "min-h-[88px] sm:min-h-[110px]" : ""
                        }`}
                        style={tileBg(tile)}
                        onClick={() => tryMove(index)}
                        aria-label={`חלק ${tile + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/82 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "מעולה! הפאזל מוכן!" : "הזמן נגמר — לא הספקתם"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  {won
                    ? `ניקוד: ${computeWinScore(timeLeft, moves)} · מהלכים: ${moves}`
                    : "נסו שוב — ברמה קלה יש רק 4 חלקים!"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
