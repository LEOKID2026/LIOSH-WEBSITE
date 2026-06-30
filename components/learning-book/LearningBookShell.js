import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getBookGradeTheme } from "../../lib/learning-book/book-grade-themes";
import { formatBookShellTitleHe } from "../../lib/learning-book/format-book-shell-title-he";
import { maybeRecordHebrewG1LiteracyBookPageView } from "../../lib/learning-book/hebrew-g1-literacy-progress";
import { BookGradeThemeProvider } from "./BookGradeThemeContext";
import BookShellHeader from "./BookShellHeader";
import BookTocModal from "./BookTocModal";
import StudentAdSlot from "../student/StudentAdSlot.jsx";

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
                : subject === "history"
                  ? "חזרה להיסטוריה"
                  : "חזרה למתמטיקה";

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
        className={`min-h-screen overflow-x-hidden text-[color:var(--book-text)] ${theme.classes.pageBg}`}
      >
        <header
          className={`sticky top-0 z-50 border-b border-[color:var(--book-accent-border)] backdrop-blur-md ${theme.classes.headerBg}`}
          dir="rtl"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <BookShellHeader
            fromLearning={fromLearning}
            onReturn={handleReturnClick}
            onOpenToc={() => setTocOpen(true)}
            themeClasses={theme.classes}
            titleHe={formatBookShellTitleHe(bookMeta.bookTitleHe)}
            isIndex={isIndex}
            pageMeta={pageMeta}
            indexSubtitle={`${bookMeta.gradeShortLabel} · בחרו נושא וקראו עמוד אחר עמוד`}
            activePageTitleClass={theme.classes.activePageTitle}
          />
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

        <BookTocModal
          open={tocOpen}
          onClose={() => setTocOpen(false)}
          batches={batches}
          activePageId={activePageId}
          returnQuerySuffix={returnQuerySuffix}
          routeBase={bookMeta.routeBase}
        />
        <StudentAdSlot variant="inline" theme="classic" />
      </main>
    </BookGradeThemeProvider>
  );
}
