import {
  getPublicSeoInnerBadgeClass,
  getPublicSeoInnerPanelClass,
  PUBLIC_SEO_INNER_VARIANTS,
} from "./public-seo-wide-theme";

/**
 * @param {{ grades: { title: string, text: string }[], isBright: boolean }} props
 */
export default function PracticeSeoGradeSections({ grades, isBright }) {
  if (!grades?.length) return null;

  const text = isBright ? "text-right text-slate-700" : "text-right text-white/80";

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5">
      {grades.map((g, i) => {
        const variant = PUBLIC_SEO_INNER_VARIANTS[i % PUBLIC_SEO_INNER_VARIANTS.length];
        return (
          <div key={g.title} className={getPublicSeoInnerPanelClass(isBright, variant)}>
            <h3 className={getPublicSeoInnerBadgeClass(isBright, variant)}>{g.title}</h3>
            <p className={`mt-3 w-full text-sm leading-relaxed md:text-base ${text}`}>{g.text}</p>
          </div>
        );
      })}
    </div>
  );
}
