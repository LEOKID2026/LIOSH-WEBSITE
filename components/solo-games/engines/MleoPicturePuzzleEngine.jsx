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
  easy: { grid: 3, timeSec: 300, parMoves: 18, maxGridWidth: "max-w-[min(92vw,340px)]" },
  medium: { grid: 4, timeSec: 240, parMoves: 45, maxGridWidth: "max-w-[min(92vw,380px)]" },
  hard: { grid: 5, timeSec: 300, parMoves: 95, maxGridWidth: "max-w-[min(92vw,400px)]" },
};

function createSolvedTiles(gridSize) {
  const tiles = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) tiles.push(i);
  tiles[tiles.length - 1] = null;
  return tiles;
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

function shuffleMoveCount(difficulty) {
  if (difficulty === "easy") return 8 + Math.floor(Math.random() * 5);
  if (difficulty === "medium") return 25 + Math.floor(Math.random() * 16);
  return 60 + Math.floor(Math.random() * 31);
}

/** ערבוב חוקי בלבד — מהלכים לאחור מהמצב המסודר */
function legalShuffle(gridSize, shuffleMoves) {
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  let blankIndex = tiles.indexOf(null);
  const moves = Math.max(1, shuffleMoves);

  for (let i = 0; i < moves; i += 1) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
    blankIndex = pick;
  }

  if (isSolved(tiles, gridSize)) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[0];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
  }

  return tiles;
}

function isSolved(tiles, gridSize) {
  const goal = createSolvedTiles(gridSize);
  if (tiles.length !== goal.length) return false;
  return tiles.every((t, i) => t === goal[i]);
}

function canMoveTile(tiles, index, gridSize) {
  if (tiles[index] == null) return false;
  const blankIndex = tiles.indexOf(null);
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const blankRow = Math.floor(blankIndex / gridSize);
  const blankCol = blankIndex % gridSize;
  return (
    (row === blankRow && Math.abs(col - blankCol) === 1) ||
    (col === blankCol && Math.abs(row - blankRow) === 1)
  );
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
  const hintTimerRef = useRef(null);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [selectedImageId, setSelectedImageId] = useState(PUZZLE_IMAGES[0].id);
  const [showPicker, setShowPicker] = useState(true);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState("");
  const [showHintPreview, setShowHintPreview] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const gridSize = settings.grid;
  const puzzleImage = PUZZLE_IMAGES.find((img) => img.id === selectedImageId)?.src || PUZZLE_IMAGES[0].src;
  const isEasy = difficulty === "easy";

  const blankIndex = tiles.indexOf(null);
  const movableSet = new Set(
    blankIndex >= 0 ? getAdjacentIndices(blankIndex, gridSize).filter((i) => tiles[i] != null) : []
  );

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

  const flashBlocked = () => {
    setBlockedMsg("אי אפשר להזיז את האריח הזה");
    window.setTimeout(() => setBlockedMsg(""), 1200);
  };

  const triggerHint = () => {
    if (!gameRunning || gameOver) return;
    setShowHintPreview(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHintPreview(false), 3000);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowPicker(false);
    setGameOver(false);
    setWon(false);
    setBlockedMsg("");
    setShowHintPreview(false);
    setTimeLeft(settings.timeSec);
    setTiles(legalShuffle(gridSize, shuffleMoveCount(difficulty)));
    setGameRunning(true);
  };

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      if (!isSolved(tiles, gridSize)) endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const tryMove = (index) => {
    if (!gameRunning || gameOver) return;
    if (tiles[index] == null) return;

    if (!canMoveTile(tiles, index, gridSize)) {
      flashBlocked();
      return;
    }

    const blank = tiles.indexOf(null);
    const next = [...tiles];
    [next[index], next[blank]] = [next[blank], next[index]];
    movesRef.current += 1;
    setMoves(movesRef.current);
    setTiles(next);

    if (isSolved(next, gridSize)) {
      endGame(true, timeLeft);
    }
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

  const tileMinClass =
    gridSize === 3 ? "min-h-[92px] sm:min-h-[108px]" : gridSize === 4 ? "min-h-[72px] sm:min-h-[84px]" : "min-h-[58px] sm:min-h-[68px]";

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

          <div className="mx-auto mt-5 flex w-full max-w-lg flex-col items-center gap-3 pb-4">
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
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-2 overflow-y-auto p-2 sm:flex-row sm:items-start sm:justify-center sm:gap-4 sm:p-3">
              <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:w-auto">
                <div
                  className={`rounded-xl border-2 border-yellow-400/60 bg-black/40 p-2 text-center ${
                    isEasy ? "ring-2 ring-sky-400/50" : ""
                  }`}
                >
                  <p className="mb-1 text-xs font-bold text-yellow-200 sm:text-sm">תמונת היעד 🐶</p>
                  <img
                    src={puzzleImage}
                    alt=""
                    className={`rounded-lg object-cover ring-2 ring-yellow-400 ${
                      isEasy ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20 sm:h-24 sm:w-24"
                    }`}
                  />
                </div>
                {isEasy ? (
                  <button
                    type="button"
                    onClick={triggerHint}
                    disabled={!gameRunning || gameOver}
                    className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-950/60 px-4 py-2 text-sm font-bold text-sky-100 disabled:opacity-40"
                    style={{ touchAction: "manipulation" }}
                  >
                    💡 רמז — תמונה מלאה
                  </button>
                ) : null}
              </div>

              <div className={`relative w-full shrink-0 ${settings.maxGridWidth}`}>
                {blockedMsg ? (
                  <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg sm:text-sm">
                    {blockedMsg}
                  </div>
                ) : null}

                <div
                  className="grid gap-1.5 rounded-xl border-2 border-yellow-400 bg-slate-950/80 p-2 shadow-inner sm:gap-2 sm:p-3"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                  {tiles.map((tile, index) => {
                    if (tile == null) {
                      return (
                        <div
                          key={`blank-${index}`}
                          className={`aspect-square rounded-lg border-2 border-dashed ${
                            isEasy
                              ? "border-sky-400 bg-sky-950/50 ring-2 ring-sky-400/40"
                              : "border-white/30 bg-white/8"
                          } ${tileMinClass}`}
                          aria-label="מקום ריק"
                        />
                      );
                    }
                    const movable = movableSet.has(index);
                    return (
                      <button
                        key={`tile-${index}-${tile}`}
                        type="button"
                        className={`aspect-square overflow-hidden rounded-lg border-2 bg-slate-800 shadow-md transition touch-manipulation active:scale-[0.97] ${tileMinClass} ${
                          movable
                            ? "border-sky-300 ring-2 ring-sky-400/50"
                            : "border-yellow-300/70 opacity-95"
                        }`}
                        style={tileBg(tile)}
                        onClick={() => tryMove(index)}
                        aria-label={`חלק ${tile + 1}${movable ? " — ניתן להזיז" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {showHintPreview ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
                <div className="text-center">
                  <img
                    src={puzzleImage}
                    alt=""
                    className="mx-auto max-h-[min(50vh,280px)] max-w-[min(85vw,280px)] rounded-xl object-contain ring-4 ring-sky-400"
                  />
                  <p className="mt-2 text-sm font-bold text-sky-200">כך צריכה להיראות התמונה!</p>
                </div>
              </div>
            ) : null}

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/82 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "מעולה! הפאזל מוכן!" : "הזמן נגמר — לא הספקתם"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  {won
                    ? `ניקוד: ${computeWinScore(timeLeft, moves)} · מהלכים: ${moves}`
                    : "נסו שוב — סדרו את כל החלקים לפני שהזמן נגמר"}
                </p>
                {!won ? (
                  <p className="text-xs text-gray-300 sm:text-sm">הפסד = 0 מטבעות</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
