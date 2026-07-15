import Link from "next/link";
import { getHomeBtnClasses, getHomeTextClasses } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";

const QUICK_LINKS = [
  { label: "מתמטיקה", href: "/practice/math" },
  { label: "קריאה והבנת הנקרא", href: "/practice/reading" },
  { label: "אנגלית", href: "/practice/english" },
  { label: "תרגול דיגיטלי", href: "/practice/no-print" },
  { label: "דוחות להורים", href: "/practice/parent-reports" },
  { label: "איך לבנות שגרת תרגול", href: "/guides/home-practice-routine" },
];

/**
 * In-page SEO entry — homepage / parents only. Not global footer or HUD.
 * @param {{ isBright: boolean }} props
 */
export default function PublicSeoEntrySection({ isBright }) {
  const cls = getHomeTextClasses(isBright);

  return (
    <section
      className={`space-y-5 text-center md:space-y-6 ${cls.panel}`}
      data-testid="public-seo-entry-section"
    >
      <h2 className={cls.sectionTitle}>תחומי תרגול ומדריכים להורים</h2>
      <p className={`mx-auto max-w-2xl text-sm leading-relaxed md:text-base ${cls.body}`}>
        רוצים להכיר את תחומי התרגול ב-Leo Kids? אפשר לעבור לדפי התרגול והמדריכים, לקרוא הסבר
        קצר, ואז להיכנס או להירשם כאזור הורים.
      </p>

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
        <HomeCtaLink
          href="/practice"
          label="תחומי תרגול"
          className={getHomeBtnClasses("parents", isBright, "primary")}
          size="md"
          testId="public-seo-entry-practice"
        />
        <HomeCtaLink
          href="/guides"
          label="מדריכים להורים"
          className={getHomeBtnClasses("parents", isBright, "secondary")}
          size="md"
          testId="public-seo-entry-guides"
        />
      </div>

      <ul className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
        {QUICK_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={
                isBright
                  ? "text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  : "text-sky-300 underline underline-offset-2 hover:text-sky-100"
              }
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
