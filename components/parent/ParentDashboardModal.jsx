import { useEffect, useId, useRef } from "react";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";

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
export default function ParentDashboardModal({
  open,
  title,
  onClose,
  children,
  size = "2xl",
  bright = false,
  toolbar = null,
  bodyRef = null,
}) {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS["2xl"];
  const T = getParentPortalTheme(bright);

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
      className={T.modalOverlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={[
          T.modalPanel,
          "md:max-h-[90vh]",
          sizeClass,
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className={T.modalHeader}>
          <h2 id={titleId} className={T.modalTitle}>
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={T.modalClose}
            style={{ direction: "ltr" }}
            aria-label="סגור"
          >
            ✖
          </button>
        </div>
        {toolbar ? (
          <div
            className={[
              "shrink-0 border-b px-3 py-2.5 md:px-5",
              bright
                ? "border-slate-200 bg-white"
                : "border-white/10 bg-white",
            ].join(" ")}
          >
            {toolbar}
          </div>
        ) : null}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 md:px-5 md:py-5"
          style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
