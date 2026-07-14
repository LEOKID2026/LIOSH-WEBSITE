/**
 * @param {{ items: { q: string, a: string }[], isBright: boolean }} props
 */
export default function PracticeSeoFaq({ items, isBright }) {
  if (!items?.length) return null;

  const itemShell = isBright
    ? "rounded-xl border border-sky-100 bg-white/90 px-4 py-3 shadow-sm"
    : "rounded-xl border border-white/15 bg-white/5 px-4 py-3";
  const summary = isBright ? "text-sky-900 font-semibold" : "text-sky-100 font-semibold";
  const body = isBright ? "text-slate-600" : "text-white/75";
  const title = isBright ? "text-sky-900 font-black" : "text-sky-100 font-black";

  return (
    <section className="space-y-4" aria-labelledby="seo-faq-title">
      <h2 id="seo-faq-title" className={`text-xl md:text-2xl ${title}`}>
        שאלות נפוצות
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <details key={item.q} className={itemShell}>
            <summary className={`cursor-pointer text-sm md:text-base ${summary}`}>{item.q}</summary>
            <p className={`mt-2 text-sm leading-relaxed md:text-base ${body}`}>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
