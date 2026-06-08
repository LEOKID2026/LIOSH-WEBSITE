import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getBookGradeTheme } from "../../lib/learning-book/book-grade-themes";
import { maybeRecordHebrewG1LiteracyBookPageView } from "../../lib/learning-book/hebrew-g1-literacy-progress";
import { BookGradeThemeProvider } from "./BookGradeThemeContext";
import BookTocModal from "./BookTocModal";
import MixedHebrewMathText from "./MixedHebrewMathText";

/**
 * Shared learning book shell for all subjects/grades.
 */
export default function LearningBookShell({
  children,
  batches,
  activePageId = null,
  pageMeta = null,
  subject,
  grade,
  bookMeta,
  nav,
}) {
  const router = useRouter();
  const [tocOpen, setTocOpen] = useState(false);
  const isIndex = activePageId === null;

  useEffect(() => {
    if (!activePageId || isIndex) return;
    maybeRecordHebrewG1LiteracyBookPageView(subject, grade, activePageId);
  }, [subject, grade, activePageId, isIndex]);
  const fromLearning = nav.isLearningReturn(router.query);
  const returnQuerySuffix = nav.getReturnQuerySuffix(router.query);
  const theme = getBookGradeTheme(grade);

  const returnLabel = fromLearning
    ? "סגור"
    : subject === "geometry"
      ? "חזרה לגאומטריה"
      : subject === "science"
        ? "חזרה למדעים"
        : subject === "hebrew"
          ? "חזרה לעברית"
          : subject === "english"
            ? "חזרה לאנגלית"
            : subject === "moledet"
              ? "חזרה למולדת"
              : subject === "geography"
                ? "חזרה לגאוגרפיה"
                : "חזרה לחשבון";

  const handleReturnClick = () => {
    if (fromLearning) {
      nav.handleClose(router);
      return;
    }
    router.push(nav.masterPath);
  };

  return (
    <BookGradeThemeProvider grade={grade}>
      <main
        className={`min-h-screen overflow-x-hidden text-white ${theme.classes.pageBg}`}
      >
        <header
          className={`sticky top-0 z-50 border-b border-white/10 backdrop-blur-md ${theme.classes.headerBg}`}
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
                    className="max-w-full truncate rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition sm:px-3.5 sm:text-sm"
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
                    href={nav.appendReturnQueryToHref(
                      bookMeta.routeBase,
                      returnQuerySuffix
                    )}
                    className="inline-block max-w-full truncate rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition sm:px-3.5 sm:text-sm"
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
                  className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20 transition"
                >
                  {returnLabel}
                </button>
                <div className="text-xs text-white/45">{bookMeta.gradeShortLabel}</div>
              </div>
            )}

            <div className="text-center pb-0.5">
              <p className="text-[11px] tracking-[0.15em] text-white/45">ספר לימוד</p>
              <h1 className="text-lg font-black leading-tight sm:text-xl">
                {bookMeta.bookTitleHe}
              </h1>
              {!isIndex && pageMeta ? (
                <p
                  className={`mt-0.5 text-sm font-bold sm:text-base ${theme.classes.activePageTitle}`}
                >
                  <MixedHebrewMathText text={pageMeta.displayTitle} />
                </p>
              ) : isIndex ? (
                <p className="mt-0.5 text-xs text-white/60">בחרו נושא וקראו עמוד אחר עמוד</p>
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
            routeBase={bookMeta.routeBase}
          />
        ) : null}
      </main>
    </BookGradeThemeProvider>
  );
}
