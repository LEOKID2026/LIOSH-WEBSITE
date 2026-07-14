import Link from "next/link";

/** @typedef {'practice-hub' | 'practice-inner' | 'guides-hub' | 'guides-inner'} SeoPageKind */

/**
 * Subtle in-page nav — below site header, above H1. Not HUD, footer, or PUBLIC_NAV.
 * @param {{ pageKind: SeoPageKind, isBright: boolean }} props
 */
export default function PublicSeoPageActions({ pageKind, isBright }) {
  const btn = isBright
    ? "inline-flex min-h-[36px] items-center justify-center rounded-xl border border-sky-200/90 bg-white/90 px-4 py-1.5 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
    : "inline-flex min-h-[36px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-sky-100 transition hover:bg-white/15";

  const showPracticeBack = pageKind === "practice-inner";
  const showGuidesBack = pageKind === "guides-inner";

  return (
    <nav
      className="flex w-full items-center justify-between gap-3"
      aria-label="ניווט בדף"
      data-testid="public-seo-page-actions"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {showPracticeBack ? (
          <Link href="/practice" className={btn} data-testid="seo-nav-back-practice">
            חזרה לתחומי התרגול
          </Link>
        ) : null}
        {showGuidesBack ? (
          <Link href="/guides" className={btn} data-testid="seo-nav-back-guides">
            חזרה למדריכים
          </Link>
        ) : null}
      </div>
      <Link href="/" className={`${btn} shrink-0`} data-testid="seo-nav-home">
        עמוד הבית
      </Link>
    </nav>
  );
}
