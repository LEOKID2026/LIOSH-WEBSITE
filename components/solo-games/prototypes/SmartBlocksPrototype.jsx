import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import {
  SMART_BLOCKS_SHAPE_LIBRARY,
  canPlaceShape,
  pointerToGridCell,
  shapeBounds,
} from "../../../lib/solo-games/smart-blocks-shapes.js";
import { pickTrayShapes, placeShape } from "./smart-blocks-shapes.js";
import layout from "./smart-blocks-prototype-layout.module.css";

const GRID_OPTIONS = [
  { size: 7, label: "7×7", hint: "קטנים" },
  { size: 8, label: "8×8", hint: "בינוני" },
  { size: 10, label: "10×10", hint: "גדולים" },
];

/** Fixed tray geometry — outer sizes never depend on active shapes. */
const TRAY_SHAPE_CELL_PX = 17;
const TRAY_CANVAS_PX = 84;
const TRAY_SLOT_W = 100;
const TRAY_SLOT_H = TRAY_CANVAS_PX + 12;

/**
 * @param {number} size
 */
function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

/**
 * @param {{ shape: import("./smart-blocks-shapes.js").BlockShape, cellPx: number, ghost?: boolean, valid?: boolean }} props
 */
function BlockShapeView({ shape, cellPx, ghost = false, valid = true }) {
  const { rows, cols } = shapeBounds(shape);
  const gap = Math.max(2, Math.round(cellPx * 0.08));

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: rows * cols }, (_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const filled = shape.cells.some(([cr, cc]) => cr === r && cc === c);
        if (!filled) {
          return <div key={`${r}-${c}`} style={{ width: cellPx, height: cellPx }} aria-hidden />;
        }
        return (
          <div
            key={`${r}-${c}`}
            className={`rounded-md border-2 border-white/30 ${shape.color} ${
              ghost ? (valid ? "opacity-85" : "opacity-45") : `shadow-md ${shape.glow}`
            }`}
            style={{ width: cellPx, height: cellPx }}
          />
        );
      })}
    </div>
  );
}

/**
 * @param {{ shape: import("../../../lib/solo-games/smart-blocks-shapes.js").BlockShape, slotIndex: number, dragSlotIndex: number|null, onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void }} props
 */
function TrayShapeSlot({ shape, slotIndex, dragSlotIndex, onPointerDown }) {
  const isDragging = dragSlotIndex === slotIndex;
  return (
    <div
      className={`${layout.traySlot} flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-sky-400/35 bg-slate-950/70 shadow-lg max-lg:landscape:h-[92px] max-lg:landscape:w-full max-lg:landscape:max-w-none max-lg:landscape:flex-none`}
      style={{ width: TRAY_SLOT_W, height: TRAY_SLOT_H, minWidth: TRAY_SLOT_W, flexShrink: 0 }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        className="flex h-full w-full items-center justify-center rounded-2xl p-1.5 active:scale-[0.98]"
        style={{ touchAction: "none" }}
        aria-label={`גרור ${shape.labelHe}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center transition-opacity ${isDragging ? "opacity-40" : "opacity-100"}`}
          style={{ width: TRAY_CANVAS_PX, height: TRAY_CANVAS_PX }}
        >
          <BlockShapeView shape={shape} cellPx={TRAY_SHAPE_CELL_PX} />
        </div>
      </button>
    </div>
  );
}

export default function SmartBlocksPrototype() {
  const boardRef = useRef(null);
  const dragPointerIdRef = useRef(null);

  const [gridSize, setGridSize] = useState(8);
  const [board, setBoard] = useState(() => createEmptyBoard(8));
  const [trayShapes, setTrayShapes] = useState(() => pickTrayShapes(8));
  const [drag, setDrag] = useState(null);
  const dragSlotIndex = drag?.slotIndex ?? null;

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "smart-blocks-prototype",
    gameRunning: true,
    showIntro: false,
    gameOver: false,
  });

  useEffect(() => {
    setBoard(createEmptyBoard(gridSize));
    setTrayShapes(pickTrayShapes(gridSize));
    setDrag(null);
  }, [gridSize]);

  const ghostPreview = useMemo(() => {
    if (!drag?.hoverCell) return null;
    const valid = canPlaceShape(
      drag.shape,
      drag.hoverCell.row,
      drag.hoverCell.col,
      gridSize,
      board,
    );
    return { ...drag.hoverCell, valid };
  }, [board, drag, gridSize]);

  const finishDrag = useCallback(
    (clientX, clientY) => {
      if (!drag) return;
      const boardEl = boardRef.current;
      if (!boardEl) {
        setDrag(null);
        return;
      }
      const cell = pointerToGridCell(boardEl, gridSize, clientX, clientY, drag.shape);
      if (
        cell &&
        canPlaceShape(drag.shape, cell.row, cell.col, gridSize, board)
      ) {
        setBoard((prev) => placeShape(drag.shape, cell.row, cell.col, prev));
      }
      setDrag(null);
      dragPointerIdRef.current = null;
    },
    [board, drag, gridSize],
  );

  useEffect(() => {
    if (!drag) return undefined;

    const onMove = (e) => {
      if (dragPointerIdRef.current != null && e.pointerId !== dragPointerIdRef.current) return;
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const cell = pointerToGridCell(boardEl, gridSize, e.clientX, e.clientY, drag?.shape);
      setDrag((prev) => (prev ? { ...prev, hoverCell: cell, clientX: e.clientX, clientY: e.clientY } : prev));
    };

    const onUp = (e) => {
      if (dragPointerIdRef.current != null && e.pointerId !== dragPointerIdRef.current) return;
      finishDrag(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, finishDrag, gridSize]);

  const startDrag = (slotIndex, shape, e) => {
    e.preventDefault();
    dragPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    setDrag({
      shape,
      slotIndex,
      hoverCell: null,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  const clearBoard = () => {
    setBoard(createEmptyBoard(gridSize));
    setDrag(null);
  };

  const shuffleTray = () => {
    const ids = SMART_BLOCKS_SHAPE_LIBRARY.map((s) => s.id);
    const picked = [];
    while (picked.length < 3) {
      const next = ids[Math.floor(Math.random() * ids.length)];
      if (!picked.includes(next)) picked.push(next);
    }
    setTrayShapes(
      picked.map((id) => SMART_BLOCKS_SHAPE_LIBRARY.find((s) => s.id === id)).filter(Boolean),
    );
  };

  const traySlots = useMemo(() => {
    const slots = trayShapes.slice(0, 3);
    while (slots.length < 3) {
      slots.push(SMART_BLOCKS_SHAPE_LIBRARY[0]);
    }
    return slots;
  }, [trayShapes]);

  return (
    <div
      id="game-wrapper"
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 sm:px-4">
        <Link
          href="/game"
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          חזרה
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-lg font-extrabold text-yellow-300 sm:text-xl">בלוקים חכמים</h1>
          <p className="text-[11px] font-semibold leading-4 text-white/60 sm:text-xs">אבטיפוס ויזואלי · ללא ניקוד</p>
        </div>
        <button
          type="button"
          onClick={clearBoard}
          className="min-h-[44px] shrink-0 rounded-lg border border-white/20 px-3 py-2 text-sm font-bold text-white/85 hover:bg-white/5"
          style={{ touchAction: "manipulation" }}
        >
          נקה לוח
        </button>
      </header>

      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-center gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="shrink-0 text-xs font-bold text-white/70 sm:text-sm">גודל לוח:</span>
        {GRID_OPTIONS.map((opt) => {
          const active = gridSize === opt.size;
          return (
            <button
              key={opt.size}
              type="button"
              onClick={() => setGridSize(opt.size)}
              className={`min-h-[36px] shrink-0 rounded-xl border px-2.5 py-1 text-sm font-bold transition sm:px-3 sm:py-1.5 ${
                active
                  ? "border-yellow-400 bg-yellow-400/20 text-yellow-200"
                  : "border-white/25 bg-black/30 text-white/85 hover:bg-white/5"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {opt.label}
              <span className="mr-1 hidden text-[10px] font-semibold text-white/55 sm:inline">({opt.hint})</span>
            </button>
          );
        })}
        {showFullscreenButton ? (
          <SoloGameMobileFullscreenButton
            isFullscreen={isFullscreen}
            onToggle={toggleFromUserGesture}
            variant="compact"
            className="min-h-[36px] shrink-0 px-2.5 py-1 text-[11px] sm:text-xs"
          />
        ) : null}
      </div>

      <main className={`${layout.playArea} flex min-h-0 flex-1 flex-col overflow-hidden pb-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:landscape:flex-row max-lg:landscape:items-stretch`}>
        <section className={`${layout.boardWrap} flex min-h-0 min-w-0 max-lg:flex-1 flex-col overflow-hidden p-2 sm:p-3 max-lg:landscape:justify-center`}>
          <div className={`${layout.boardCenter} relative flex max-lg:flex-1 min-h-0 items-center justify-center`}>
            <div className={`${layout.boardStage} relative aspect-square h-full max-h-full w-full max-w-[min(100%,560px)] max-lg:landscape:max-h-[min(100%,calc(100dvh-8rem))] max-lg:landscape:max-w-[min(calc(100dvh-8rem),calc(100vw-8.5rem))]`}>
              <div
                ref={boardRef}
                className="absolute inset-0 grid gap-[3px] rounded-2xl border-4 border-yellow-400 bg-slate-950/80 p-1.5 shadow-[0_0_40px_rgba(250,204,21,0.12)] sm:gap-1 sm:p-2"
                style={{
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
                        className={`rounded-md border border-slate-600/45 bg-slate-800/70 ${ghostClass} ${
                          cell ? `${cell} shadow-inner` : ""
                        }`}
                      />
                    );
                  }),
                )}
              </div>
            </div>

            {drag ? (
              <div
                className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 opacity-90"
                style={{ left: drag.clientX, top: drag.clientY }}
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

        <aside className={`${layout.trayWrap} mx-2 flex w-auto shrink-0 flex-col overflow-visible rounded-2xl border border-white/10 bg-black/20 px-2 pt-1.5 max-lg:h-[150px] sm:mx-3 lg:h-auto lg:overflow-visible max-lg:landscape:mx-0 max-lg:landscape:h-full max-lg:landscape:w-[118px] max-lg:landscape:rounded-none max-lg:landscape:border-0 max-lg:landscape:border-l max-lg:landscape:bg-transparent max-lg:landscape:px-2 max-lg:landscape:py-2`}>
          <div className="flex h-full w-full flex-col max-lg:landscape:justify-center">
            <div className={`${layout.trayToolbar} flex h-10 shrink-0 items-center justify-between gap-2 max-lg:landscape:flex-col max-lg:landscape:justify-center max-lg:landscape:gap-1.5`}>
              <p className="truncate text-sm font-extrabold text-sky-200 max-lg:landscape:text-center max-lg:landscape:text-xs">
                מגש
              </p>
              <button
                type="button"
                onClick={shuffleTray}
                className="min-h-[32px] shrink-0 rounded-lg border border-sky-400/50 bg-sky-950/50 px-2.5 py-1 text-[11px] font-bold text-sky-100 hover:bg-sky-900/60 sm:text-xs max-lg:landscape:w-full"
                style={{ touchAction: "manipulation" }}
              >
                החלף צורות
              </button>
            </div>

            <div className={`${layout.traySlots} mt-1.5 flex shrink-0 items-stretch justify-center gap-2 sm:gap-2.5 max-lg:landscape:mt-2 max-lg:landscape:h-auto max-lg:landscape:flex-col max-lg:landscape:items-center max-lg:landscape:gap-2`}>
              {traySlots.map((shape, idx) => (
                <TrayShapeSlot
                  key={`tray-slot-${idx}`}
                  slotIndex={idx}
                  dragSlotIndex={dragSlotIndex}
                  shape={shape}
                  onPointerDown={(e) => startDrag(idx, shape, e)}
                />
              ))}
            </div>
          </div>
        </aside>
      </main>

      <SoloGamePortraitRecommendationModal
        show={showPortraitPrompt}
        subtitle="הלוח והמגש יוצגו בצורה נוחה יותר."
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
  );
}
