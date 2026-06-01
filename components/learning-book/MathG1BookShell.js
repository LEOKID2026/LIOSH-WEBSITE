import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";
import BookTocModal from "./BookTocModal";

export default function MathG1BookShell({
  children,
  batches,
  activePageId = null,
  pageMeta = null,
}) {
  const router = useRouter();
  const [tocOpen, setTocOpen] = useState(false);
  const isIndex = activePageId === null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#120b1f] via-[#161028] to-[#1b1430] text-white">
      {/* Top HUD */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 bg-[#120b1f]/95 backdrop-blur-md"
        dir="rtl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto max-w-4xl space-y-2 px-4 py-3 sm:py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.push("/learning/math-master")}
              className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20 transition"
            >
              ← חזרה לחשבון
            </button>

            {!isIndex ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={MATH_G1_BOOK_META.routeBase}
                  className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20 transition"
                >
                  ← חזרה לספר
                </Link>
                <button
                  type="button"
                  onClick={() => setTocOpen(true)}
                  className="rounded-full border border-violet-300/35 bg-violet-500/25 px-3.5 py-2 text-sm font-semibold text-violet-50 hover:bg-violet-500/35 transition"
                >
                  📑 תוכן עניינים
                </button>
              </div>
            ) : (
              <div className="text-xs text-white/45">כיתה א׳</div>
            )}
          </div>

          <div className="text-center pb-0.5">
            <p className="text-[11px] tracking-[0.15em] text-white/45">ספר לימוד</p>
            <h1 className="text-lg font-black leading-tight sm:text-xl">
              {MATH_G1_BOOK_META.bookTitleHe}
            </h1>
            {!isIndex && pageMeta ? (
              <p className="mt-0.5 text-sm font-bold text-emerald-200/95 sm:text-base">
                {pageMeta.displayTitle}
              </p>
            ) : isIndex ? (
              <p className="mt-0.5 text-xs text-white/60">בחרו נושא וקראו עמוד אחר עמוד</p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="min-w-0">{children}</div>

        {isIndex ? (
          <footer className="mt-8 pb-6 text-center" dir="rtl">
            <button
              type="button"
              onClick={() => router.push("/learning/math-master")}
              className="text-sm text-emerald-300/80 hover:text-emerald-200 hover:underline"
            >
              ← חזרה לחשבון
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
        />
      ) : null}
    </main>
  );
}
