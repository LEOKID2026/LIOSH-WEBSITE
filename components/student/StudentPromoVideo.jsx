export const STUDENT_PROMO_DESKTOP_SRC = "/videos/promo/leo-kids-children-desktop.mp4";
export const STUDENT_PROMO_MOBILE_SRC = "/videos/promo/leo-kids-children-mobile.mp4";

/**
 * Responsive student promo — desktop 16:9 on md+, mobile 9:16 below md.
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
export default function StudentPromoVideo({
  desktopSrc = STUDENT_PROMO_DESKTOP_SRC,
  mobileSrc = STUDENT_PROMO_MOBILE_SRC,
  title = "גלו את עולם הילדים של ליאו",
  description = "צפו בסרטון קצר על תרגול, משחקים, קלפים והפתעות בדרך.",
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
    ? "md:hidden mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border"
    : "md:hidden mx-auto w-full max-w-[min(100%,320px)] overflow-hidden rounded-2xl border";

  return (
    <section
      className={`space-y-3 text-center ${className}`}
      aria-label={title}
      data-testid="student-promo-video"
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
          aria-label="סרטון ילדים — גרסת מחשב"
          data-testid="student-promo-video-desktop"
        >
          <source src={desktopSrc} type="video/mp4" />
        </video>
      </div>

      <div className={`${mobileWrapClass} ${frameClass}`}>
        <video
          className="block h-auto w-full aspect-[9/16] max-h-[min(55vh,480px)] bg-black object-contain mx-auto"
          controls
          playsInline
          preload="metadata"
          aria-label="סרטון ילדים — גרסת נייד"
          data-testid="student-promo-video-mobile"
        >
          <source src={mobileSrc} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
