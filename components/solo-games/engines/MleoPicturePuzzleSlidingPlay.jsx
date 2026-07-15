import { useSoloGameKeyboard } from "./solo-v2-ui.jsx";

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

function isSolved(tiles, gridSize) {
  const goal = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) goal.push(i);
  goal[goal.length - 1] = null;
  if (tiles.length !== goal.length) return false;
  return tiles.every((t, i) => t === goal[i]);
}

/**
 * Legacy sliding-tile play surface (fallback).
 */
export default function MleoPicturePuzzleSlidingPlay({
  puzzleImage,
  gridSize,
  settings,
  isEasy,
  gameRunning,
  gameOver,
  won,
  timeLeft,
  moves,
  tiles,
  blockedMsg,
  showHintPreview,
  onTryMove,
  onTriggerHint,
  computeWinScore,
}) {
  const blankIndex = tiles.indexOf(null);
  const movableSet = new Set(
    blankIndex >= 0 ? getAdjacentIndices(blankIndex, gridSize).filter((i) => tiles[i] != null) : []
  );

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
    gridSize === 3
      ? "min-h-[92px] sm:min-h-[108px]"
      : gridSize === 4
        ? "min-h-[72px] sm:min-h-[84px]"
        : "min-h-[58px] sm:min-h-[68px]";

  useSoloGameKeyboard(gameRunning && !gameOver, (e) => {
    if (e.code === "KeyH" && isEasy) {
      onTriggerHint();
      return true;
    }
    const blank = tiles.indexOf(null);
    if (blank < 0) return false;
    const br = Math.floor(blank / gridSize);
    const bc = blank % gridSize;
    let target = null;
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      if (br + 1 < gridSize) target = (br + 1) * gridSize + bc;
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      if (br > 0) target = (br - 1) * gridSize + bc;
    } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
      if (bc + 1 < gridSize) target = br * gridSize + (bc + 1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      if (bc > 0) target = br * gridSize + (bc - 1);
    }
    if (target == null) return true;
    if (tiles[target] != null && canMoveTile(tiles, target, gridSize)) onTryMove(target);
    return true;
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
      <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
        <span className="text-amber-300">ניקוד: {won ? computeWinScore(timeLeft, moves) : 0}</span>
        {" · "}
        <span>מהלכים: {moves}</span>
        {" · "}
        <span>{timeLeft} שנ׳</span>
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
                onClick={onTriggerHint}
                disabled={!gameRunning || gameOver}
                className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-950/60 px-4 py-2 text-sm font-bold text-sky-100 disabled:opacity-40"
                style={{ touchAction: "manipulation" }}
              >
                💡 רמז - תמונה מלאה
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
                    onClick={() => onTryMove(index)}
                    aria-label={`חלק ${tile + 1}${movable ? " - ניתן להזיז" : ""}`}
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

      </div>
    </div>
  );
}

export { isSolved as isSlidingPuzzleSolved };
