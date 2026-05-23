export default function HelpTOC({ toc }) {
  if (!toc?.length) return null;

  const list = (
    <ul className="space-y-2 text-sm">
      {toc.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="block py-1 text-white/75 hover:text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-1"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className="lg:hidden mb-6 rounded-xl border border-white/10 bg-black/50 p-4">
        <summary className="cursor-pointer font-semibold text-amber-200 min-h-[44px] flex items-center">
          תוכן העניינים
        </summary>
        <nav aria-label="תוכן העניינים" className="mt-3 text-right">
          {list}
        </nav>
      </details>
      <nav
        aria-label="תוכן העניינים"
        className="hidden lg:block sticky top-20 self-start rounded-xl border border-white/10 bg-black/50 p-4 text-right"
      >
        <h2 className="text-sm font-bold text-amber-200 mb-3">תוכן העניינים</h2>
        {list}
      </nav>
    </>
  );
}
