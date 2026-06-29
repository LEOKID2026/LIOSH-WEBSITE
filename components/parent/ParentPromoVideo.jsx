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
  className = "",
}) {
  const titleClass = isBright ? "text-slate-900" : "text-white";
  const textClass = isBright ? "text-slate-600" : "text-white/75";
  const frameClass = isBright
    ? "border-slate-200/80 bg-slate-900/5 shadow-sm"
    : "border-white/15 bg-black/30 shadow-lg shadow-black/20";

  const desktopWrapClass = compact
    ? "hidden md:block w-full overflow-hidden rounded-xl border"
    : "hidden md:block mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border";

  const mobileWrapClass = compact
    ? "md:hidden w-full overflow-hidden rounded-xl border"
    : "md:hidden mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border";

  return (
    <section
      className={`space-y-3 text-center ${className}`}
      aria-label={title}
      data-testid="parent-promo-video"
    >
      <h2 className={`text-lg font-bold md:text-xl ${titleClass}`}>{title}</h2>
      {description ? (
        <p className={`mx-auto max-w-xl text-sm leading-relaxed ${textClass}`}>{description}</p>
      ) : null}

      <div className={`${desktopWrapClass} ${frameClass}`}>
        <video
          className="block h-auto w-full aspect-video bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          aria-label="סרטון הורים — גרסת מחשב"
          data-testid="parent-promo-video-desktop"
        >
          <source src={desktopSrc} type="video/mp4" />
        </video>
      </div>

      <div className={`${mobileWrapClass} ${frameClass}`}>
        <video
          className="block h-auto w-full aspect-video bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          aria-label="סרטון הורים — גרסת מחשב (מובייל)"
          data-testid="parent-promo-video-mobile"
        >
          <source src={desktopSrc} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
