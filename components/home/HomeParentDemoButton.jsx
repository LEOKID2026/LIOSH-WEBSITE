import Link from "next/link";

const DEMO_LABEL_CLASS =
  "flex flex-col items-center justify-center leading-tight text-xs font-bold";

const DISMISS_BTN_CLASS =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/30 bg-slate-900/90 text-sm leading-none text-white shadow-md transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white";

/**
 * @param {{ onDismiss?: () => void, variant?: "fixed" | "footer-above" | "inline" }} props
 */
export default function HomeParentDemoButton({ onDismiss, variant = "fixed" }) {
  const wrapperClass =
    variant === "footer-above"
      ? "pointer-events-none absolute end-6 bottom-full z-40 md:end-8"
      : variant === "inline"
        ? "pointer-events-auto relative inline-flex"
        : "pointer-events-none fixed bottom-6 end-6 z-40 md:bottom-8 md:end-8";

  const wrapperStyle =
    variant === "fixed"
      ? { paddingBottom: "env(safe-area-inset-bottom, 0px)" }
      : undefined;

  return (
    <div
      className={wrapperClass}
      style={wrapperStyle}
      dir="rtl"
      lang="he"
      data-testid="home-parent-demo-button-wrapper"
    >
      <div className="pointer-events-auto inline-flex flex-col items-start gap-0.5">
        {onDismiss ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDismiss();
            }}
            className={DISMISS_BTN_CLASS}
            aria-label="סגירת כפתור ההדגמה להורים"
            data-testid="home-parent-demo-button-dismiss"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <Link
          href="/demo/parent/enter"
          className="flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-3.5 text-white shadow-lg transition hover:from-teal-700 hover:to-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          data-testid="home-parent-demo-button"
          aria-label="דמו הורים - פורטל הורים במצב צפייה"
        >
          <span className={DEMO_LABEL_CLASS}>
            <span>דמו</span>
            <span>הורים</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
