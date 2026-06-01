import Layout from "../../../../../components/Layout";
import MathG2BookShell from "../../../../../components/learning-book/MathG2BookShell";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG2TocEntries } from "../../../../../lib/learning-book/load-math-g2-pages";
import Link from "next/link";
import { MATH_G2_BOOK_META } from "../../../../../lib/learning-book/math-g2-registry";

export default function MathG2BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG2BookShell batches={batches}>
        <div className="space-y-8" dir="rtl">
          {batches.map((batch) => (
            <section key={batch.id}>
              <h2 className="mb-4 text-right text-lg font-bold text-emerald-200 sm:text-xl">
                {batch.titleHe}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {batch.pages.map((entry) => (
                  <li key={entry.pageId}>
                    <Link
                      href={`${MATH_G2_BOOK_META.routeBase}/${entry.pageId}`}
                      className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border border-violet-300/20 bg-gradient-to-l from-violet-950/50 to-white/[0.04] px-5 py-4 text-right shadow-sm transition hover:border-emerald-400/35 hover:from-emerald-950/40 hover:to-emerald-500/10"
                    >
                      <span className="text-base font-semibold text-white/95 sm:text-lg">
                        {entry.displayTitle}
                      </span>
                      <span className="shrink-0 text-lg text-emerald-400" aria-hidden="true">
                        📖
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </MathG2BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG2TocEntries();
  return { props: { batches } };
}
