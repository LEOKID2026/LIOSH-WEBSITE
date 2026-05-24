import { useEffect, useRef, useState } from "react";

const MOBILE_MQ = "(max-width: 640px)";

function pickViewport(sourcesByViewport) {
  if (!sourcesByViewport) return null;
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia(MOBILE_MQ).matches ? "mobile" : "desktop";
}

function resolveSources({ src, sources, sourcesByViewport }) {
  if (sourcesByViewport) {
    const vp = pickViewport(sourcesByViewport);
    const pack = sourcesByViewport[vp] || sourcesByViewport.desktop;
    if (!pack?.webm) return null;
    return {
      webm: pack.webm,
      mp4: pack.mp4 || null,
      poster: pack.poster || null,
      captions: pack.captionsHe || pack.captions || null,
      durationSec:
        typeof pack.durationSec === "number"
          ? pack.durationSec
          : undefined,
    };
  }
  if (sources?.webm || sources?.mp4) {
    return {
      webm: sources.webm,
      mp4: sources.mp4 || null,
      poster: null,
      captions: null,
      durationSec: undefined,
    };
  }
  if (src) {
    return {
      webm: src.endsWith(".webm") ? src : null,
      mp4: src.endsWith(".mp4") ? src : src,
      poster: null,
      captions: null,
      durationSec: undefined,
    };
  }
  return null;
}

/**
 * Tutorial video embed — lazy-mounted, no autoplay, dual viewport via sourcesByViewport.
 */
export default function HelpVideoEmbed({
  src,
  sources,
  sourcesByViewport,
  poster,
  captions,
  transcriptHe,
  durationSec,
}) {
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [activeVp, setActiveVp] = useState("desktop");

  useEffect(() => {
    if (!sourcesByViewport) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setActiveVp(mq.matches ? "mobile" : "desktop");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [sourcesByViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMounted(true);
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const resolved = resolveSources({
    src,
    sources,
    sourcesByViewport,
    poster,
    captions,
    durationSec,
  });

  if (!resolved?.webm && !resolved?.mp4) return null;

  const posterUrl =
    poster ||
    (sourcesByViewport
      ? sourcesByViewport[activeVp]?.poster || sourcesByViewport.desktop?.poster
      : null);

  const captionsUrl =
    captions ||
    (sourcesByViewport
      ? sourcesByViewport[activeVp]?.captionsHe ||
        sourcesByViewport[activeVp]?.captions ||
        null
      : null);

  const duration =
    durationSec ||
    (sourcesByViewport && typeof durationSec !== "number"
      ? sourcesByViewport[activeVp]?.durationSec
      : null);

  const label =
    activeVp === "mobile" ? "סרטון הדרכה (נייד)" : "סרטון הדרכה (מחשב)";

  return (
    <div ref={containerRef} className="my-6 space-y-3" dir="rtl">
      {mounted ? (
        <video
          controls
          preload="metadata"
          playsInline
          poster={posterUrl || undefined}
          className="w-full rounded-xl border border-white/10 bg-black"
          aria-label={label}
        >
          {resolved.mp4 ? <source src={resolved.mp4} type="video/mp4" /> : null}
          {resolved.webm ? (
            <source src={resolved.webm} type="video/webm" />
          ) : null}
          {captionsUrl ? (
            <track
              kind="captions"
              srcLang="he"
              src={captionsUrl}
              label="עברית"
              default
            />
          ) : null}
        </video>
      ) : (
        <div
          className="w-full aspect-video rounded-xl border border-white/10 bg-black/80 flex items-center justify-center text-white/60 text-sm"
          aria-hidden="true"
        >
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="w-full h-full object-contain rounded-xl opacity-90"
            />
          ) : (
            "סרטון הדרכה"
          )}
        </div>
      )}
      {duration ? (
        <p className="text-xs text-white/50">
          משך משוער: {Math.max(1, Math.round(duration / 60))} דקות
        </p>
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
