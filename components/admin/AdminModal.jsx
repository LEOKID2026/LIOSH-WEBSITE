import { useEffect, useId } from "react";

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * @param {{
 *   variant?: "cancel" | "primary" | "danger",
 *   onClick?: () => void,
 *   disabled?: boolean,
 *   busy?: boolean,
 *   busyLabel?: string,
 *   children: import("react").ReactNode,
 *   type?: "button" | "submit",
 * }} props
 */
export function AdminModalButton({
  variant = "cancel",
  onClick,
  disabled = false,
  busy = false,
  busyLabel,
  children,
  type = "button",
  ...rest
}) {
  const className =
    variant === "primary"
      ? "rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
      : variant === "danger"
        ? "rounded-lg border border-red-500/50 bg-red-600/30 hover:bg-red-600/40 px-4 py-2 text-sm font-semibold text-red-100 disabled:opacity-50"
        : "rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50 hover:bg-white/5";

  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

/**
 * Shared admin overlay dialog — centered on desktop, bottom-aligned on mobile.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   titleId?: string,
 *   size?: keyof typeof SIZE_CLASS,
 *   footer?: import("react").ReactNode,
 *   children: import("react").ReactNode,
 * }} props
 */
export default function AdminModal({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  size = "md",
  footer,
  children,
}) {
  const autoId = useId();
  const titleId = titleIdProp || `${autoId}-title`;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`flex w-full flex-col ${SIZE_CLASS[size] || SIZE_CLASS.md} max-h-[92vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl border border-white/15 bg-[#1a1f2e] shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 shrink-0">
          <h3 id={titleId} className="text-lg font-bold text-right flex-1 min-w-0">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 min-h-0">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse sm:flex-row gap-2 border-t border-white/10 px-4 py-3 sm:px-5 shrink-0 justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
