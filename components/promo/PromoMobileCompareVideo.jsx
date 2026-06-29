import { usePromoVideoInlineRef } from "../../lib/promo/promo-video-inline-playback.client.js";

/**
 * Mobile-only promo clip for side-by-side comparison (bottom of page, not shown on md+).
 * @param {{
 *   mobileSrc: string,
 *   isBright?: boolean,
 *   className?: string,
 *   testId?: string,
 * }} props
 */
export default function PromoMobileCompareVideo({
  mobileSrc,
  isBright = false,
  className = "",
  testId = "promo-mobile-compare-video",
}) {
  const videoRef = usePromoVideoInlineRef();

  const frameClass = isBright
    ? "border-slate-200/80 bg-slate-900/5 shadow-sm"
    : "border-white/15 bg-black/30 shadow-lg shadow-black/20";
  const labelClass = isBright ? "text-slate-500" : "text-white/45";

  return (
    <section
      className={`md:hidden mt-6 space-y-2 text-center ${className}`}
      aria-label="גרסת מובייל לבדיקה"
      data-testid={testId}
    >
      <p className={`text-xs font-medium ${labelClass}`}>גרסת מובייל לבדיקה</p>
      <div
        className={`mx-auto w-full max-w-[min(100%,320px)] overflow-hidden rounded-xl border ${frameClass}`}
      >
        <video
          ref={videoRef}
          className="mx-auto block h-auto w-full max-h-[min(55vh,480px)] aspect-[9/16] bg-black object-contain"
          controls
          playsInline
          disableRemotePlayback
          preload="metadata"
          aria-label="סרטון מובייל לבדיקה"
          data-testid={`${testId}-player`}
        >
          <source src={mobileSrc} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
