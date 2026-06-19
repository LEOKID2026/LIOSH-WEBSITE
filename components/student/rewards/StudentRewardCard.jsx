/**
 * Unified reward card tile — same layout in collection, shop, and locked tabs.
 */
import { Children } from "react";
export default function StudentRewardCard({ card, T, footer }) {
  return (
    <article
      className={`rounded-xl border shadow-sm p-2.5 sm:p-3 flex flex-col h-full min-h-[240px] text-right overflow-hidden min-w-0 ${T.subjectCard}`}
    >
      <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-slate-100/80 dark:bg-white/5 shrink-0 mb-2">
        <img
          src={card.imageUrl || "/rewards/cards/placeholders/regular/default.svg"}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <h3 className={`font-bold text-sm leading-snug line-clamp-2 ${T.subjectTitle}`}>
          {card.nameHe}
        </h3>
        {card.seriesNameHe ? (
          <p className={`text-xs truncate ${T.tileSub}`}>{card.seriesNameHe}</p>
        ) : null}
        {card.rarityHe ? (
          <p className={`text-xs ${T.tileSub}`}>{card.rarityHe}</p>
        ) : null}
        {card.duplicateCount > 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            כפילויות: {card.duplicateCount}
          </p>
        ) : null}
        {footer ? <div className="mt-auto pt-2 flex flex-col gap-2 min-w-0">{footer}</div> : null}
      </div>
    </article>
  );
}

/** Series progress row — same shell spacing as card grid items. */
export function StudentSeriesProgressCard({ series, T }) {
  const pct = series.totalCount > 0 ? Math.round((series.ownedCount / series.totalCount) * 100) : 0;
  return (
    <article
      className={`rounded-xl border shadow-sm p-3 sm:p-4 flex flex-col justify-center min-h-[120px] text-right min-w-0 ${T.subjectCard}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className={`font-bold text-sm sm:text-base leading-snug ${T.subjectTitle}`}>
          {series.nameHe}
        </span>
        <span className={`text-xs sm:text-sm tabular-nums shrink-0 ${T.tileSub}`}>
          {series.ownedCount}/{series.totalCount}
        </span>
      </div>
      <div className={`${T.progressTrack} w-full`}>
        <div className={T.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs mt-2 ${T.tileSub}`}>{pct}% מהסדרה</p>
    </article>
  );
}

/** Shared responsive card grid for collection / shop / locked. */
export function StudentCardsGrid({ children, emptyMessage, T }) {
  const items = Children.toArray(children);
  if (!items.length) {
    return <p className={`text-right py-6 ${T.emptyText}`}>{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0">
      {children}
    </div>
  );
}

/** Tab content panel — identical shell for every tab. */
export function StudentCardsTabPanel({ children, T }) {
  return (
    <section
      className={`rounded-xl border p-3 sm:p-4 md:p-5 min-w-0 overflow-hidden ${T.statCard}`}
      aria-live="polite"
    >
      {children}
    </section>
  );
}
