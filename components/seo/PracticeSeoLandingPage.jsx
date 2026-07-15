import Link from "next/link";
import { getGuideLink } from "../../data/seo/guide-pages.he";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PublicSeoWideLayout from "./PublicSeoWideLayout";
import PublicSeoWideSectionBody from "./PublicSeoWideSectionBody";
import PublicSeoWideCardGrid from "./PublicSeoWideCardGrid";
import PublicSeoWideFooterCta from "./PublicSeoWideFooterCta";
import PublicSeoWideRelatedGuides from "./PublicSeoWideRelatedGuides";
import PublicSeoWorksheetsHubSlot from "./PublicSeoWorksheetsHubSlot";
import PracticeSeoFaq from "./PracticeSeoFaq";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";
import {
  DEFAULT_PUBLIC_SEO_FOOTER_CTA,
  WORKSHEETS_PUBLIC_SEO_FOOTER_CTA,
} from "./public-seo-wide-defaults";

const WORKSHEETS_HUB_SPLIT_INDEX = 2;

/**
 * @param {{ content: import("../../data/seo/practice-pages.he").PracticePageContent | import("../../data/seo/worksheets-pages.he").WorksheetsPageContent }} props
 */
export default function PracticeSeoLandingPage({ content }) {
  const { isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);
  const isWorksheets = content.seoKey === "practice-worksheets";
  const isHub = content.slug === "hub";
  const pageKind = isHub ? "practice-hub" : "practice-inner";

  const relatedGuides = (content.relatedGuideSlugs || [])
    .map((s) => getGuideLink(s))
    .filter(Boolean);

  const sections = content.sections || [];
  const preHubSections = isWorksheets ? sections.slice(0, WORKSHEETS_HUB_SPLIT_INDEX) : sections;
  const postHubSections = isWorksheets ? sections.slice(WORKSHEETS_HUB_SPLIT_INDEX) : [];

  const footerCta =
    content.footerCta ?? (isWorksheets ? WORKSHEETS_PUBLIC_SEO_FOOTER_CTA : DEFAULT_PUBLIC_SEO_FOOTER_CTA);

  return (
    <PublicSeoWideLayout
      seoKey={content.seoKey}
      pageKind={pageKind}
      badge={content.badge}
      h1={content.h1}
      intro={content.intro}
      footer={<PublicSeoWideFooterCta {...footerCta} isBright={isBright} />}
    >
      {content.hubCards?.length ? (
        <PublicSeoWideCardGrid cards={content.hubCards} isBright={isBright} />
      ) : null}

      {preHubSections.map((section) => (
        <PublicSeoWideSectionBody key={section.title} section={section} isBright={isBright} />
      ))}

      {isWorksheets ? <PublicSeoWorksheetsHubSlot /> : null}

      {postHubSections.map((section) => (
        <PublicSeoWideSectionBody key={section.title} section={section} isBright={isBright} />
      ))}

      {content.relatedPracticeLinks?.length ? (
        <section className={`space-y-4 ${cls.section}`}>
          <h2 className={cls.sectionTitle}>עוד תחומי תרגול</h2>
          <ul className={`space-y-2 text-sm md:text-base ${cls.body}`}>
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
    </PublicSeoWideLayout>
  );
}
