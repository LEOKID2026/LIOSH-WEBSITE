import Layout from "../../../../../components/Layout";
import MathG1BookShell from "../../../../../components/learning-book/MathG1BookShell";
import { useBookGradeTheme } from "../../../../../components/learning-book/BookGradeThemeContext";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG1TocEntries } from "../../../../../lib/learning-book/load-math-g1-pages";
import Link from "next/link";
import { MATH_G1_BOOK_META } from "../../../../../lib/learning-book/math-g1-registry";
import MixedHebrewMathText from "../../../../../components/learning-book/MixedHebrewMathText";

function MathG1BookIndexContent({ batches }) {
  const { classes: theme } = useBookGradeTheme();

  return (
    <div className="space-y-8" dir="rtl">
      {batches.map((batch) => (
        <section key={batch.id}>
          <h2 className={`mb-4 text-right text-lg font-bold sm:text-xl ${theme.indexBatchHeading}`}>
            {batch.titleHe}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {batch.pages.map((entry) => (
              <li key={entry.pageId}>
                <Link
                  href={`${MATH_G1_BOOK_META.routeBase}/${entry.pageId}`}
                  className={`flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-right shadow-sm transition ${theme.indexTopicTile}`}
                >
                  <span className="text-base font-semibold text-white/95 sm:text-lg">
                    <MixedHebrewMathText text={entry.displayTitle} />
                  </span>
                  <span
                    className={`shrink-0 text-lg ${theme.indexTopicIcon}`}
                    aria-hidden="true"
                  >
                    📖
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function MathG1BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG1BookShell batches={batches}>
        <MathG1BookIndexContent batches={batches} />
      </MathG1BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG1TocEntries();
  return { props: { batches } };
}
