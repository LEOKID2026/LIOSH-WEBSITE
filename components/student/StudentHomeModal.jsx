import { useEffect, useId, useRef } from "react";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

const SIZE_CLASS = {
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
  "2xl": "md:max-w-2xl",
  "4xl": "md:max-w-4xl",
  "5xl": "md:max-w-5xl",
  "6xl": "md:max-w-6xl",
};

const HEADER_ACCENT_BRIGHT = {
  stats: "border-b-sky-200 bg-gradient-to-l from-sky-50 to-white",
  progress: "border-b-emerald-200 bg-gradient-to-l from-emerald-50 to-white",
  missions: "border-b-cyan-200 bg-gradient-to-l from-cyan-50 to-white",
  subjects: "border-b-teal-200 bg-gradient-to-l from-teal-50 to-white",
  classroom: "border-b-violet-200 bg-gradient-to-l from-violet-50 to-white",
  worksheets: "border-b-amber-200 bg-gradient-to-l from-amber-50 to-white",
  badges: "border-b-rose-200 bg-gradient-to-l from-rose-50 to-white",
  recommendations: "border-b-orange-200 bg-gradient-to-l from-orange-50 to-white",
  default: "border-b-slate-200 bg-white",
};

const HEADER_ICON_BRIGHT = {
  stats: "bg-sky-100 border-sky-200 text-sky-900",
  progress: "bg-emerald-100 border-emerald-200 text-emerald-900",
  missions: "bg-cyan-100 border-cyan-200 text-cyan-900",
  subjects: "bg-teal-100 border-teal-200 text-teal-900",
  classroom: "bg-violet-100 border-violet-200 text-violet-900",
  worksheets: "bg-amber-100 border-amber-200 text-amber-900",
  badges: "bg-rose-100 border-rose-200 text-rose-900",
  recommendations: "bg-orange-100 border-orange-200 text-orange-900",
  default: "bg-slate-100 border-slate-200",
};

/**
 * Modal shell for student home dashboard panels — RTL, scrollable body, Escape + backdrop close.
 */
export default function StudentHomeModal({
  open,
  title,
  emoji = "",
  variant = "default",
  onClose,
  children,
  size = "2xl",
}) {
  const { homeModalShell, isBright } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS["2xl"];
  const headerClass = isBright
    ? HEADER_ACCENT_BRIGHT[variant] || HEADER_ACCENT_BRIGHT.default
    : "border-b-white/10 bg-black/20";
  const iconClass = isBright
    ? HEADER_ICON_BRIGHT[variant] || HEADER_ICON_BRIGHT.default
    : homeModalShell.iconWrap;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={homeModalShell.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="student-home-modal"
      data-panel={variant}
    >
      <div
        className={`${homeModalShell.panel} ${sizeClass}`}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div
          className={`${homeModalShell.header} ${headerClass}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {emoji ? (
              <span
                className={`${homeModalShell.iconWrap} ${iconClass}`}
                aria-hidden
              >
                {emoji}
              </span>
            ) : null}
            <h2 id={titleId} className={homeModalShell.title}>
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={homeModalShell.closeBtn}
            style={{ direction: "ltr" }}
            aria-label="סגור"
          >
            ✖
          </button>
        </div>
        <div
          className={homeModalShell.body}
          style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
