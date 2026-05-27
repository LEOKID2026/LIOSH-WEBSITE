import { useEffect } from "react";

/**
 * Centered report overlay — supports stacked detail layers via zIndex.
 */
export function ReportModalFrame({
  open,
  title,
  subtitle,
  onClose,
  onBack,
  backLabel = "חזרה",
  closeLabel = "סגירה",
  zIndex = 100,
  scrollAreaClassName = "",
  children,
  testId,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (onBack) onBack();
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    if (zIndex <= 100) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onBack, zIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={testId ? `${testId}-title` : undefined}
      data-testid={testId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="סגירת חלון"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[min(88vh,720px)] flex flex-col text-right">
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#1a1208] to-[#120c06] shadow-xl flex flex-col max-h-[min(88vh,720px)] overflow-hidden">
          <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3 border-b border-white/10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {subtitle ? <p className="text-xs text-white/45 mb-0.5">{subtitle}</p> : null}
              <h2
                id={testId ? `${testId}-title` : undefined}
                className="text-lg font-bold text-white break-words"
              >
                {title}
              </h2>
            </div>
            <div className="flex shrink-0 gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-lg border border-white/25 bg-white/5 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
                  data-testid="report-modal-back"
                >
                  {backLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-semibold text-white"
                data-testid="report-modal-close"
              >
                {closeLabel}
              </button>
            </div>
          </div>
          <div
            className={`flex-1 overflow-y-auto px-4 sm:px-5 py-4 ${scrollAreaClassName}`.trim()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
