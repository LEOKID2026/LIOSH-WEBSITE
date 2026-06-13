import {
  getLearningBookIndexHref,
  getLearningBookTileTitle,
} from "../../lib/learning-book/learning-book-catalog-meta";

/**
 * Compact book index tile (Math Master / Geometry Master pre-game HUD).
 */
export default function LearningBookIndexTile({
  subject,
  grade,
  onClick,
  testId,
  /** Mobile-only absolute bottom offset (pre-game HUD; aligned above action buttons). */
  mobileBottomClass = "bottom-[9.25rem]",
}) {
  const href = getLearningBookIndexHref(subject, grade);
  if (!href) return null;

  const { line1, line2 } = getLearningBookTileTitle(subject, grade);

  return (
    <div
      className={`pointer-events-none absolute z-30 ${mobileBottomClass} left-1/2 -translate-x-1/2 md:bottom-auto md:left-0 md:top-[0.35rem] md:translate-x-0 md:-translate-y-10 lg:top-[0.5rem] lg:-translate-y-12`}
      aria-hidden={false}
    >
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        title={`${line1} ${line2}`}
        aria-label={`${line1} ${line2}`}
        className="pointer-events-auto flex flex-col items-center justify-center rounded-xl border border-amber-600/45 bg-gradient-to-b from-amber-700/92 to-amber-950/88 shadow-md shadow-amber-950/50 hover:from-amber-600/92 hover:to-amber-900/88 active:scale-[0.98] transition-transform w-[clamp(3.3rem,21.5vw,5.48rem)] h-[clamp(3.75rem,24.5vw,6.23rem)] md:w-[4.35rem] md:h-[4.85rem] px-[clamp(0.25rem,1.2vw,0.375rem)] py-[clamp(0.25rem,1.2vw,0.375rem)] md:px-1 md:py-1"
      >
        <span
          className="text-[clamp(1.125rem,5.2vw,1.5rem)] md:text-lg leading-none"
          aria-hidden="true"
        >
          📖
        </span>
        <span className="mt-0.5 text-[clamp(0.5625rem,2.95vw,0.75rem)] md:text-[9px] font-bold text-amber-50 leading-tight text-center">
          {line1}
        </span>
        <span className="text-[clamp(0.5625rem,2.95vw,0.75rem)] md:text-[9px] font-semibold text-amber-100/85 leading-tight">
          {line2}
        </span>
      </button>
    </div>
  );
}

export { getLearningBookIndexHref };
