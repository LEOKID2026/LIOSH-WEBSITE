import { getHomeBtnClasses } from "../home/home-theme";
import HomeCtaLink from "../home/HomeCtaLink";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/**
 * @param {{
 *   title: string,
 *   body: string,
 *   primary: { href: string, label: string },
 *   secondary?: { href: string, label: string },
 *   isBright: boolean,
 * }} props
 */
export default function PublicSeoWideFooterCta({ title, body, primary, secondary, isBright }) {
  const cls = getPublicSeoWideClasses(isBright);

  return (
    <section className={`space-y-4 ${cls.footerCta}`} data-testid="public-seo-footer-cta">
      <h2 className={cls.footerTitle}>{title}</h2>
      <p className={cls.footerBody}>{body}</p>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <HomeCtaLink
          href={primary.href}
          label={primary.label}
          className={getHomeBtnClasses("parents", isBright, "primary")}
        />
        {secondary ? (
          <HomeCtaLink
            href={secondary.href}
            label={secondary.label}
            className={getHomeBtnClasses("parents", isBright, "secondary")}
            size="md"
          />
        ) : null}
      </div>
    </section>
  );
}
