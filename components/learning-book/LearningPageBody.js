import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LearningMarkdown from "./LearningMarkdown";
import { getSectionDisplayTitle } from "../../lib/learning-book/section-display-labels";
import { useBookSectionSwipe } from "../../hooks/useBookSectionSwipe";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";

export default function LearningPageBody({
  page,
  prevPageId = null,
  nextPageId = null,
  prevTitle = null,
  nextTitle = null,
}) {
  const [sectionIndex, setSectionIndex] = useState(0);

  useEffect(() => {
    setSectionIndex(0);
  }, [page?.pageId]);

  const goPrev = useCallback(() => {
    setSectionIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSectionIndex((i) => Math.min((page?.sections?.length ?? 1) - 1, i + 1));
  }, [page?.sections?.length]);

  const swipeHandlers = useBookSectionSwipe({
    onPrev: goPrev,
    onNext: goNext,
    enabled: Boolean(page?.sections?.length),
  });

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

  return (
    <>
      {/* Book page — swipe target */}
      <div
        className="mx-auto w-full max-w-3xl pb-44"
        dir="rtl"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <article
          className="flex min-h-[min(58vh,32rem)] flex-col rounded-3xl border border-violet-300/25 bg-gradient-to-b from-violet-950/35 via-[#1a1430]/90 to-[#120b1f]/95 px-5 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8"
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
                  onClick={() => setSectionIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === sectionIndex
                      ? "w-6 bg-emerald-400"
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
            className="flex-1 overflow-y-auto overscroll-contain px-0.5 pb-1 text-lg leading-[1.85] sm:text-xl sm:leading-[1.9]"
          >
            <LearningMarkdown content={section.body} />
          </div>

          <p className="mt-3 shrink-0 text-center text-xs text-white/40 sm:hidden">
            החליקו ימינה או שמאלה לעמוד הבא/קודם
          </p>
        </article>
      </div>

      {/* Bottom HUD — fixed */}
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
              className="min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              ← עמוד קודם
            </button>
            <button
              type="button"
              disabled={atLast}
              onClick={goNext}
              className="min-h-[48px] flex-1 rounded-2xl border border-emerald-400/35 bg-emerald-500/30 px-4 py-3 text-base font-bold text-emerald-50 transition hover:bg-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-35"
            >
              עמוד הבא →
            </button>
          </nav>

          {(prevPageId || nextPageId) && (
            <nav
              className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2"
              aria-label="ניווט בין נושאים"
            >
              {prevPageId ? (
                <Link
                  href={`${MATH_G1_BOOK_META.routeBase}/${prevPageId}`}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-right text-xs text-white/70 hover:bg-white/5"
                >
                  <span className="block text-[10px] text-white/40">← נושא קודם</span>
                  <span className="block truncate">{prevTitle}</span>
                </Link>
              ) : (
                <div />
              )}
              {nextPageId ? (
                <Link
                  href={`${MATH_G1_BOOK_META.routeBase}/${nextPageId}`}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-right text-xs text-white/70 hover:bg-white/5"
                >
                  <span className="block text-[10px] text-white/40">נושא הבא →</span>
                  <span className="block truncate">{nextTitle}</span>
                </Link>
              ) : null}
            </nav>
          )}
        </div>
      </footer>
    </>
  );
}
