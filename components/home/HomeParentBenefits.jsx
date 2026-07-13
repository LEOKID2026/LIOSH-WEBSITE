import MarketingFeatureCard from "../marketing/MarketingFeatureCard";
import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { ACCENT, getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeParentBenefits({ isBright }) {
  const copy = HOMEPAGE_COPY.parentBenefits;
  const cls = getHomeTextClasses(isBright);
  const accent = ACCENT.parents;
  const gradient = isBright ? accent.brightCardGradient : accent.classicCardGradient;
  const cardTitleClass = `text-base font-bold leading-snug md:text-lg ${cls.heading}`;

  return (
    <section className="space-y-5 md:space-y-6" data-testid="home-parent-benefits">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {copy.items.map((item) => (
          <MarketingFeatureCard
            key={item.title}
            title={item.title}
            text={item.text}
            gradientClass={gradient}
            isBright={isBright}
            titleClassName={cardTitleClass}
          />
        ))}
      </div>

      <p className={`text-center text-sm font-semibold leading-relaxed md:text-base ${cls.highlight}`}>
        {copy.highlight}
      </p>

      <div className="flex justify-center">
        <HomeCtaLink
          href={HOMEPAGE_ROUTES.parentLogin}
          label={copy.cta}
          className={getHomeBtnClasses("parents", isBright, "primary")}
          testId="home-parent-portal-cta"
        />
      </div>
    </section>
  );
}
