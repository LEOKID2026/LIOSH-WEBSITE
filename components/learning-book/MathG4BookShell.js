import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { MATH_G4_BOOK_META } from "../../lib/learning-book/math-g4-registry";
import { getBookGradeTheme } from "../../lib/learning-book/book-grade-themes";
import {
  appendReturnQueryToHref,
  getMathG4BookReturnQuerySuffix,
  handleMathG4BookClose,
  isMathG4BookLearningReturn,
} from "../../lib/learning-book/math-g4-book-nav";
import { BookGradeThemeProvider } from "./BookGradeThemeContext";
import BookTocModal from "./BookTocModal";
import MixedHebrewMathText from "./MixedHebrewMathText";
import StudentAdSlot from "../student/StudentAdSlot.jsx";

const GRADE = "g4";
const theme = getBookGradeTheme(GRADE);

export default function MathG4BookShell({
  children,
  batches,
  activePageId = null,
  pageMeta = null,
}) {
  const router = useRouter();
  const [tocOpen, setTocOpen] = useState(false);
  const isIndex = activePageId === null;
  const fromLearning = isMathG4BookLearningReturn(router.query);
  const returnQuerySuffix = getMathG4BookReturnQuerySuffix(router.query);
  const returnLabel = fromLearning ? "סגור" : "חזרה למתמטיקה";

  const handleReturnClick = () => {
    if (fromLearning) {
      handleMathG4BookClose(router);
      return;
    }
    router.push("/learning/math-master");
  };

  return (
    <BookGradeThemeProvider grade={GRADE}>
      <main
        className={`min-h-screen overflow-x-hidden text-[color:var(--book-text)] ${theme.classes.pageBg}`}
      >
        <header
          className={`sticky top-0 z-50 border-b border-[color:var(--book-accent-border)] backdrop-blur-md ${theme.classes.headerBg}`}
          dir="rtl"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="mx-auto max-w-4xl space-y-2 px-4 py-3 sm:py-3.5">
            {!isIndex ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                <div className="min-w-0 justify-self-start">
                  <button
                    type="button"
                    onClick={handleReturnClick}
                    className="max-w-full truncate rounded-full border border-[color:var(--book-accent-border)] bg-white/70 px-3 py-2 text-xs font-semibold text-[color:var(--book-text)] hover:bg-white/90 transition sm:px-3.5 sm:text-sm"
                  >
                    {returnLabel}
                  </button>
                </div>
                <div className="justify-self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setTocOpen(true)}
                    className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition sm:px-3.5 sm:text-sm ${theme.classes.tocButton}`}
                  >
                    📑 תוכן עניינים
                  </button>
                </div>
                <div className="min-w-0 justify-self-end">
                  <Link
                    href={appendReturnQueryToHref(
                      MATH_G4_BOOK_META.routeBase,
                      returnQuerySuffix
                    )}
                    className="inline-block max-w-full truncate rounded-full border border-[color:var(--book-accent-border)] bg-white/70 px-3 py-2 text-xs font-semibold text-[color:var(--book-text)] hover:bg-white/90 transition sm:px-3.5 sm:text-sm"
                  >
                    חזרה לספר
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleReturnClick}
                  className="rounded-full border border-[color:var(--book-accent-border)] bg-white/70 px-3.5 py-2 text-sm font-semibold text-[color:var(--book-text)] hover:bg-white/90 transition"
                >
                  {returnLabel}
                </button>
                <div className="text-xs text-[color:var(--book-text-muted)]">{MATH_G4_BOOK_META.gradeShortLabel}</div>
              </div>
            )}

            <div className="text-center pb-0.5">
              <p className="text-[11px] tracking-[0.15em] text-[color:var(--book-text-muted)]">ספר לימוד</p>
              <h1 className="text-lg font-black leading-tight sm:text-xl">
                {MATH_G4_BOOK_META.bookTitleHe}
              </h1>
              {!isIndex && pageMeta ? (
                <p
                  className={`mt-0.5 text-sm font-bold sm:text-base ${theme.classes.activePageTitle}`}
                >
                  <MixedHebrewMathText text={pageMeta.displayTitle} />
                </p>
              ) : isIndex ? (
                <p className="mt-0.5 text-xs text-[color:var(--book-text-muted)]">בחרו נושא וקראו עמוד אחר עמוד</p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="min-w-0">{children}</div>

          {isIndex ? (
            <footer className="mt-8 pb-6 text-center" dir="rtl">
              <button
                type="button"
                onClick={handleReturnClick}
                className={`text-sm ${theme.classes.indexFooterLink}`}
              >
                {returnLabel}
              </button>
            </footer>
          ) : null}
        </div>

        {!isIndex ? (
          <BookTocModal
            open={tocOpen}
            onClose={() => setTocOpen(false)}
            batches={batches}
            activePageId={activePageId}
            returnQuerySuffix={returnQuerySuffix}
            routeBase={MATH_G4_BOOK_META.routeBase}
          />
        ) : null}
        <StudentAdSlot variant="inline" theme="classic" />
      </main>
    </BookGradeThemeProvider>
  );
}
