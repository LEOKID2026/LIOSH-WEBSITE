import { useCallback, useEffect, useState } from "react";
import { pieceBackgroundStyle } from "../../../lib/solo-games/picture-puzzle-placement.js";

const PORTRAIT_DISMISS_KEY = "picture-puzzle-portrait-dismiss";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function isPortraitViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Slot / placement play surface — tap-to-select + tap-to-place (+ optional drag).
 */
export default function MleoPicturePuzzlePlacementPlay({
  puzzleImage,
  gridSize,
  settings,
  isEasy,
  gameRunning,
  gameOver,
  won,
  timeLeft,
  moves,
  boardSlots,
  trayPieces,
  fixedIndices,
  selectedPieceId,
  feedbackMsg,
  successSlotId,
  wrongSlotId,
  showHintPreview,
  onSelectPiece,
  onPlaceOnSlot,
  onTriggerHint,
  computeWinScore,
}) {
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [showPortraitPrompt, setShowPortraitPrompt] = useState(false);

  const recalcPortrait = useCallback(() => {
    if (!isMobileViewport() || !isPortraitViewport()) {
      setShowPortraitPrompt(false);
      return;
    }
    if (portraitDismissed || sessionStorage.getItem(PORTRAIT_DISMISS_KEY) === "1") {
      setShowPortraitPrompt(false);
      return;
    }
    setShowPortraitPrompt(true);
  }, [portraitDismissed]);

  useEffect(() => {
    recalcPortrait();
    window.addEventListener("resize", recalcPortrait);
    window.addEventListener("orientationchange", recalcPortrait);
    return () => {
      window.removeEventListener("resize", recalcPortrait);
      window.removeEventListener("orientationchange", recalcPortrait);
    };
  }, [recalcPortrait]);

  const dismissPortraitPrompt = (persist) => {
    setPortraitDismissed(true);
    setShowPortraitPrompt(false);
    if (persist) sessionStorage.setItem(PORTRAIT_DISMISS_KEY, "1");
  };

  const pieceStyle = (tileIndex) => pieceBackgroundStyle(gridSize, tileIndex, puzzleImage);

  const handleDragStart = (event, pieceId) => {
    onSelectPiece(pieceId);
    event.dataTransfer.setData("text/plain", String(pieceId));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnSlot = (event, slotId) => {
    event.preventDefault();
    const fromData = event.dataTransfer.getData("text/plain");
    const pieceId = fromData ? Number(fromData) : selectedPieceId;
    if (pieceId != null) onPlaceOnSlot(slotId, pieceId);
  };

  const placedCount = boardSlots.filter((s) => s.placedPieceId != null).length;
  const totalHoles = boardSlots.length;

  const slotByGridIndex = new Map(boardSlots.map((s) => [s.tileIndex, s]));
  const fixedSet = new Set(fixedIndices);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
      <div className="pointer-events-none absolute left-1/2 top-1.5 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-2 py-1.5 text-center text-[10px] font-bold leading-snug sm:top-2 sm:px-3 sm:py-2 sm:text-sm">
        <span className="text-amber-300">ניקוד: {won ? computeWinScore(timeLeft, moves) : 0}</span>
        {" · "}
        <span>מהלכים: {moves}</span>
        {" · "}
        <span>{timeLeft}s</span>
        {" · "}
        <span>
          {placedCount}/{totalHoles}
        </span>
      </div>

      <div className="relative z-0 mx-auto mt-9 flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg sm:mt-10">
        <div className="flex min-h-0 w-full flex-1 flex-row items-stretch gap-1.5 overflow-hidden p-1.5 sm:gap-2 sm:p-2">
          {/* שמאל — פעולות */}
          <aside className="flex w-[72px] shrink-0 flex-col items-stretch justify-center gap-2 sm:w-[96px]">
            {isEasy ? (
              <button
                type="button"
                onClick={onTriggerHint}
                disabled={!gameRunning || gameOver}
                className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-950/60 px-1 py-2 text-[11px] font-bold leading-tight text-sky-100 disabled:opacity-40 sm:text-xs"
                style={{ touchAction: "manipulation" }}
              >
                💡 רמז
              </button>
            ) : null}
            <div className="hidden rounded-lg border border-yellow-400/40 bg-black/35 p-1.5 text-center text-[10px] font-semibold text-yellow-100/90 sm:block">
              {settings.label}
            </div>
            {selectedPieceId != null ? (
              <p className="text-center text-[10px] font-bold leading-tight text-sky-200 sm:text-xs">
                חלק נבחר — לחצו על מקום
              </p>
            ) : (
              <p className="text-center text-[10px] font-semibold leading-tight text-white/60 sm:text-xs">
                בחרו חלק מהמגש
              </p>
            )}
          </aside>

          {/* מרכז — לוח */}
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
            {feedbackMsg ? (
              <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-lg bg-rose-600/90 px-3 py-1 text-xs font-bold text-white shadow-lg">
                {feedbackMsg}
              </div>
            ) : null}

            <div
              className="grid aspect-square max-h-full w-full max-w-full gap-0.5 rounded-xl border-2 border-yellow-400 bg-slate-950/80 p-1 shadow-inner sm:gap-1 sm:p-1.5"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                maxWidth: "min(100%, min(72dvh, 520px))",
              }}
            >
              {Array.from({ length: gridSize * gridSize }, (_, index) => {
                const slot = slotByGridIndex.get(index);
                if (fixedSet.has(index)) {
                  return (
                    <div
                      key={`fixed-${index}`}
                      className="aspect-square overflow-hidden rounded-md border border-yellow-300/50 bg-slate-800 sm:rounded-lg"
                      style={pieceStyle(index)}
                      aria-hidden
                    />
                  );
                }
                if (slot) {
                  const filled = slot.placedPieceId != null;
                  const isSuccess = successSlotId === slot.slotId;
                  const isWrong = wrongSlotId === slot.slotId;
                  const canDrop = gameRunning && !gameOver && !filled;
                  return (
                    <button
                      key={`slot-${slot.slotId}`}
                      type="button"
                      disabled={!gameRunning || gameOver || filled}
                      onClick={() => onPlaceOnSlot(slot.slotId, selectedPieceId)}
                      onDragOver={(e) => {
                        if (canDrop) e.preventDefault();
                      }}
                      onDrop={(e) => handleDropOnSlot(e, slot.slotId)}
                      className={`aspect-square overflow-hidden rounded-md border-2 transition touch-manipulation sm:rounded-lg ${
                        filled
                          ? "border-emerald-400/80 ring-2 ring-emerald-400/40"
                          : isWrong
                            ? "border-rose-400 bg-rose-950/40 ring-2 ring-rose-400/50"
                            : isSuccess
                              ? "border-emerald-300 ring-2 ring-emerald-300/60"
                              : selectedPieceId != null
                                ? "border-sky-300 bg-sky-950/30 ring-2 ring-sky-400/40"
                                : "border-dashed border-white/35 bg-black/25"
                      }`}
                      style={filled ? pieceStyle(slot.placedPieceId) : undefined}
                      aria-label={filled ? `חלק ${slot.tileIndex + 1} — במקום` : "מקום לחלק — לחצו להניח"}
                    />
                  );
                }
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square rounded-md bg-black/10 sm:rounded-lg"
                    aria-hidden
                  />
                );
              })}
            </div>
          </div>

          {/* ימין — מגש */}
          <aside className="flex w-[76px] shrink-0 flex-col overflow-hidden sm:w-[104px]">
            <p className="mb-1 shrink-0 text-center text-[10px] font-bold text-yellow-200 sm:text-xs">מגש 🧩</p>
            <div
              className={`grid min-h-0 flex-1 gap-1 overflow-hidden sm:gap-1.5 ${
                trayPieces.length > 5 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {trayPieces.map((piece) => {
                const selected = selectedPieceId === piece.pieceId;
                return (
                  <button
                    key={`tray-${piece.pieceId}`}
                    type="button"
                    draggable={gameRunning && !gameOver}
                    onDragStart={(e) => handleDragStart(e, piece.pieceId)}
                    onClick={() => onSelectPiece(piece.pieceId)}
                    className={`aspect-square w-full min-h-[48px] shrink-0 overflow-hidden rounded-md border-2 bg-slate-800 shadow-md transition touch-manipulation active:scale-[0.97] sm:min-h-[52px] sm:rounded-lg ${
                      selected
                        ? "border-sky-300 ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900"
                        : "border-yellow-300/70 hover:border-yellow-200"
                    }`}
                    style={pieceStyle(piece.tileIndex)}
                    aria-label={`חלק ${piece.pieceId + 1}${selected ? " — נבחר" : ""}`}
                  />
                );
              })}
              {trayPieces.length === 0 ? (
                <p className="mt-2 text-center text-[10px] font-semibold text-emerald-300 sm:text-xs">הכל במקום!</p>
              ) : null}
            </div>
          </aside>
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
          <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/82 px-4 py-6 text-center">
            <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
              {won ? "מעולה! הפאזל מוכן!" : "הזמן נגמר — לא הספקתם"}
            </h2>
            <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
              {won
                ? `ניקוד: ${computeWinScore(timeLeft, moves)} · מהלכים: ${moves}`
                : "נסו שוב — השלימו את כל החלקים לפני שהזמן נגמר"}
            </p>
            {!won ? <p className="text-xs text-gray-300 sm:text-sm">הפסד = 0 מטבעות</p> : null}
          </div>
        ) : null}
      </div>

      {showPortraitPrompt ? (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/88 p-4">
          <div className="max-w-sm rounded-2xl border-2 border-yellow-400 bg-slate-900 p-5 text-center shadow-xl">
            <p className="text-3xl">📱↔️</p>
            <p className="mt-3 text-base font-bold leading-snug text-yellow-100">
              כדי לשחק בנוחות, מומלץ לסובב את המסך לרוחב.
            </p>
            <p className="mt-2 text-sm text-white/75">הלוח והמגש יוצגו בצורה נוחה יותר.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => dismissPortraitPrompt(false)}
                className="min-h-[44px] rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
                style={{ touchAction: "manipulation" }}
              >
                הבנתי — אסובב
              </button>
              <button
                type="button"
                onClick={() => dismissPortraitPrompt(true)}
                className="min-h-[44px] rounded-xl border-2 border-white/35 bg-black/40 px-4 py-2 text-sm font-bold text-white"
                style={{ touchAction: "manipulation" }}
              >
                המשך בכל זאת
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
