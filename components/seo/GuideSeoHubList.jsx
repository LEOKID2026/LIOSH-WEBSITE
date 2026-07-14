import Link from "next/link";

/**
 * @param {{ cards: { href: string, title: string, blurb?: string }[], isBright: boolean }} props
 */
export default function GuideSeoHubList({ cards, isBright }) {
  const card = isBright
    ? "rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/50 to-sky-50/40 p-4 shadow-md hover:border-violet-200 hover:shadow-lg transition"
    : "rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition";
  const title = isBright ? "text-violet-900 font-bold" : "text-white font-bold";
  const blurb = isBright ? "text-slate-600 text-sm mt-1" : "text-white/70 text-sm mt-1";

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="guides-hub-list">
      {cards.map((c) => (
        <Link key={c.href} href={c.href} className={`block text-right ${card}`}>
          <span className={title}>{c.title}</span>
          {c.blurb ? <p className={blurb}>{c.blurb}</p> : null}
        </Link>
      ))}
    </div>
  );
}
