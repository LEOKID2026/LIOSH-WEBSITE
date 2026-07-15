import PromoVideoClickablePreview from "../promo/PromoVideoClickablePreview.jsx";
import { PARENT_PROMO_DESKTOP_SRC } from "../parent/ParentPromoVideo";
import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { WORKSHEET_HUB_ENTRY_ENABLED } from "../../lib/worksheets/worksheet-hub-entry-enabled.js";
import { getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

function HeroButtons({ isBright, className = "" }) {
  const copy = HOMEPAGE_COPY.hero;
  const parentBtn = `${getHomeBtnClasses("parents", isBright, "primary")} min-h-12 w-full whitespace-nowrap px-6 text-base font-bold sm:w-auto md:min-h-[3.25rem] md:px-8 md:text-lg`;
  const kidsBtn = `${getHomeBtnClasses("kids", isBright, "secondary")} min-h-12 w-full whitespace-nowrap px-6 text-base font-bold sm:w-auto md:min-h-[3.25rem] md:px-8 md:text-lg`;
  const worksheetsBtn = `${getHomeBtnClasses("teachers", isBright, "secondary")} min-h-12 w-full whitespace-nowrap px-6 text-base font-bold sm:w-auto md:min-h-[3.25rem] md:px-8 md:text-lg`;

  return (
    <div className={`flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap ${className}`}>
      <HomeCtaLink
        href={HOMEPAGE_ROUTES.parentLogin}
        label={copy.parentCta}
        className={parentBtn}
        testId="home-hero-parent-cta"
      />
      <HomeCtaLink
        href={HOMEPAGE_ROUTES.studentLogin}
        label={copy.kidsCta}
        className={kidsBtn}
        testId="home-hero-kids-cta"
      />
      {WORKSHEET_HUB_ENTRY_ENABLED ? (
        <HomeCtaLink
          href={HOMEPAGE_ROUTES.worksheets}
          label={copy.worksheetsCta}
          className={worksheetsBtn}
          testId="home-hero-worksheets-cta"
        />
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="home-hero-worksheets-cta"
          className={`${worksheetsBtn} cursor-not-allowed opacity-55`}
        >
          {copy.worksheetsCta}
        </button>
      )}
    </div>
  );
}

/**
 * Simple marketing hero — text + buttons | large parent video. No flow diagrams.
 * @param {{ isBright: boolean }} props
 */
export default function HomeHero({ isBright }) {
  const copy = HOMEPAGE_COPY.hero;
  const cls = getHomeTextClasses(isBright);
  const titleClass = isBright ? "text-sky-900" : "text-sky-100";

  const videoWrap = isBright
    ? "w-full overflow-hidden rounded-2xl shadow-xl shadow-sky-300/35 ring-1 ring-white/50 lg:rounded-3xl lg:shadow-2xl"
    : "w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/45 ring-1 ring-white/10 lg:rounded-3xl";

  return (
    <section data-testid="home-hero" className="w-full">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-12">
          <div className="flex flex-col gap-4 text-center lg:gap-5 lg:text-right">
            <p
              className={`inline-flex items-center justify-center self-center rounded-full px-4 py-1.5 text-xs font-bold tracking-wide md:text-sm lg:self-start ${cls.heroBadge}`}
            >
              {copy.badge}
            </p>

            <h1
              className={`text-[1.9rem] font-black leading-[1.1] md:text-4xl lg:text-[3rem] ${titleClass}`}
            >
              {copy.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className={`text-sm leading-relaxed md:text-base lg:text-lg ${cls.body}`}>
              {copy.subtitle}
            </p>

            <p
              className={`text-xs font-semibold md:text-sm ${cls.muted}`}
              data-testid="home-hero-reinforcement"
            >
              {copy.reinforcement}
            </p>

            <HeroButtons isBright={isBright} className="mt-1 justify-center lg:justify-start" />
          </div>

          <div className="w-full" data-testid="home-hero-video">
            <PromoVideoClickablePreview
              src={PARENT_PROMO_DESKTOP_SRC}
              wrapClassName={videoWrap}
              videoClassName="block h-auto w-full aspect-video bg-black object-contain"
              ariaLabel="סרטון הורים"
              testId="parent-promo-video-desktop"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
