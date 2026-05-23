/**
 * Renders nothing when src is null (future-ready tutorial videos).
 */
export default function HelpVideoEmbed({ src, poster, captions, transcriptHe, durationSec }) {
  if (!src) return null;

  return (
    <div className="my-6 space-y-3" dir="rtl">
      <video
        controls
        preload="metadata"
        playsInline
        poster={poster || undefined}
        className="w-full rounded-xl border border-white/10 bg-black"
        aria-label="סרטון הדרכה"
      >
        <source src={src} type="video/mp4" />
        {captions ? (
          <track kind="captions" srcLang="he" src={captions} label="עברית" default />
        ) : null}
      </video>
      {durationSec ? (
        <p className="text-xs text-white/50">משך משוער: {Math.round(durationSec / 60)} דקות</p>
      ) : null}
      {transcriptHe ? (
        <details className="rounded-lg border border-white/10 bg-black/50 p-3 text-right">
          <summary className="cursor-pointer font-semibold text-amber-200 min-h-[44px] flex items-center">
            תמלול
          </summary>
          <p className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {transcriptHe}
          </p>
        </details>
      ) : null}
    </div>
  );
}
