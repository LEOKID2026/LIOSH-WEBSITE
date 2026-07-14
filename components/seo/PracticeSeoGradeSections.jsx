import {
  getPracticeInnerBadgeClass,
  getPracticeInnerPanelClass,
  PRACTICE_INNER_VARIANTS,
} from "./practice-seo-inner-styles";

/**
 * @param {{ grades: { title: string, text: string }[], isBright: boolean }} props
 */
export default function PracticeSeoGradeSections({ grades, isBright }) {
  if (!grades?.length) return null;

  const text = isBright ? "text-slate-700" : "text-white/80";

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:gap-5">
      {grades.map((g, i) => {
        const variant = PRACTICE_INNER_VARIANTS[i % PRACTICE_INNER_VARIANTS.length];
        return (
          <div key={g.title} className={getPracticeInnerPanelClass(isBright, variant)}>
            <h3 className={getPracticeInnerBadgeClass(isBright, variant)}>{g.title}</h3>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${text}`}>{g.text}</p>
          </div>
        );
      })}
    </div>
  );
}
