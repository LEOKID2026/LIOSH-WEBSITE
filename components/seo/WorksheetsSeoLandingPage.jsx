import landing from "../../styles/worksheets-landing.module.css";
import Link from "next/link";
import { getGuideLink } from "../../data/seo/guide-pages.he";
import { getHomeBtnClasses } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";
import PromoVideoClickablePreview from "../promo/PromoVideoClickablePreview.jsx";
import { PARENT_PROMO_DESKTOP_SRC } from "../parent/ParentPromoVideo.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PublicSeoWideLayout from "./PublicSeoWideLayout";
import PublicSeoWorksheetsHubSlot from "./PublicSeoWorksheetsHubSlot";
import PublicSeoWideRelatedGuides from "./PublicSeoWideRelatedGuides";
import PracticeSeoFaq from "./PracticeSeoFaq";
import { getPublicSeoWideClasses, getPublicSeoInnerPanelClass } from "./public-seo-wide-theme";

/**
 * @param {{ content: import("../../data/seo/worksheets-pages.he").WorksheetsPageContent }} props
 */
export default function WorksheetsSeoLandingPage({ content }) {
  const { isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);

  const relatedGuides = (content.relatedGuideSlugs || [])
    .map((s) => getGuideLink(s))
    .filter(Boolean);

  const frameClass = isBright
    ? "border-slate-200/80 bg-slate-900/5 shadow-sm"
    : "border-white/15 bg-black/30 shadow-lg shadow-black/20";

  const heroActions = (
    <div className={landing.heroActions} data-testid="worksheets-landing-hero-actions">
      <HomeCtaLink
        href="#worksheet-generator"
        label="יצירת דף התנסות"
        className={getHomeBtnClasses("teachers", isBright, "primary")}
        testId="worksheets-hero-scroll-generator"
      />
      <HomeCtaLink
        href="#ready-worksheets"
        label="לדפים המוכנים"
        className={getHomeBtnClasses("teachers", isBright, "secondary")}
        testId="worksheets-hero-scroll-ready"
      />
      <HomeCtaLink
        href="/parents"
        label="למערכת המלאה להורים"
        className={getHomeBtnClasses("parents", isBright, "secondary")}
        size="md"
        testId="worksheets-hero-parents-system"
      />
    </div>
  );

  return (
    <PublicSeoWideLayout
      seoKey={content.seoKey}
      pageKind="practice-inner"
      badge={content.badge}
      h1={content.h1}
      intro={content.intro}
      heroActions={heroActions}
      heroNote={content.heroNote}
      heroNoteClassName={landing.heroNote}
    >
      <div className={landing.page} data-testid="worksheets-landing-page">
        <section className={cls.section} aria-label="נתונים מרכזיים">
          <div className={landing.statStrip}>
            {content.stats.map((item) => (
              <article key={item.title} className={`${landing.statCard} ${cls.highlight}`}>
                <p className={`${landing.statTitle} ${cls.heading}`}>{item.title}</p>
                <p className={`${landing.statText} ${cls.body}`}>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <PublicSeoWorksheetsHubSlot
          generatorLead={content.generator}
          readyLead={content.ready}
          landingStyles={landing}
        />

        <section className={`space-y-6 ${cls.section}`}>
          <div className="space-y-4">
            <h2 className={cls.sectionTitle}>{content.usage.h2}</h2>
            <div className={landing.steps}>
              {content.usage.steps.map((step) => (
                <article key={step.number} className={`${landing.stepCard} ${cls.highlight}`}>
                  <span className={`${landing.stepNum} ${cls.bulletIcon}`}>{step.number}</span>
                  <h3 className={`mt-3 text-base font-bold md:text-lg ${cls.heading}`}>{step.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed md:text-base ${cls.body}`}>{step.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className={cls.sectionTitle}>{content.subjects.h2}</h2>
            <p className={`${landing.sectionLead} ${cls.body}`}>{content.subjects.intro}</p>
            <div className={landing.subjectGrid}>
              {content.subjects.items.map((item) => (
                <article key={item.title} className={`${landing.subjectCard} ${cls.highlight}`}>
                  <h3 className={`${landing.subjectTitle} ${cls.heading}`}>{item.title}</h3>
                  <p className={`${landing.subjectText} ${cls.body}`}>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${cls.section} ${landing.videoGrid}`}>
          <div className="space-y-4 text-right">
            <h2 className={cls.sectionTitle}>{content.video.h2}</h2>
            <p className={`text-sm leading-relaxed md:text-base ${cls.body}`}>{content.video.paragraph1}</p>
            <p className={`text-sm leading-relaxed md:text-base ${cls.body}`}>{content.video.paragraph2}</p>
            <div className={landing.videoCards}>
              {content.video.cards.map((card) => (
                <article key={card.title} className={`${landing.videoCard} ${cls.highlight}`}>
                  <h3 className={`text-base font-bold ${cls.heading}`}>{card.title}</h3>
                  <p className={`mt-1 text-sm leading-relaxed ${cls.body}`}>{card.text}</p>
                </article>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <HomeCtaLink
                href="/parents"
                label="להכיר את פורטל ההורים"
                className={getHomeBtnClasses("parents", isBright, "primary")}
                testId="worksheets-video-parents-portal"
              />
              <HomeCtaLink
                href="/student/login"
                label="כניסת ילדים"
                className={getHomeBtnClasses("kids", isBright, "secondary")}
                size="md"
                testId="worksheets-video-student-login"
              />
            </div>
          </div>
          <div className={landing.videoFrame}>
            <PromoVideoClickablePreview
              src={PARENT_PROMO_DESKTOP_SRC}
              wrapClassName={`w-full overflow-hidden rounded-2xl border ${frameClass}`}
              videoClassName="block h-auto w-full aspect-video bg-black object-contain"
              ariaLabel="סרטון הורים"
              testId="worksheets-landing-parent-video"
            />
          </div>
        </section>

        <section
          className={`space-y-5 ${getPublicSeoInnerPanelClass(isBright, "amber")}`}
          data-testid="worksheets-parent-system"
        >
          <h2 className={cls.sectionTitle}>{content.parentSystem.h2}</h2>
          <p className={`${landing.sectionLead} ${cls.body}`}>{content.parentSystem.intro}</p>
          <div className={landing.parentGrid}>
            {content.parentSystem.cards.map((card) => (
              <article key={card.title} className={`${landing.parentCard} ${cls.highlight}`}>
                <h3 className={`${landing.parentCardTitle} ${cls.heading}`}>{card.title}</h3>
                <p className={`${landing.parentCardText} ${cls.body}`}>{card.text}</p>
              </article>
            ))}
          </div>
          <p className={`text-sm leading-relaxed md:text-base ${cls.body}`}>{content.parentSystem.ctaText}</p>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <HomeCtaLink
              href="/parent/login"
              label="כניסה / הרשמה להורים"
              className={getHomeBtnClasses("parents", isBright, "primary")}
              testId="worksheets-parent-system-login"
            />
            <HomeCtaLink
              href="/parents"
              label="להכיר את פורטל ההורים"
              className={getHomeBtnClasses("parents", isBright, "secondary")}
              size="md"
              testId="worksheets-parent-system-portal"
            />
          </div>
          <p className={`${landing.conversionNote} ${cls.muted}`}>{content.parentSystem.conversionNote}</p>
        </section>

        <section className={landing.faqCta}>
          {content.relatedPracticeLinks?.length ? (
            <section className={`space-y-3 ${cls.section}`}>
              <h2 className={cls.sectionSubtitle}>עוד תחומי תרגול</h2>
              <ul className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${cls.body}`}>
                {content.relatedPracticeLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={cls.linkSky}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <PublicSeoWideRelatedGuides guides={relatedGuides} isBright={isBright} />

          <PracticeSeoFaq items={content.faq} isBright={isBright} />
          <div className={`${landing.ctaBlock} space-y-4 ${cls.footerCta}`}>
            <p className={`${landing.ctaTitle} ${cls.footerTitle}`}>{content.footerCta.title}</p>
            <p className={`${landing.ctaText} ${cls.footerBody}`}>{content.footerCta.body}</p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <HomeCtaLink
                href={content.footerCta.primary.href}
                label={content.footerCta.primary.label}
                className={getHomeBtnClasses("teachers", isBright, "primary")}
                testId="worksheets-footer-scroll-generator"
              />
              <HomeCtaLink
                href={content.footerCta.secondary.href}
                label={content.footerCta.secondary.label}
                className={getHomeBtnClasses("parents", isBright, "secondary")}
                size="md"
                testId="worksheets-footer-parent-login"
              />
            </div>
          </div>
        </section>
      </div>
    </PublicSeoWideLayout>
  );
}
