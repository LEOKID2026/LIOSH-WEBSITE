import Link from "next/link";
import { getGuideLink } from "../../data/seo/guide-pages.he";
import { GUIDE_HUB_CARDS } from "../../data/seo/guide-pages.he";
import { getHomeBtnClasses } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";
import PublicSeoWideLayout from "./PublicSeoWideLayout";
import PublicSeoWideSectionBody from "./PublicSeoWideSectionBody";
import PublicSeoWideCardGrid from "./PublicSeoWideCardGrid";
import PublicSeoWideFooterCta from "./PublicSeoWideFooterCta";
import PublicSeoWideRelatedGuides from "./PublicSeoWideRelatedGuides";
import PracticeSeoFaq from "./PracticeSeoFaq";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";
import { DEFAULT_PUBLIC_SEO_FOOTER_CTA } from "./public-seo-wide-defaults";

/**
 * @param {{ content: import("../../data/seo/guide-pages.he").GuidePageContent, isHub?: boolean }} props
 */
export default function GuideSeoArticlePage({ content, isHub = false }) {
  const { isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);
  const pageKind = isHub ? "guides-hub" : "guides-inner";

  const relatedGuides = (content.relatedGuideSlugs || [])
    .map((s) => getGuideLink(s))
    .filter(Boolean);

  const footerCta = content.footerCta ?? DEFAULT_PUBLIC_SEO_FOOTER_CTA;

  return (
    <PublicSeoWideLayout
      seoKey={content.seoKey}
      pageKind={pageKind}
      badge={content.badge}
      h1={content.h1}
      intro={content.intro}
      footer={<PublicSeoWideFooterCta {...footerCta} isBright={isBright} />}
    >
      {content.sections?.map((section) => (
        <PublicSeoWideSectionBody key={section.title} section={section} isBright={isBright} />
      ))}

      {isHub ? (
        <PublicSeoWideCardGrid
          cards={GUIDE_HUB_CARDS}
          isBright={isBright}
          heading={content.hubCardsHeading || "בחירת מדריך לפי מטרה"}
          testId="guides-hub-list"
        />
      ) : null}

      {!isHub && content.relatedPracticePath ? (
        <aside className={`space-y-3 ${cls.highlight}`} data-testid="guide-practice-cta">
          <h2 className={cls.sectionSubtitle}>ממשיכים מהמדריך לתרגול</h2>
          <p className={`w-full text-sm md:text-base ${cls.body}`}>
            לאחר שבחרתם דרך עבודה, עברו לתחום התרגול המתאים ובחרו כיתה ונושא. אפשר לחזור למדריך
            בכל שלב כדי לבדוק את הדרך ולהתאים את ההמשך.
          </p>
          <HomeCtaLink
            href={content.relatedPracticePath}
            label="לתחומי התרגול"
            className={getHomeBtnClasses("parents", isBright, "secondary")}
            size="md"
          />
        </aside>
      ) : null}

      {isHub ? (
        <section className={`space-y-3 ${cls.highlight}`}>
          <h2 className={cls.sectionSubtitle}>עברו מהמדריכים לתרגול</h2>
          <p className={`w-full text-sm md:text-base ${cls.body}`}>
            עמודי התרגול מרכזים את המקצועות, הנושאים והפעילויות הזמינים, כדי שתוכלו לבחור את
            הצעד הבא לפי המטרה שלכם.
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
        <section className={`space-y-3 ${cls.section}`}>
          <h2 className={cls.sectionSubtitle}>מדריכים נוספים</h2>
          <ul className={`space-y-2 text-sm md:text-base ${cls.body}`}>
            {relatedGuides.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className={cls.linkViolet}>
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PracticeSeoFaq items={content.faq} isBright={isBright} />
    </PublicSeoWideLayout>
  );
}
