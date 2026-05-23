import Link from "next/link";

/**
 * Renders policy sections (shared by public pages and full acceptance panel).
 * @param {{ sections: import("../../data/legal/sitePolicies.he.js").PolicySection[]; linkComponent?: 'next' | 'anchor' }} props
 */
export default function PolicySectionsBody({ sections, linkComponent = "next" }) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section
          key={section.id}
          id={`policy-section-${section.id}`}
          className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5"
        >
          <h3 className="text-base sm:text-lg font-bold text-amber-200/95 mb-2">{section.title}</h3>
          {section.paragraphs?.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="text-sm sm:text-base text-white/80 leading-relaxed mb-2 last:mb-0 break-words"
            >
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="list-disc list-outside me-5 mt-2 space-y-1.5 text-sm sm:text-base text-white/80 break-words">
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
                    <a href={link.href} className="text-amber-300 hover:text-amber-200 underline">
                      {link.label}
                    </a>
                  ) : linkComponent === "next" ? (
                    <Link href={link.href} className="text-amber-300 hover:text-amber-200 underline">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-amber-300 hover:text-amber-200 underline">
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
