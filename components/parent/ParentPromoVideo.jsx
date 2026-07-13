import PromoVideoClickablePreview from "../promo/PromoVideoClickablePreview.jsx";

export const PARENT_PROMO_DESKTOP_SRC = "/videos/promo/leo-kids-parent-desktop.mp4";
export const PARENT_PROMO_MOBILE_SRC = "/videos/promo/leo-kids-parent-mobile.mp4";

/**
 * Responsive parent promo — desktop 16:9 on md+; below md uses the same desktop asset in 16:9 (not the mobile file).
 * CSS-only visibility avoids hydration mismatch (both tags in DOM, one hidden).
 * @param {{
 *   desktopSrc?: string,
 *   mobileSrc?: string,
 *   title?: string,
 *   description?: string,
 *   isBright?: boolean,
 *   compact?: boolean,
 *   compactHome?: boolean,
 *   featured?: boolean,
 *   embedded?: boolean,
 *   className?: string,
 * }} props
 */
export default function ParentPromoVideo({
  desktopSrc = PARENT_PROMO_DESKTOP_SRC,
  mobileSrc = PARENT_PROMO_MOBILE_SRC,
  title = "הכירו את ליאו קידס",
  description = "צפו בסרטון קצר שמציג את הכלים להורים ואת חוויית הלמידה לילדים.",
  isBright = false,
  compact = false,
  compactHome = false,
  featured = false,
  embedded = false,
  className = "",
}) {
  const titleClass = isBright ? "text-slate-900" : "text-white";
  const textClass = isBright ? "text-slate-600" : "text-white/75";
  const frameClass = isBright
    ? "border-slate-200/80 bg-slate-900/5 shadow-sm"
    : "border-white/15 bg-black/30 shadow-lg shadow-black/20";

  if (compactHome) {
    return (
      <section
        className={`shrink min-w-0 ${className}`}
        aria-label={title}
        data-testid="parent-promo-video"
      >
        <PromoVideoClickablePreview
          src={desktopSrc}
          wrapClassName={`w-[min(46vw,180px)] md:w-[clamp(280px,22vw,360px)] aspect-video overflow-hidden rounded-xl border ${frameClass}`}
          videoClassName="h-full w-full bg-black object-contain"
          ariaLabel={title}
          testId="parent-promo-video-compact-home"
        />
      </section>
    );
  }

  const wrapClass = featured
    ? "w-full overflow-hidden rounded-2xl border shadow-xl lg:rounded-3xl"
    : compact
    ? "w-full overflow-hidden rounded-xl border"
    : "mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border";

  const titleSize = embedded
    ? "text-lg font-black md:text-xl"
    : featured
    ? "text-xl font-black md:text-2xl lg:text-3xl"
    : "text-lg font-bold md:text-xl";
  const descSize = embedded
    ? "text-sm md:text-base"
    : featured
    ? "max-w-3xl text-sm md:text-base lg:text-lg"
    : "max-w-xl text-sm";

  return (
    <section
      className={`space-y-2 text-right ${featured ? "space-y-3 md:space-y-4" : ""} ${className}`}
      aria-label={title}
      data-testid="parent-promo-video"
    >
      <h2 className={`${titleSize} ${titleClass}`}>{title}</h2>
      {description ? (
        <p className={`leading-relaxed ${descSize} ${textClass}`}>{description}</p>
      ) : null}

      <PromoVideoClickablePreview
        src={desktopSrc}
        wrapClassName={`${wrapClass} ${frameClass}`}
        videoClassName="block h-auto w-full aspect-video bg-black object-contain"
        ariaLabel="סרטון הורים"
        testId="parent-promo-video-desktop"
      />
    </section>
  );
}
