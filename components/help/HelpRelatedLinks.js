import Link from "next/link";

export default function HelpRelatedLinks({ items }) {
  if (!items?.length) return null;
  return (
    <aside className="mt-8 pt-6 border-t border-white/10">
      <h2 className="text-lg font-bold text-amber-200 mb-3">קישורים קשורים</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-[44px] items-center text-amber-100 hover:text-amber-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-1"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
