import { useEffect } from "react";
import Link from "next/link";
import Layout from "../Layout";
import PageSeo from "../seo/PageSeo";
import {
  CONTACT_EMAIL,
  LEGACY_POLICY_PAGES,
  LEGAL_CROSS_LINKS,
  POLICY_LAST_UPDATED_DISPLAY,
  UNIFIED_LEGAL_SECTIONS,
} from "../../data/legal/sitePolicies.he";

/**
 * Unified Hebrew legal page — full content with optional scroll to section (legacy routes).
 * @param {{ pageKey?: keyof typeof LEGACY_POLICY_PAGES; scrollToSectionId?: string }} props
 */
export default function UnifiedLegalPolicyPage({ pageKey = "legal", scrollToSectionId }) {
  const meta = LEGACY_POLICY_PAGES[pageKey] || LEGACY_POLICY_PAGES.legal;
  const { pageTitle, metaDescription, intro, route } = meta;
  const seoTitle = `${pageTitle} · LEO KIDS`;
  const targetSectionId = scrollToSectionId || meta.scrollToSectionId || null;

  useEffect(() => {
    if (!targetSectionId || typeof window === "undefined") return;
    const scroll = () => {
      const el = document.getElementById(targetSectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    const t = window.setTimeout(scroll, 100);
    return () => window.clearTimeout(t);
  }, [targetSectionId]);

  return (
    <Layout>
      <PageSeo
        title={seoTitle}
        description={metaDescription}
        canonicalPath={route}
      />
      <article dir="rtl" lang="he" className="max-w-3xl mx-auto px-4 py-10 sm:py-12 text-right">
        <header className="mb-8 space-y-3">
          <p className="text-xs text-white/50">עודכן לאחרונה: {POLICY_LAST_UPDATED_DISPLAY}</p>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
            {pageKey === "legal" ? pageTitle : pageTitle}
          </h1>
          {pageKey === "legal" && intro ? (
            <>
              <p className="text-base sm:text-lg text-white/75 leading-relaxed">{intro}</p>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                יצירת קשר:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-300 hover:text-amber-200 underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                העמוד נכתב כדי להסביר בשפה ברורה מה השירות עושה, איזה מידע נשמר, איך משתמשים בו, מה ההורים
                יכולים לראות, ומה חשוב לדעת לפני שימוש באתר.
              </p>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                השימוש באתר, יצירת חשבון, כניסה עם Google, כניסה עם אימייל וסיסמה, שימוש של ילד, שימוש של מורה
                או המשך שימוש באתר לאחר עדכון התנאים - מהווים הסכמה לתנאים המפורטים בעמוד זה.
              </p>
            </>
          ) : (
            <p className="text-sm text-white/60">
              מסמך מלא:{" "}
              <Link href="/legal" className="text-amber-300 hover:text-amber-200 underline">
                תנאים, פרטיות, נגישות ושימוש בבינה מלאכותית
              </Link>
            </p>
          )}
        </header>

        <PolicySections sections={UNIFIED_LEGAL_SECTIONS} />

        <footer className="mt-10 pt-6 border-t border-white/10 space-y-4 text-sm text-white/65">
          <p>
            שאלות:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-300 hover:text-amber-200 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <nav aria-label="קישורים למסמכים משפטיים">
            <p className="mb-2 font-semibold text-white/80">מסמכים נוספים</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL_CROSS_LINKS.filter((l) => l.href !== route && l.href !== "/legal").map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-amber-300/90 hover:text-amber-200 underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/legal" className="text-amber-300/90 hover:text-amber-200 underline">
                  תנאים, פרטיות ונגישות
                </Link>
              </li>
            </ul>
          </nav>
        </footer>
      </article>
    </Layout>
  );
}

/** @param {{ sections: import("../../data/legal/sitePolicies.he").PolicySection[] & { paragraphsAfterBullets?: string[]; paragraphsAfterLinks?: string[] }[] }} props */
function PolicySections({ sections }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="bg-black/50 border border-white/10 rounded-xl p-5 sm:p-6 shadow-md scroll-mt-24"
        >
          <h2 className="text-lg sm:text-xl font-bold text-amber-200/95 mb-3">{section.title}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className="text-sm sm:text-base text-white/80 leading-relaxed mb-2 last:mb-0">
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="list-disc list-outside me-5 mt-2 space-y-1.5 text-sm sm:text-base text-white/80">
              {section.bullets.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
          ) : null}
          {section.paragraphsAfterBullets?.map((p) => (
            <p key={p.slice(0, 40)} className="text-sm sm:text-base text-white/80 leading-relaxed mt-2 mb-0">
              {p}
            </p>
          ))}
          {section.links?.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href} className="text-amber-300 hover:text-amber-200 underline">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-amber-300 hover:text-amber-200 underline">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {section.paragraphsAfterLinks?.map((p) => (
            <p key={p.slice(0, 40)} className="text-sm sm:text-base text-white/80 leading-relaxed mt-2 mb-0">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
