import MixedHebrewMathText from "./MixedHebrewMathText";

const HEADER_BTN =
  "inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold leading-none transition sm:px-3.5 sm:text-sm";

/** Top HUD: buttons + "ספר לימוד" on one row; title and subtitle below. */
export default function BookShellHeader({
  fromLearning,
  onReturn,
  onOpenToc,
  themeClasses,
  titleHe,
  isIndex,
  pageMeta = null,
  indexSubtitle,
  activePageTitleClass,
}) {
  const btnClass = `${HEADER_BTN} border ${themeClasses.tocButton}`;

  return (
    <div className="mx-auto max-w-4xl space-y-1 px-4 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <button type="button" onClick={onReturn} className={btnClass}>
          {fromLearning ? "סגור" : "חזרה"}
        </button>
        <p className="min-w-0 shrink text-center text-[11px] leading-none tracking-[0.15em] text-[color:var(--book-text-muted)]">
          ספר לימוד
        </p>
        <button type="button" onClick={onOpenToc} className={btnClass}>
          📑 תוכן עניינים
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-base font-black leading-tight sm:text-lg">{titleHe}</h1>
        {!isIndex && pageMeta ? (
          <p className={`mt-0.5 text-sm font-bold leading-snug sm:text-base ${activePageTitleClass}`}>
            <MixedHebrewMathText text={pageMeta.displayTitle} />
          </p>
        ) : isIndex ? (
          <p className="mt-0.5 text-xs leading-snug text-[color:var(--book-text-muted)]">
            {indexSubtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
