import MarketingFeatureCard from "../marketing/MarketingFeatureCard";
import StudentPromoVideo from "../student/StudentPromoVideo";
import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { ACCENT, getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

function getKidsCardGradient(isBright, index) {
  const accent = ACCENT.kids;
  const list = isBright ? accent.cardGradientsBright : accent.cardGradientsClassic;
  return list[index % list.length];
}

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeKidsSection({ isBright }) {
  const copy = HOMEPAGE_COPY.kids;
  const cls = getHomeTextClasses(isBright);
  const cardTitleClass = `text-base font-bold leading-snug md:text-lg ${cls.heading}`;

  return (
    <section className="space-y-6 md:space-y-8" data-testid="home-kids-section">
      <div className="space-y-3 text-center md:text-right">
        <p
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${cls.kidsLabel}`}
        >
          {copy.label}
        </p>
        <h2 className={cls.sectionTitle}>{copy.title}</h2>
        <p className={`max-w-3xl text-sm leading-relaxed md:text-base lg:text-lg ${cls.body}`}>
          {copy.text}
        </p>
      </div>

      <StudentPromoVideo
        isBright={isBright}
        title={copy.videoTitle}
        description={copy.videoDescription}
        titleClassName={`text-lg font-bold md:text-xl ${cls.heading}`}
        className="py-2"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {copy.benefits.map((item, index) => (
          <MarketingFeatureCard
            key={item.title}
            title={item.title}
            text={item.text}
            gradientClass={getKidsCardGradient(isBright, index)}
            isBright={isBright}
            titleClassName={cardTitleClass}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <HomeCtaLink
          href={HOMEPAGE_ROUTES.studentLogin}
          label={copy.cta}
          className={getHomeBtnClasses("kids", isBright, "primary")}
          testId="home-kids-portal-cta"
        />
      </div>
    </section>
  );
}
