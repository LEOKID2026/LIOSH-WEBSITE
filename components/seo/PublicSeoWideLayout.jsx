import Layout from "../Layout";
import PageSeo from "./PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PublicSeoPageActions from "./PublicSeoPageActions";
import PublicSeoParentCta from "./PublicSeoParentCta";
import {
  getPublicSeoWideClasses,
  PUBLIC_SEO_PAGE_MAX,
  PUBLIC_SEO_PAGE_PAD,
  PUBLIC_SEO_PAGE_SPACE,
} from "./public-seo-wide-theme";

/**
 * @typedef {'practice-hub' | 'practice-inner' | 'guides-hub' | 'guides-inner'} SeoPageKind
 */

/**
 * Shared wide public SEO shell — guides, practice, worksheets.
 * @param {{
 *   seoKey: string,
 *   pageKind: SeoPageKind,
 *   badge?: string,
 *   h1: string,
 *   intro: string,
 *   children: import("react").ReactNode,
 *   footer?: import("react").ReactNode,
 * }} props
 */
export default function PublicSeoWideLayout({
  seoKey,
  pageKind,
  badge,
  h1,
  intro,
  children,
  footer,
}) {
  const { theme, isBright } = useStudentTheme();
  const seo = getPublicPageSeo(seoKey);
  const cls = getPublicSeoWideClasses(isBright);

  return (
    <>
      <PageSeo title={seo.title} description={seo.description} canonicalPath={seo.canonicalPath} />
      <Layout studentTheme={theme} studentShell="home" layoutShowThemePicker>
        <div
          dir="rtl"
          lang="he"
          className={`mx-auto w-full ${PUBLIC_SEO_PAGE_MAX} ${PUBLIC_SEO_PAGE_PAD} ${PUBLIC_SEO_PAGE_SPACE}`}
          data-testid="public-seo-wide-layout"
        >
          <PublicSeoPageActions pageKind={pageKind} isBright={isBright} />

          <header className={`space-y-4 ${cls.heroShell}`}>
            {badge ? <p className={cls.badge}>{badge}</p> : null}
            <h1 className={cls.h1}>{h1}</h1>
            <p className={cls.intro}>{intro}</p>
            <PublicSeoParentCta isBright={isBright} />
          </header>

          <div className="space-y-8 md:space-y-10">{children}</div>

          {footer ? <div className="mt-8 md:mt-10">{footer}</div> : null}
        </div>
      </Layout>
    </>
  );
}
