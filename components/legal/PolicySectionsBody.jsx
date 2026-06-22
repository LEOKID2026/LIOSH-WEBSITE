import Link from "next/link";

/**
 * Renders policy sections (shared by public pages and full acceptance panel).
 * @param {{ sections: import("../../data/legal/sitePolicies.he.js").PolicySection[]; linkComponent?: 'next' | 'anchor'; bright?: boolean }} props
 */
export default function PolicySectionsBody({ sections, linkComponent = "next", bright = false }) {
  const sectionClass = bright
    ? "bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
    : "bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5";
  const titleClass = bright
    ? "text-base sm:text-lg font-bold text-amber-800 mb-2"
    : "text-base sm:text-lg font-bold text-amber-200/95 mb-2";
  const bodyClass = bright
    ? "text-sm sm:text-base text-slate-700 leading-relaxed mb-2 last:mb-0 break-words"
    : "text-sm sm:text-base text-white/80 leading-relaxed mb-2 last:mb-0 break-words";
  const listClass = bright
    ? "list-disc list-outside me-5 mt-2 space-y-1.5 text-sm sm:text-base text-slate-700 break-words"
    : "list-disc list-outside me-5 mt-2 space-y-1.5 text-sm sm:text-base text-white/80 break-words";
  const linkClass = bright
    ? "text-sky-700 hover:text-sky-900 underline"
    : "text-amber-300 hover:text-amber-200 underline";

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section
          key={section.id}
          id={`policy-section-${section.id}`}
          className={sectionClass}
        >
          <h3 className={titleClass}>{section.title}</h3>
          {section.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className={bodyClass}>
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className={listClass}>
              {section.bullets.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
          ) : null}
          {section.links?.length ? (
            <ul className="mt-3 space-y-1 text-sm break-all">
              {section.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  ) : linkComponent === "next" ? (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
