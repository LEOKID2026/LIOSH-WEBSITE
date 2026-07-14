import Link from "next/link";

/**
 * @param {{ cards: { href: string, title: string, blurb?: string, emoji?: string }[], isBright: boolean, heading?: string }} props
 */
export default function PracticeSeoCardGrid({ cards, isBright, heading = "תחומי תרגול" }) {
  if (!cards?.length) return null;

  const h2 = isBright ? "text-sky-900 font-black" : "text-sky-100 font-black";
  const card = isBright
    ? "rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-violet-50/40 p-4 shadow-md hover:border-sky-200 hover:shadow-lg transition"
    : "rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition";
  const title = isBright ? "text-sky-900 font-bold" : "text-white font-bold";
  const blurb = isBright ? "text-slate-600 text-sm mt-1" : "text-white/70 text-sm mt-1";

  return (
    <section className="space-y-4">
      <h2 className={`text-xl md:text-2xl ${h2}`}>{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`block text-right ${card}`}>
            {c.emoji ? (
              <span className="mb-2 block text-2xl" aria-hidden>
                {c.emoji}
              </span>
            ) : null}
            <span className={`block ${title}`}>{c.title}</span>
            {c.blurb ? <span className={`block ${blurb}`}>{c.blurb}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
