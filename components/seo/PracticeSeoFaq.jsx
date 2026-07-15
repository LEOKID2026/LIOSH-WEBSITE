import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/**
 * @param {{ items: { q: string, a: string }[], isBright: boolean }} props
 */
export default function PracticeSeoFaq({ items, isBright }) {
  if (!items?.length) return null;

  const cls = getPublicSeoWideClasses(isBright);
  const itemShell = isBright
    ? "rounded-xl border border-sky-100 bg-white/90 px-4 py-3 text-right shadow-sm"
    : "rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-right";

  return (
    <section className={`space-y-4 ${cls.section}`} aria-labelledby="seo-faq-title">
      <h2 id="seo-faq-title" className={cls.sectionTitle}>
        שאלות נפוצות
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <details key={item.q} className={itemShell}>
            <summary className={`cursor-pointer text-right text-sm font-semibold md:text-base ${cls.heading}`}>
              {item.q}
            </summary>
            <p className={`mt-2 w-full text-sm leading-relaxed md:text-base ${cls.body}`}>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
