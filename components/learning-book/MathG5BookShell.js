import { useRouter } from "next/router";
import { useState } from "react";
import { MATH_G5_BOOK_META } from "../../lib/learning-book/math-g5-registry";
import { getBookGradeTheme } from "../../lib/learning-book/book-grade-themes";
import { formatBookShellTitleHe } from "../../lib/learning-book/format-book-shell-title-he";
import {
  getMathG5BookReturnQuerySuffix,
  handleMathG5BookClose,
  isMathG5BookLearningReturn,
} from "../../lib/learning-book/math-g5-book-nav";
import { BookGradeThemeProvider } from "./BookGradeThemeContext";
import BookShellHeader from "./BookShellHeader";
import BookTocModal from "./BookTocModal";
import StudentAdSlot from "../student/StudentAdSlot.jsx";

const GRADE = "g5";
const theme = getBookGradeTheme(GRADE);

export default function MathG5BookShell({
  children,
  batches,
  activePageId = null,
  pageMeta = null,
}) {
  const router = useRouter();
  const [tocOpen, setTocOpen] = useState(false);
  const isIndex = activePageId === null;
  const fromLearning = isMathG5BookLearningReturn(router.query);
  const returnQuerySuffix = getMathG5BookReturnQuerySuffix(router.query);
  const returnLabel = fromLearning ? "סגור" : "חזרה למתמטיקה";

  const handleReturnClick = () => {
    if (fromLearning) {
      handleMathG5BookClose(router);
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
          <BookShellHeader
            fromLearning={fromLearning}
            onReturn={handleReturnClick}
            onOpenToc={() => setTocOpen(true)}
            themeClasses={theme.classes}
            titleHe={formatBookShellTitleHe(MATH_G5_BOOK_META.bookTitleHe)}
            isIndex={isIndex}
            pageMeta={pageMeta}
            indexSubtitle={`${MATH_G5_BOOK_META.gradeShortLabel} · בחרו נושא וקראו עמוד אחר עמוד`}
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
          routeBase={MATH_G5_BOOK_META.routeBase}
        />
        <StudentAdSlot variant="inline" theme="classic" />
      </main>
    </BookGradeThemeProvider>
  );
}
