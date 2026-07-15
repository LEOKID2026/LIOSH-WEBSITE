import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  "פתחו את הדף הזה בדפדפן Safari.",
  "לחצו על כפתור השיתוף ⬆️ בסרגל הדפדפן.",
  "גללו בתפריט ובחרו „הוספה למסך הבית”.",
  "ודאו שהאפשרות „פתיחה כיישום אינטרנט” מופעלת, אם היא מוצגת.",
  "לחצו על „הוספה”. סמל האפליקציה יופיע במסך הבית.",
];

/**
 * Centered iOS/iPadOS Safari install instructions — shared across install pages.
 * @param {{ open: boolean, onClose: () => void, isBright?: boolean, doneBtnClass?: string }} props
 */
export default function IosInstallHelpModal({
  open,
  onClose,
  isBright = false,
  doneBtnClass = "",
}) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useLayoutEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleClose]);

  if (!open || !portalTarget) return null;

  const overlayClass = isBright
    ? "fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-4"
    : "fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] sm:p-4";

  const panelClass = isBright
    ? "relative flex max-h-[min(85vh,100%)] w-full max-w-[min(100%,400px)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right shadow-2xl sm:px-5 sm:py-5"
    : "relative flex max-h-[min(85vh,100%)] w-full max-w-[min(100%,400px)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#0f1629] px-4 py-4 text-right shadow-2xl sm:px-5 sm:py-5";

  const titleClass = isBright
    ? "pe-8 text-base font-bold leading-snug text-slate-900"
    : "pe-8 text-base font-bold leading-snug text-white";

  const introClass = isBright
    ? "mt-2 text-sm leading-relaxed text-slate-700"
    : "mt-2 text-sm leading-relaxed text-white/85";

  const stepClass = isBright
    ? "text-sm leading-relaxed text-slate-700"
    : "text-sm leading-relaxed text-white/85";

  const helpClass = isBright
    ? "mt-3 text-xs leading-relaxed text-slate-500"
    : "mt-3 text-xs leading-relaxed text-white/60";

  const closeBtnClass = isBright
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-600 transition hover:bg-slate-50"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-base font-bold text-white/80 transition hover:bg-white/10 hover:text-white";

  return createPortal(
    <div
      className={overlayClass}
      role="presentation"
      onClick={handleClose}
      data-testid="ios-install-help-modal"
    >
      <div
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        lang="he"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 id={titleId} className={titleClass}>
            התקנה ב-iPhone או iPad
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className={closeBtnClass}
            aria-label="סגור"
            data-testid="ios-install-help-modal-close"
          >
            ✕
          </button>
        </div>

        <p className={introClass}>במכשירי Apple מתקינים את האפליקציה דרך Safari:</p>

        <ol className="mt-2 list-decimal space-y-1.5 pe-4 ps-5">
          {STEPS.map((step) => (
            <li key={step} className={stepClass}>
              {step}
            </li>
          ))}
        </ol>

        <p className={helpClass}>
          לא מופיעה האפשרות „הוספה למסך הבית”? גללו לתחתית התפריט, לחצו על „עריכת פעולות”
          והוסיפו אותה לרשימה.
        </p>

        <button
          type="button"
          onClick={handleClose}
          className={`mt-4 w-full ${doneBtnClass}`}
          data-testid="ios-install-help-modal-done"
        >
          הבנתי
        </button>
      </div>
    </div>,
    portalTarget
  );
}
