import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeFinalCta({ isBright }) {
  const copy = HOMEPAGE_COPY.finalCta;
  const cls = getHomeTextClasses(isBright);

  return (
    <section
      className={`space-y-5 text-center ${cls.panel}`}
      data-testid="home-final-cta"
    >
      <h2 className={cls.sectionTitle}>{copy.title}</h2>
      <p className={`mx-auto max-w-2xl text-sm md:text-base ${cls.body}`}>{copy.text}</p>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
        <HomeCtaLink
          href={HOMEPAGE_ROUTES.parentLogin}
          label={copy.parentCta}
          className={getHomeBtnClasses("parents", isBright, "primary")}
          testId="home-final-parent-cta"
        />
        <HomeCtaLink
          href={HOMEPAGE_ROUTES.studentLogin}
          label={copy.kidsCta}
          className={getHomeBtnClasses("kids", isBright, "secondary")}
          testId="home-final-kids-cta"
        />
      </div>
    </section>
  );
}
