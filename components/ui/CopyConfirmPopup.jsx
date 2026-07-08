import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Centered copy confirmation popup — close button, backdrop, Escape, auto-close.
 * Portaled to document.body so fixed centering is not clipped by transformed ancestors.
 */
export default function CopyConfirmPopup({
  open,
  onClose,
  message,
  isError = false,
  bright = false,
  autoCloseMs = 5000,
  lockBodyScroll = true,
  zIndexClass = "z-[180]",
  testId = "copy-confirm-popup",
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

    const timer = window.setTimeout(handleClose, autoCloseMs);
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);

    let prevOverflow;
    if (lockBodyScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const focusFrame = requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      if (lockBodyScroll) {
        document.body.style.overflow = prevOverflow ?? "";
      }
    };
  }, [open, handleClose, autoCloseMs, lockBodyScroll]);

  if (!open || !portalTarget) return null;

  const popupOverlay = bright
    ? `fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]`
    : `fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]`;

  const popupPanel = bright
    ? "relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl"
    : "relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#0f1629] p-5 text-center shadow-2xl";

  const popupTitleClass = isError
    ? bright
      ? "text-base font-bold text-amber-800"
      : "text-base font-bold text-amber-200"
    : bright
      ? "text-base font-bold text-emerald-700"
      : "text-base font-bold text-emerald-300";

  const popupBodyClass = bright
    ? "text-sm leading-relaxed text-slate-700"
    : "text-sm leading-relaxed text-white/85";

  const popupCloseClass = bright
    ? "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-lg font-bold text-slate-600 hover:bg-slate-50 transition"
    : "rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-lg font-bold text-white/80 hover:text-white hover:bg-white/10 transition";

  return createPortal(
    <div
      className={popupOverlay}
      role="presentation"
      onClick={handleClose}
      data-testid={testId}
    >
      <div
        className={popupPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        lang="he"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          className={`absolute left-3 top-3 ${popupCloseClass}`}
          aria-label="סגור"
          data-testid={`${testId}-close`}
        >
          ✕
        </button>

        <p id={titleId} className={`mb-2 mt-1 ${popupTitleClass}`}>
          {isError ? "שגיאה" : "הועתק בהצלחה"}
        </p>
        <p className={popupBodyClass} role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </div>,
    portalTarget
  );
}
