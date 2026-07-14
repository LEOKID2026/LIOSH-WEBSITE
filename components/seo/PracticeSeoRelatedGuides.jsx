import Link from "next/link";

/**
 * @param {{ guides: { href: string, label: string }[], isBright: boolean }} props
 */
export default function PracticeSeoRelatedGuides({ guides, isBright }) {
  if (!guides?.length) return null;

  const shell = isBright
    ? "rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-violet-50/40 p-4 md:p-5 shadow-sm"
    : "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5";
  const title = isBright ? "text-sky-900 font-bold" : "text-sky-100 font-bold";
  const link = isBright
    ? "font-medium text-sky-700 hover:text-sky-900 underline underline-offset-2"
    : "font-medium text-sky-300 hover:text-sky-100 underline underline-offset-2";

  return (
    <aside
      className={`space-y-2 ${shell}`}
      data-testid="practice-related-guides"
      aria-label="מדריכים קשורים"
    >
      <h2 className={`text-base font-bold md:text-lg ${title}`}>מדריכים קשורים</h2>
      <ul className="space-y-1.5 text-sm md:text-base">
        {guides.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className={link}>
              {g.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
