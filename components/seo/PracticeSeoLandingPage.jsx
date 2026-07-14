import Link from "next/link";
import Layout from "../Layout";
import PageSeo from "./PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PracticeSeoFaq from "./PracticeSeoFaq";
import PracticeSeoGradeSections from "./PracticeSeoGradeSections";
import PracticeSeoCardGrid from "./PracticeSeoCardGrid";
import PracticeSeoRelatedGuides from "./PracticeSeoRelatedGuides";
import PublicSeoPageActions from "./PublicSeoPageActions";
import PublicSeoParentCta from "./PublicSeoParentCta";
import { getGuideLink } from "../../data/seo/guide-pages.he";
import { getHomeBtnClasses, getHomeTextClasses, HOME_PAGE_MAX, HOME_PAGE_PAD } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";
import {
  getPracticeBulletRowClass,
  getPracticeInnerPanelClass,
  getPracticeSectionPanelVariant,
} from "./practice-seo-inner-styles";

/**
 * @param {{ content: import("../../data/seo/practice-pages.he").PracticePageContent }} props
 */
export default function PracticeSeoLandingPage({ content }) {
  const { theme, isBright } = useStudentTheme();
  const seo = getPublicPageSeo(content.seoKey);
  const cls = getHomeTextClasses(isBright);
  const isHub = content.slug === "hub";
  const pageKind = isHub ? "practice-hub" : "practice-inner";

  const relatedGuides = (content.relatedGuideSlugs || [])
    .map((s) => getGuideLink(s))
    .filter(Boolean);

  const topicsPanel = getPracticeInnerPanelClass(isBright, "sky");
  const bulletRow = getPracticeBulletRowClass(isBright);

  return (
    <>
      <PageSeo title={seo.title} description={seo.description} canonicalPath={seo.canonicalPath} />
      <Layout studentTheme={theme} studentShell="home" layoutShowThemePicker>
        <div
          dir="rtl"
          lang="he"
          className={`mx-auto w-full ${HOME_PAGE_MAX} ${HOME_PAGE_PAD} space-y-8 py-8 md:space-y-10 md:py-12`}
        >
          <PublicSeoPageActions pageKind={pageKind} isBright={isBright} />

          <header className={`space-y-5 text-center ${cls.heroShell}`}>
            {content.badge ? (
              <p className={`inline-flex rounded-full px-4 py-1.5 text-xs font-semibold ${cls.label}`}>
                {content.badge}
              </p>
            ) : null}
            <h1 className={`text-3xl font-black leading-tight md:text-4xl ${cls.heading}`}>
              {content.h1}
            </h1>
            <p className={`mx-auto max-w-3xl text-sm leading-relaxed md:text-base ${cls.body}`}>
              {content.intro}
            </p>
            <PublicSeoParentCta isBright={isBright} />
          </header>

          {content.hubCards?.length ? (
            <PracticeSeoCardGrid cards={content.hubCards} isBright={isBright} />
          ) : null}

          {content.sections?.map((section) => {
            const hasTopicsBlock = Boolean(section.intro || section.bullets?.length);
            const paragraphVariant = getPracticeSectionPanelVariant(section.title);
            const paragraphPanel = getPracticeInnerPanelClass(isBright, paragraphVariant);

            return (
            <section key={section.title} className={`space-y-4 ${cls.panel}`}>
              <h2 className={cls.sectionTitle}>{section.title}</h2>
              {hasTopicsBlock ? (
                <div className={topicsPanel}>
                  {section.intro ? (
                    <p className={`text-sm leading-relaxed md:text-base ${cls.body}`}>{section.intro}</p>
                  ) : null}
                  {section.bullets?.length ? (
                    <ul className={`space-y-2.5 ${section.intro ? "mt-4" : ""}`}>
                      {section.bullets.map((b) => (
                        <li key={b} className={bulletRow}>
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              isBright
                                ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200"
                                : "bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-400/30"
                            }`}
                            aria-hidden
                          >
                            ✓
                          </span>
                          <span className={`text-sm md:text-base ${cls.body}`}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {section.paragraphs?.length ? (
                <div className={paragraphPanel}>
                  <div className="space-y-3">
                    {section.paragraphs.map((p) => (
                      <p key={p} className={`text-sm leading-relaxed md:text-base ${cls.body}`}>
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {section.gradeSections ? (
                <PracticeSeoGradeSections grades={section.gradeSections} isBright={isBright} />
              ) : null}
            </section>
            );
          })}

          {content.relatedPracticeLinks?.length ? (
            <section className={`space-y-4 ${cls.panel}`}>
              <h2 className={cls.sectionTitle}>עוד תחומי תרגול</h2>
              <ul className={`space-y-2 text-sm md:text-base ${cls.body}`}>
                {content.relatedPracticeLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={
                        isBright
                          ? "font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
                          : "font-medium text-sky-300 underline underline-offset-2 hover:text-sky-100"
                      }
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <PracticeSeoRelatedGuides guides={relatedGuides} isBright={isBright} />

          <PracticeSeoFaq items={content.faq} isBright={isBright} />

          <section className={`space-y-4 text-center ${cls.systemPanel}`}>
            <h2 className={cls.sectionTitle}>מוכנים להתחיל?</h2>
            <p className={`text-sm md:text-base ${cls.body}`}>
              פתחו חשבון הורה, הוסיפו את הילד, ותנו לו להתרגל בקצב שנוח לכם.
            </p>
            <HomeCtaLink
              href="/parent/login"
              label="כניסה / הרשמה להורים"
              className={getHomeBtnClasses("parents", isBright, "primary")}
            />
          </section>
        </div>
      </Layout>
    </>
  );
}
