import { useEffect, useId, useRef } from "react";

const SIZE_CLASS = {
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
  "2xl": "md:max-w-2xl",
  "4xl": "md:max-w-4xl",
};

/**
 * Modal shell for parent dashboard — RTL, scrollable body, Escape + backdrop close.
 */
export default function ParentDashboardModal({ open, title, onClose, children, size = "2xl" }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS["2xl"];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col md:items-center md:justify-center bg-black/80 md:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={[
          "relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh]",
          sizeClass,
          "md:rounded-xl border-0 md:border border-white/10",
          "bg-[#0a0f1d] shadow-2xl overflow-hidden",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-3 shrink-0 border-b border-white/10 px-4 py-3 md:px-5 md:py-4">
          <h2 id={titleId} className="text-lg md:text-xl font-bold text-white text-right min-w-0">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-lg font-bold text-white/80 hover:text-white hover:bg-white/10 transition"
            style={{ direction: "ltr" }}
            aria-label="סגור"
          >
            ✖
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 md:px-5 md:py-5"
          style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
