import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import LearningMarkdown from "./LearningMarkdown";
import { getSectionDisplayTitle } from "../../lib/learning-book/section-display-labels";
import { useBookSectionSwipe } from "../../hooks/useBookSectionSwipe";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";
import {
  appendReturnQueryToHref,
  getMathG1BookReturnQuerySuffix,
  getMathG1PracticePath,
  saveMathG1BookPracticePreset,
} from "../../lib/learning-book/math-g1-book-nav";
import { resolveMathG1PracticeTarget } from "../../lib/learning-book/resolve-math-g1-practice-target";

export default function LearningPageBody({
  page,
  prevPageId = null,
  nextPageId = null,
  prevTitle = null,
  nextTitle = null,
}) {
  const router = useRouter();
  const returnQuerySuffix = getMathG1BookReturnQuerySuffix(router.query);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(0);

  useEffect(() => {
    setSectionIndex(0);
    setSlideDir(0);
  }, [page?.pageId]);

  const goPrev = useCallback(() => {
    setSlideDir(-1);
    setSectionIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideDir(1);
    setSectionIndex((i) => Math.min((page?.sections?.length ?? 1) - 1, i + 1));
  }, [page?.sections?.length]);

  const jumpToSection = useCallback((target) => {
    setSectionIndex((current) => {
      setSlideDir(target > current ? 1 : target < current ? -1 : 0);
      return target;
    });
  }, []);

  const swipeHandlers = useBookSectionSwipe({
    onPrev: goPrev,
    onNext: goNext,
    enabled: Boolean(page?.sections?.length),
  });

  const practiceTarget = useMemo(
    () => (page?.pageId ? resolveMathG1PracticeTarget(page.pageId) : null),
    [page?.pageId]
  );
  const practicePath = practiceTarget ? getMathG1PracticePath() : null;
  const handlePracticeClick = useCallback(() => {
    if (practiceTarget) {
      saveMathG1BookPracticePreset(practiceTarget);
    }
  }, [practiceTarget]);

  if (!page?.sections?.length) {
    return (
      <p className="text-center text-white/60" dir="rtl">
        אין תוכן להצגה בדף זה.
      </p>
    );
  }

  const totalSections = page.sections.length;
  const section = page.sections[sectionIndex];
  const displayTitle = getSectionDisplayTitle(section.title);
  const pageNumber = sectionIndex + 1;
  const atFirst = sectionIndex <= 0;
  const atLast = sectionIndex >= totalSections - 1;
  const hasLessonNav = Boolean(prevPageId || nextPageId);
  const isFinalPracticeSection = atLast && section?.number === 7;

  return (
    <>
      <style jsx global>{`
        @keyframes bookSectionIn {
          from {
            opacity: 0;
            transform: translateX(${slideDir >= 0 ? "12px" : "-12px"});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .book-section-animate {
          animation: bookSectionIn 0.28s ease-out;
        }
        .book-dot-active {
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.55);
        }
      `}</style>

      {/* Book page — swipe target; spacer clears fixed footer */}
      <div
        className={`mx-auto w-full max-w-3xl ${
          hasLessonNav ? "pb-[15.5rem] sm:pb-[13.5rem]" : "pb-[11.5rem] sm:pb-[10.5rem]"
        }`}
        dir="rtl"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <article
          key={sectionIndex}
          className={`book-section-animate rounded-3xl border border-violet-300/25 bg-gradient-to-b from-violet-950/35 via-[#1a1430]/90 to-[#120b1f]/95 px-5 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8`}
          aria-live="polite"
        >
          <header className="mb-4 shrink-0 text-center">
            <div
              className="flex items-center justify-center gap-2"
              aria-hidden="true"
            >
              {page.sections.map((s, i) => (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => jumpToSection(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === sectionIndex
                      ? "book-dot-active w-7 bg-emerald-400"
                      : "w-2.5 bg-white/25 hover:bg-white/40"
                  }`}
                  aria-label={`עמוד ${i + 1}`}
                />
              ))}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-emerald-100 sm:text-3xl">
              {displayTitle}
            </h2>
          </header>

          <div
            data-book-scroll
            className="px-0.5 pb-2 text-lg leading-[1.85] sm:text-xl sm:leading-[1.9]"
          >
            <LearningMarkdown content={section.body} />
          </div>

          {isFinalPracticeSection && practicePath && practiceTarget ? (
            <div className="mt-6 pt-2 text-center">
              <Link
                href={practicePath}
                onClick={handlePracticeClick}
                className="mx-auto block w-full max-w-md rounded-2xl border border-sky-300/40 bg-gradient-to-b from-sky-500/35 to-cyan-600/30 px-5 py-4 text-sky-50 shadow-[0_8px_24px_rgba(14,165,233,0.18)] transition hover:from-sky-500/45 hover:to-cyan-600/40 hover:border-sky-200/50 sm:inline-block sm:w-auto sm:min-w-[16rem]"
              >
                <span className="block text-lg font-bold sm:text-xl">בואו נתרגל עכשיו</span>
                <span className="mt-1 block text-sm font-medium text-sky-100/85">
                  נעבור לתרגול של הנושא הזה בחשבון
                </span>
              </Link>
            </div>
          ) : null}
        </article>
      </div>

      {/* Bottom HUD — fixed, always visible */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/15 bg-[#120b1f]/96 backdrop-blur-md"
        dir="rtl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-3 sm:py-4">
          <p className="text-center text-sm font-medium text-white/70">
            עמוד {pageNumber} מתוך {totalSections}
          </p>

          <nav
            className="flex items-stretch gap-3"
            aria-label="ניווט בין עמודים בנושא"
          >
            <button
              type="button"
              disabled={atFirst}
              onClick={goPrev}
              className="min-h-[48px] flex-1 rounded-2xl border border-violet-400/35 bg-violet-500/25 px-4 py-3 text-base font-bold text-violet-50 transition hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-35"
            >
              עמוד קודם
            </button>
            <button
              type="button"
              disabled={atLast}
              onClick={goNext}
              className="min-h-[48px] flex-1 rounded-2xl border border-emerald-400/35 bg-emerald-500/30 px-4 py-3 text-base font-bold text-emerald-50 transition hover:bg-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-35"
            >
              עמוד הבא
            </button>
          </nav>

          {hasLessonNav ? (
            <nav
              className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3"
              aria-label="ניווט בין נושאים"
            >
              {prevPageId ? (
                <Link
                  href={appendReturnQueryToHref(
                    `${MATH_G1_BOOK_META.routeBase}/${prevPageId}`,
                    returnQuerySuffix
                  )}
                  className="min-h-[52px] rounded-xl border border-violet-300/25 bg-gradient-to-l from-violet-950/50 to-violet-500/10 px-3 py-2.5 text-right text-xs text-violet-100/90 shadow-sm transition hover:border-violet-300/40 hover:from-violet-900/55 hover:to-violet-500/15"
                >
                  <span className="block text-[10px] text-violet-200/65">נושא קודם</span>
                  <span className="block truncate text-sm font-medium">{prevTitle}</span>
                </Link>
              ) : (
                <div aria-hidden="true" />
              )}
              {nextPageId ? (
                <Link
                  href={appendReturnQueryToHref(
                    `${MATH_G1_BOOK_META.routeBase}/${nextPageId}`,
                    returnQuerySuffix
                  )}
                  className="min-h-[52px] rounded-xl border border-emerald-400/25 bg-gradient-to-l from-emerald-950/45 to-emerald-500/10 px-3 py-2.5 text-right text-xs text-emerald-100/90 shadow-sm transition hover:border-emerald-400/40 hover:from-emerald-900/50 hover:to-emerald-500/15"
                >
                  <span className="block text-[10px] text-emerald-200/65">נושא הבא</span>
                  <span className="block truncate text-sm font-medium">{nextTitle}</span>
                </Link>
              ) : (
                <div aria-hidden="true" />
              )}
            </nav>
          ) : null}
        </div>
      </footer>
    </>
  );
}
