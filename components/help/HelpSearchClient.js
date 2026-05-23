import { useMemo, useState } from "react";
import Link from "next/link";

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

export default function HelpSearchClient({ articles, sectionBase }) {
  const [query, setQuery] = useState("");
  const id = "help-search-input";

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return articles;
    return articles.filter((a) => {
      const hay = [a.title, a.summary, ...(a.keywords || [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [articles, query]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id} className="sr-only">
          חיפוש במדריכים
        </label>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי נושא או מילת מפתח..."
          className="w-full md:max-w-md rounded-xl bg-black/40 border border-white/20 px-4 py-3 min-h-[44px] text-white placeholder-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
          dir="rtl"
          aria-controls="help-search-results"
        />
      </div>
      <ul id="help-search-results" className="grid gap-3 sm:grid-cols-2">
        {filtered.map((a) => (
          <li key={a.slug}>
            <Link
              href={`${sectionBase}/${a.slug}`}
              className="block rounded-xl border border-white/10 bg-black/50 p-4 hover:bg-black/65 transition text-right min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <span className="font-bold text-amber-100">{a.title}</span>
              <p className="text-sm text-white/65 mt-1 line-clamp-2">{a.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="text-white/60 text-sm text-right">לא נמצאו תוצאות לחיפוש זה.</p>
      ) : null}
    </div>
  );
}
