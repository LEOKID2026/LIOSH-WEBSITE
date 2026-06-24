import SoloGameEndInterstitialOverlay from "./SoloGameEndInterstitialOverlay.jsx";
import { shapeBounds } from "../../lib/solo-games/smart-blocks-shapes.js";
import layout from "./smart-blocks-layout.module.css";

const TRAY_SHAPE_CELL_PX = 17;
const TRAY_CANVAS_PX = 84;
const TRAY_SLOT_W = 100;
const TRAY_SLOT_H = TRAY_CANVAS_PX + 12;

/**
 * @param {{ shape: import("../../lib/solo-games/smart-blocks-shapes.js").BlockShape, cellPx: number, ghost?: boolean, valid?: boolean }} props
 */
function BlockShapeView({ shape, cellPx, ghost = false, valid = true }) {
  const { rows, cols } = shapeBounds(shape);
  const gap = Math.max(2, Math.round(cellPx * 0.08));
  const width = cols * cellPx + Math.max(0, cols - 1) * gap;
  const height = rows * cellPx + Math.max(0, rows - 1) * gap;

  return (
    <div
      dir="ltr"
      style={{
        position: "relative",
        width,
        height,
        direction: "ltr",
      }}
    >
      {shape.cells.map(([r, c], idx) => (
        <div
          key={`${shape.id}-${idx}-${r}-${c}`}
          className="rounded-md border-2 border-white/30"
          style={{
            position: "absolute",
            left: c * (cellPx + gap),
            top: r * (cellPx + gap),
            width: cellPx,
            height: cellPx,
            backgroundColor: shape.colorHex,
            opacity: ghost ? (valid ? 0.85 : 0.45) : 1,
            boxShadow: ghost
              ? undefined
              : `0 6px 14px ${shape.shadowColor || "rgba(255,255,255,0.25)"}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * @param {{ shape: import("../../lib/solo-games/smart-blocks-shapes.js").BlockShape, slotIndex: number, dragSlotIndex: number|null, onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void, disabled?: boolean }} props
 */
function TrayShapeSlot({ shape, slotIndex, dragSlotIndex, onPointerDown, disabled = false }) {
  const isDragging = dragSlotIndex === slotIndex;
  return (
    <div
      className={`${layout.traySlot} flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-sky-400/35 bg-slate-950/70 shadow-lg max-lg:landscape:h-[92px] max-lg:landscape:w-full max-lg:landscape:max-w-none max-lg:landscape:flex-none`}
      style={{ width: TRAY_SLOT_W, height: TRAY_SLOT_H, minWidth: TRAY_SLOT_W, flexShrink: 0 }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        disabled={disabled}
        className="flex h-full w-full items-center justify-center rounded-2xl p-1.5 active:scale-[0.98] disabled:pointer-events-none"
        style={{ touchAction: "none" }}
        aria-label={`גרור ${shape.labelHe}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center transition-opacity ${isDragging ? "opacity-40" : "opacity-100"}`}
          style={{ width: TRAY_CANVAS_PX, height: TRAY_CANVAS_PX, direction: "ltr" }}
          dir="ltr"
        >
          <BlockShapeView shape={shape} cellPx={TRAY_SHAPE_CELL_PX} />
        </div>
      </button>
    </div>
  );
}

/**
 * @param {{
 *   gridSize: number,
 *   board: (string|null)[][],
 *   trayShapes: import("../../lib/solo-games/smart-blocks-shapes.js").BlockShape[],
 *   score: number,
 *   scoreTarget: number,
 *   drag: object|null,
 *   dragSlotIndex: number|null,
 *   ghostPreview: object|null,
 *   boardRef: import("react").RefObject<HTMLDivElement|null>,
 *   onTrayPointerDown: (slotIndex: number, shape: import("../../lib/solo-games/smart-blocks-shapes.js").BlockShape, e: React.PointerEvent<HTMLButtonElement>) => void,
 *   gameOver: boolean,
 *   won: boolean,
 *   onCompleteEndInterstitial: () => void,
 * }} props
 */
export default function SmartBlocksPlayView({
  gridSize,
  board,
  trayShapes,
  score,
  scoreTarget,
  drag,
  dragSlotIndex,
  ghostPreview,
  boardRef,
  onTrayPointerDown,
  gameOver,
  won,
  onCompleteEndInterstitial,
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-2 z-[60] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
        <span className="text-amber-300">ניקוד: {score}</span>
        {" · "}
        <span className="text-sky-200">יעד: {scoreTarget}</span>
      </div>

      <main
        className={`${layout.playArea} flex min-h-0 flex-1 flex-col overflow-hidden pt-10 pb-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:landscape:flex-row max-lg:landscape:items-stretch max-lg:landscape:pt-2`}
      >
        <section
          className={`${layout.boardWrap} flex min-h-0 min-w-0 max-lg:flex-1 flex-col overflow-hidden p-2 sm:p-3 max-lg:landscape:justify-center`}
        >
          <div
            className={`${layout.boardCenter} relative flex max-lg:flex-1 min-h-0 items-center justify-center`}
          >
            <div
              className={`${layout.boardStage} relative aspect-square h-full max-h-full w-full max-w-[min(100%,560px)] max-lg:landscape:max-h-[min(100%,calc(100dvh-8rem))] max-lg:landscape:max-w-[min(calc(100dvh-8rem),calc(100vw-8.5rem))]`}
            >
              <div
                ref={boardRef}
                data-smart-blocks-board=""
                dir="ltr"
                className="absolute inset-0 grid gap-[3px] rounded-2xl border-4 border-yellow-400 bg-slate-950/80 p-1.5 shadow-[0_0_40px_rgba(250,204,21,0.12)] sm:gap-1 sm:p-2"
                style={{
                  direction: "ltr",
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                  touchAction: "none",
                }}
              >
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    const ghostHere =
                      ghostPreview &&
                      drag?.shape.cells.some(
                        ([dr, dc]) => ghostPreview.row + dr === r && ghostPreview.col + dc === c,
                      );
                    const ghostClass = ghostHere
                      ? ghostPreview.valid
                        ? "ring-2 ring-emerald-300/80"
                        : "ring-2 ring-rose-400/80"
                      : "";
                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`rounded-md border border-slate-600/45 bg-slate-800/70 ${ghostClass}`}
                        style={cell ? { backgroundColor: cell } : undefined}
                      />
                    );
                  }),
                )}
              </div>

              {gameOver ? (
                <SoloGameEndInterstitialOverlay didWin={won} onDone={onCompleteEndInterstitial} />
              ) : null}
            </div>

            {drag ? (
              <div
                dir="ltr"
                className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 opacity-90"
                style={{ left: drag.clientX, top: drag.clientY, direction: "ltr" }}
              >
                <BlockShapeView
                  shape={drag.shape}
                  cellPx={TRAY_SHAPE_CELL_PX}
                  ghost
                  valid={ghostPreview?.valid ?? false}
                />
              </div>
            ) : null}
          </div>

          <p className="mt-1 h-5 shrink-0 text-center text-[11px] font-semibold leading-5 text-white/55 sm:text-xs">
            גררו צורה מהמגש · {gridSize}×{gridSize}
          </p>
        </section>

        <aside
          className={`${layout.trayWrap} mx-2 flex w-auto shrink-0 flex-col overflow-visible rounded-2xl border border-white/10 bg-black/20 px-2 pt-1.5 max-lg:h-[150px] sm:mx-3 lg:h-auto lg:overflow-visible max-lg:landscape:mx-0 max-lg:landscape:h-full max-lg:landscape:w-[118px] max-lg:landscape:rounded-none max-lg:landscape:border-0 max-lg:landscape:border-l max-lg:landscape:bg-transparent max-lg:landscape:px-2 max-lg:landscape:py-2`}
        >
          <div className="flex h-full w-full flex-col max-lg:landscape:justify-center">
            <div
              className={`${layout.trayToolbar} flex h-10 shrink-0 items-center justify-center gap-2 max-lg:landscape:flex-col max-lg:landscape:justify-center max-lg:landscape:gap-1.5`}
            >
              <p className="truncate text-sm font-extrabold text-sky-200 max-lg:landscape:text-center max-lg:landscape:text-xs">
                מגש
              </p>
            </div>

            <div
              className={`${layout.traySlots} mt-1.5 flex shrink-0 items-stretch justify-center gap-2 overflow-x-auto sm:gap-2.5 max-lg:landscape:mt-2 max-lg:landscape:h-auto max-lg:landscape:flex-col max-lg:landscape:items-center max-lg:landscape:gap-2 max-lg:landscape:overflow-visible`}
            >
              {trayShapes.map((shape, idx) => (
                <TrayShapeSlot
                  key={`tray-slot-${idx}`}
                  slotIndex={idx}
                  dragSlotIndex={dragSlotIndex}
                  shape={shape}
                  disabled={gameOver}
                  onPointerDown={(e) => onTrayPointerDown(idx, shape, e)}
                />
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
