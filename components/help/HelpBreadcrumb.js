import Link from "next/link";

export default function HelpBreadcrumb({ items }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="ניווט מסלול" className="text-sm text-white/60 mb-4">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.href || item.label} className="flex items-center gap-1">
            {i > 0 ? <span aria-hidden className="text-white/40">/</span> : null}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-0.5"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-white/80" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
