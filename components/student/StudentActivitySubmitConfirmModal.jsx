import { useEffect, useId, useRef } from "react";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

const MODAL_CLASSIC = {
  overlay: "fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4",
  panel:
    "max-w-md w-full rounded-2xl border border-amber-400/35 bg-[#0f1629] p-5 space-y-4 shadow-2xl",
  title: "text-xl font-bold text-white text-center",
  subtitle: "text-sm text-white/70 text-center",
  summaryBox: "rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2 text-sm text-white/90",
  summaryTitle: "text-center font-semibold",
  summaryWarn: "text-amber-200/95 text-center leading-relaxed",
  summaryNote: "text-white/75 text-center leading-relaxed",
  cancelBtn:
    "shrink-0 px-5 py-2.5 rounded-xl border border-white/20 text-white/90 text-sm font-semibold hover:bg-white/5 disabled:opacity-50",
  confirmBtn:
    "shrink-0 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-50",
};

const MODAL_BRIGHT = {
  overlay: "fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/45 p-4",
  panel:
    "max-w-md w-full rounded-2xl border-2 border-sky-200 bg-white p-5 space-y-4 shadow-xl shadow-sky-100/80",
  title: "text-xl font-bold text-slate-900 text-center",
  subtitle: "text-sm text-slate-600 text-center",
  summaryBox:
    "rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-3 space-y-2 text-sm text-slate-800",
  summaryTitle: "text-center font-semibold text-slate-900",
  summaryWarn: "text-amber-800 text-center leading-relaxed",
  summaryNote: "text-slate-600 text-center leading-relaxed",
  cancelBtn:
    "shrink-0 px-5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-sky-50 disabled:opacity-50",
  confirmBtn:
    "shrink-0 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-bold disabled:opacity-50 shadow-sm",
};

/**
 * Center-screen confirmation before student submits an assigned activity.
 */
export default function StudentActivitySubmitConfirmModal({
  open,
  busy = false,
  activityTitle = "",
  answeredCount = 0,
  questionCount = 0,
  onCancel,
  onConfirm,
}) {
  const { isBright } = useStudentTheme();
  const M = isBright ? MODAL_BRIGHT : MODAL_CLASSIC;
  const titleId = useId();
  const confirmRef = useRef(null);
  const unansweredCount = Math.max(0, questionCount - answeredCount);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className={M.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={busy ? undefined : onCancel}
    >
      <div
        className={M.panel}
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        data-testid="activity-submit-confirm-modal"
      >
        <div className="space-y-2">
          <h2 id={titleId} className={M.title}>
            לסיים ולהגיש את הפעילות?
          </h2>
          {activityTitle ? (
            <p className={M.subtitle}>{activityTitle}</p>
          ) : null}
        </div>

        <div className={M.summaryBox}>
          <p className={M.summaryTitle}>
            ענית על {answeredCount} מתוך {questionCount} שאלות
          </p>
          {unansweredCount > 0 ? (
            <p className={M.summaryWarn}>
              יש {unansweredCount} שאלות שעדיין לא נענו. אחרי ההגשה לא ניתן לחזור ולשנות תשובות.
            </p>
          ) : (
            <p className={M.summaryNote}>
              אחרי ההגשה לא ניתן לחזור ולשנות תשובות.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={M.cancelBtn}
            data-testid="activity-submit-confirm-cancel"
          >
            ביטול
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={M.confirmBtn}
            data-testid="activity-submit-confirm-submit"
          >
            {busy ? "מגיש…" : "כן, סיום והגשה"}
          </button>
        </div>
      </div>
    </div>
  );
}
