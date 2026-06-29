import Link from "next/link";
import { useBookGradeTheme } from "./BookGradeThemeContext";
import MixedHebrewMathText from "./MixedHebrewMathText";

export default function LearningBookIndexContent({ batches, routeBase }) {
  const { classes: theme } = useBookGradeTheme();

  return (
    <div className="space-y-8" dir="rtl">
      {batches.map((batch) => (
        <section key={batch.id}>
          <h2
            className={`mb-4 text-right text-lg font-bold sm:text-xl ${theme.indexBatchHeading}`}
          >
            {batch.titleHe}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {batch.pages.map((entry) => (
              <li key={entry.pageId}>
                <Link
                  href={`${routeBase}/${entry.pageId}`}
                  className={`flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-right shadow-sm transition ${theme.indexTopicTile}`}
                >
                  <span className="text-base font-semibold text-[color:var(--book-text)] sm:text-lg">
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
