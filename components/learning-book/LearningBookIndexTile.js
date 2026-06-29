import {
  getLearningBookIndexHref,
  getLearningBookTileTitle,
} from "../../lib/learning-book/learning-book-catalog-meta";
import { getBookGradeTheme } from "../../lib/learning-book/book-grade-themes";
import { BookGradeThemeProvider } from "./BookGradeThemeContext";

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
  const theme = getBookGradeTheme(grade);

  return (
    <BookGradeThemeProvider grade={grade}>
      <div
        className={`book-grade-theme-root pointer-events-none absolute z-30 ${mobileBottomClass} left-1/2 -translate-x-1/2 md:bottom-auto md:left-0 md:top-[0.35rem] md:translate-x-0 md:-translate-y-10 lg:top-[0.5rem] lg:-translate-y-12`}
        style={theme.cssVars}
        aria-hidden={false}
      >
        <button
          type="button"
          data-testid={testId}
          onClick={onClick}
          title={`${line1} ${line2}`}
          aria-label={`${line1} ${line2}`}
          className={`pointer-events-auto flex flex-col items-center justify-center rounded-xl border transition-transform w-[clamp(3.3rem,21.5vw,5.48rem)] h-[clamp(3.75rem,24.5vw,6.23rem)] md:w-[4.35rem] md:h-[4.85rem] px-[clamp(0.25rem,1.2vw,0.375rem)] py-[clamp(0.25rem,1.2vw,0.375rem)] md:px-1 md:py-1 ${theme.classes.indexMasterTile}`}
        >
          <span
            className="text-[clamp(1.125rem,5.2vw,1.5rem)] md:text-lg leading-none"
            aria-hidden="true"
          >
            📖
          </span>
          <span
            className={`mt-0.5 text-[clamp(0.5625rem,2.95vw,0.75rem)] md:text-[9px] leading-tight text-center ${theme.classes.indexMasterTileLine1}`}
          >
            {line1}
          </span>
          <span
            className={`text-[clamp(0.5625rem,2.95vw,0.75rem)] md:text-[9px] leading-tight ${theme.classes.indexMasterTileLine2}`}
          >
            {line2}
          </span>
        </button>
      </div>
    </BookGradeThemeProvider>
  );
}

export { getLearningBookIndexHref };
