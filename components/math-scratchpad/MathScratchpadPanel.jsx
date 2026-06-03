import MathScratchpadWorkspace from "./MathScratchpadWorkspace";

/**
 * Scratchpad panel — overlay mode fills fixed shell from game top to answer top.
 */
export default function MathScratchpadPanel({
  open,
  onClose,
  scratchpadType,
  operands,
  exerciseLead,
  getQuestionFontStyle,
  overlay = false,
}) {
  if (!open || !scratchpadType) return null;

  const leadStyle =
    getQuestionFontStyle?.({ text: exerciseLead, kind: "label" }) || {};

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="דף טיוטה"
      data-testid="math-scratchpad-panel"
      className={`flex flex-col h-full w-full overflow-hidden shadow-2xl ${
        overlay
          ? "rounded-xl border-2 border-sky-400/50 bg-gradient-to-b from-slate-950/98 to-slate-900/95 ring-1 ring-sky-300/30"
          : "rounded-xl border border-sky-400/40 bg-gradient-to-b from-slate-900/98 to-slate-800/88 ring-1 ring-sky-300/20"
      }`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
        if (e.key === "Enter") {
          e.stopPropagation();
        }
      }}
    >
      <div
        className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-slate-900/95"
        dir="rtl"
      >
        <h3 className="text-sm md:text-base font-semibold text-sky-100">דף טיוטה</h3>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs md:text-sm rounded-lg bg-white/15 text-white hover:bg-white/25 border border-white/20"
          data-testid="math-scratchpad-close"
        >
          סגור
        </button>
      </div>

      {exerciseLead ? (
        <div className="shrink-0 px-3 py-2 border-b border-white/10 bg-slate-900/50">
          <p
            className="text-sm md:text-base text-center text-white/80 break-words"
            dir="rtl"
            data-testid="math-scratchpad-exercise-lead"
            style={{
              direction: "rtl",
              unicodeBidi: "plaintext",
              ...leadStyle,
            }}
          >
            {exerciseLead}
          </p>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 md:p-8 overflow-y-auto overscroll-contain">
        <MathScratchpadWorkspace type={scratchpadType} operands={operands} />
      </div>
    </div>
  );
}
