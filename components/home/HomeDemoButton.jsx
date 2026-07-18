import Link from "next/link";

/**
 * Floating demo entry on public pages.
 * @param {{ onDismiss?: () => void, variant?: "fixed" | "footer-above" }} props
 */
export default function HomeDemoButton({ onDismiss, variant = "fixed" }) {
  const wrapperClass =
    variant === "footer-above"
      ? "pointer-events-none absolute left-6 bottom-full z-40 md:left-8"
      : "pointer-events-none fixed bottom-6 left-6 z-40 md:bottom-8 md:left-8";

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
      data-testid="home-demo-button-wrapper"
    >
      <div className="pointer-events-auto relative inline-flex">
        <Link
          href="/demo/enter"
          className="flex h-14 min-w-[3.5rem] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 pe-12 ps-5 text-sm font-bold text-white shadow-lg transition hover:from-violet-700 hover:to-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
          data-testid="home-demo-button"
          aria-label="נסו את עולם הילד — מצב הדגמה"
        >
          <span aria-hidden="true">👀</span>
          <span className="hidden sm:inline">נסו את עולם הילד</span>
          <span className="sm:hidden">הדגמה</span>
        </Link>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDismiss?.();
          }}
          className="absolute -top-1 end-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-slate-900/90 text-base leading-none text-white shadow-md transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
          aria-label="סגירת כפתור ההדגמה"
          data-testid="home-demo-button-dismiss"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
