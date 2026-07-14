import Link from "next/link";
import Layout from "../Layout";
import PageSeo from "./PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PracticeSeoFaq from "./PracticeSeoFaq";
import GuideSeoHubList from "./GuideSeoHubList";
import PublicSeoPageActions from "./PublicSeoPageActions";
import PublicSeoParentCta from "./PublicSeoParentCta";
import { getGuideLink } from "../../data/seo/guide-pages.he";
import { GUIDE_HUB_CARDS } from "../../data/seo/guide-pages.he";
import { getHomeBtnClasses, getHomeTextClasses, HOME_PAGE_MAX, HOME_PAGE_PAD } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";

/**
 * @param {{ content: import("../../data/seo/guide-pages.he").GuidePageContent, isHub?: boolean }} props
 */
export default function GuideSeoArticlePage({ content, isHub = false }) {
  const { theme, isBright } = useStudentTheme();
  const seo = getPublicPageSeo(content.seoKey);
  const cls = getHomeTextClasses(isBright);
  const pageKind = isHub ? "guides-hub" : "guides-inner";

  const relatedGuides = (content.relatedGuideSlugs || [])
    .map((s) => getGuideLink(s))
    .filter(Boolean);

  return (
    <>
      <PageSeo title={seo.title} description={seo.description} canonicalPath={seo.canonicalPath} />
      <Layout studentTheme={theme} studentShell="home" layoutShowThemePicker>
        <article
          dir="rtl"
          lang="he"
          className={`mx-auto w-full ${HOME_PAGE_MAX} ${HOME_PAGE_PAD} space-y-8 py-8 md:space-y-10 md:py-12`}
        >
          <PublicSeoPageActions pageKind={pageKind} isBright={isBright} />

          <header className={`mx-auto max-w-4xl space-y-5 text-center ${cls.heroShell}`}>
            <h1 className={`text-3xl font-black leading-tight md:text-4xl ${cls.heading}`}>
              {content.h1}
            </h1>
            <p className={`text-sm leading-relaxed md:text-base ${cls.body}`}>{content.intro}</p>
            <PublicSeoParentCta isBright={isBright} />
          </header>

          <div className="mx-auto max-w-4xl space-y-8 md:space-y-10">
            {isHub ? (
              <section className={`space-y-4 ${cls.panel}`}>
                <h2 className={cls.sectionTitle}>כל המדריכים</h2>
                <GuideSeoHubList cards={GUIDE_HUB_CARDS} isBright={isBright} />
              </section>
            ) : null}

            {content.sections?.map((section) => (
              <section key={section.title} className={`space-y-4 ${cls.panel}`}>
                <h2 className={cls.sectionTitle}>{section.title}</h2>
                {section.paragraphs?.map((p) => (
                  <p key={p} className={`text-sm leading-relaxed md:text-base ${cls.body}`}>
                    {p}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul
                    className={`space-y-2 rounded-xl border p-4 ${
                      isBright ? "border-violet-100 bg-violet-50/50" : "border-white/10 bg-white/5"
                    }`}
                  >
                    {section.bullets.map((b) => (
                      <li key={b} className={`flex gap-2 text-sm md:text-base ${cls.body}`}>
                        <span className="shrink-0 text-violet-500" aria-hidden>
                          •
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {!isHub && content.relatedPracticePath ? (
              <aside className={`space-y-3 ${cls.highlight}`} data-testid="guide-practice-cta">
                <h2 className={`text-lg font-bold ${cls.heading}`}>תרגול ב-Leo Kids</h2>
                <p className={`text-sm md:text-base ${cls.body}`}>
                  רוצים לתרגל את הנושא בפועל? ב-Leo Kids הילד מתרגל בקצב שלו, ואתם רואים התקדמות
                  פשוטה.
                </p>
                <HomeCtaLink
                  href={content.relatedPracticePath}
                  label={content.practiceCtaLabel || "לתחומי התרגול"}
                  className={getHomeBtnClasses("parents", isBright, "secondary")}
                  size="md"
                />
              </aside>
            ) : null}

            {isHub ? (
              <section className={`space-y-3 ${cls.highlight}`}>
                <h2 className={cls.sectionTitle}>תחומי תרגול</h2>
                <p className={`text-sm md:text-base ${cls.body}`}>
                  מחפשים תרגול לפי מקצוע? כל תחומי התרגול מרוכזים בעמוד אחד.
                </p>
                <HomeCtaLink
                  href="/practice"
                  label="לתחומי התרגול"
                  className={getHomeBtnClasses("parents", isBright, "secondary")}
                  size="md"
                />
              </section>
            ) : null}

            {relatedGuides.length ? (
              <section className={`space-y-3 ${cls.panel}`}>
                <h2 className={`text-base font-bold md:text-lg ${cls.heading}`}>מדריכים נוספים</h2>
                <ul className={`space-y-1.5 text-sm md:text-base ${cls.body}`}>
                  {relatedGuides.map((g) => (
                    <li key={g.href}>
                      <Link
                        href={g.href}
                        className={
                          isBright
                            ? "font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
                            : "font-medium text-violet-300 underline underline-offset-2 hover:text-violet-100"
                        }
                      >
                        {g.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <PracticeSeoFaq items={content.faq} isBright={isBright} />

            <footer className={`space-y-4 text-center ${cls.systemPanel}`}>
              <HomeCtaLink
                href="/parent/login"
                label="כניסה / הרשמה להורים"
                className={getHomeBtnClasses("parents", isBright, "primary")}
              />
            </footer>
          </div>
        </article>
      </Layout>
    </>
  );
}
