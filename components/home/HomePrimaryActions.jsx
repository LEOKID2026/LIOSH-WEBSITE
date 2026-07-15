import InstallAppChoiceButton from "../InstallAppChoiceButton";
import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { WORKSHEET_HUB_ENTRY_ENABLED } from "../../lib/worksheets/worksheet-hub-entry-enabled.js";
import { getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

/**
 * Primary CTAs appear only after hero explanation + video.
 * @param {{ isBright: boolean }} props
 */
export default function HomePrimaryActions({ isBright }) {
  const copy = HOMEPAGE_COPY.hero;
  const cls = getHomeTextClasses(isBright);
  const parentBtn = `${getHomeBtnClasses("parents", isBright, "primary")} min-h-12 whitespace-nowrap px-8 text-base md:min-h-[3.25rem] md:text-lg`;
  const kidsBtn = `${getHomeBtnClasses("kids", isBright, "secondary")} min-h-12 whitespace-nowrap px-8 text-base md:min-h-[3.25rem] md:text-lg`;
  const worksheetsBtn = `${getHomeBtnClasses("teachers", isBright, "secondary")} min-h-12 whitespace-nowrap px-8 text-base md:min-h-[3.25rem] md:text-lg`;

  const installBtnClass = isBright
    ? "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
    : "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white";

  return (
    <section
      className={`space-y-4 text-center ${cls.actionsBand}`}
      data-testid="home-primary-actions"
      aria-label="כניסה והרשמה"
    >
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:flex-nowrap lg:gap-4">
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

      <div className="flex justify-center pt-1">
        <InstallAppChoiceButton buttonClassName={installBtnClass} className="mt-0" />
      </div>

      <p className={`text-xs md:text-sm ${cls.muted}`}>{copy.infoLine}</p>
    </section>
  );
}

