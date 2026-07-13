import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

const MOBILE_MQ = "(max-width: 640px)";
const PREVIEW_LABEL = "צפו בסרטון הדרכה";
const CLOSE_LABEL = "סגירת סרטון";

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
        typeof pack.durationSec === "number" ? pack.durationSec : undefined,
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

function PlayIcon() {
  return (
    <span
      className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-amber-500/90 text-black shadow-lg ring-2 ring-white/20"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7 ms-0.5" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/**
 * Compact tutorial video preview + modal player (no large inline video).
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
  const { SP } = useSharedShellUi();
  const [activeVp, setActiveVp] = useState("desktop");
  const [open, setOpen] = useState(false);
  const modalVideoRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!sourcesByViewport) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setActiveVp(mq.matches ? "mobile" : "desktop");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [sourcesByViewport]);

  const resolved = resolveSources({
    src,
    sources,
    sourcesByViewport,
    poster,
    captions,
    durationSec,
  });

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

  const closeModal = useCallback(() => {
    const el = modalVideoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeModal]);

  useEffect(() => {
    if (!open) return undefined;
    const el = modalVideoRef.current;
    if (!el) return undefined;
    el.muted = false;
    const t = window.setTimeout(() => {
      el.play().catch(() => {});
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!resolved?.webm && !resolved?.mp4) return null;

  const modalLabel =
    activeVp === "mobile" ? "סרטון הדרכה (נייד)" : "סרטון הדרכה (מחשב)";

  return (
    <div className="my-4 space-y-2 max-w-full" dir="rtl">
      <button
        type="button"
        data-help-video-preview="true"
        onClick={() => setOpen(true)}
        className={SP.videoPreview}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={PREVIEW_LABEL}
      >
        <span className="relative block w-full h-[9.5rem] sm:h-[11rem] max-h-[44vh]">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/80" />
          )}
          <span className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
            <PlayIcon />
            <span className={SP.videoPreviewLabel}>{PREVIEW_LABEL}</span>
          </span>
        </span>
      </button>

      {duration ? (
        <p className={SP.videoDuration}>
          משך משוער: {Math.max(1, Math.round(duration / 60))} דקות
        </p>
      ) : null}

      {transcriptHe ? (
        <details className={SP.videoTranscript}>
          <summary className={SP.videoTranscriptSummary}>תמלול</summary>
          <p className={SP.videoTranscriptText}>{transcriptHe}</p>
        </details>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          role="presentation"
          onClick={closeModal}
        >
          <div className={SP.videoModalOverlay} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modalLabel}
            className={SP.videoModalDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={SP.videoModalHeader}>
              <span className={SP.videoModalTitle}>{PREVIEW_LABEL}</span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeModal}
                className={SP.videoModalClose}
                aria-label={CLOSE_LABEL}
              >
                סגור
              </button>
            </div>
            <div className={SP.videoModalBody}>
              <video
                ref={modalVideoRef}
                controls
                playsInline
                controlsList="nofullscreen noremoteplayback"
                disablePictureInPicture
                preload="metadata"
                className="max-h-[min(70vh,560px)] w-full max-w-full rounded-lg"
                aria-label={modalLabel}
              >
                {resolved.mp4 ? (
                  <source src={resolved.mp4} type="video/mp4" />
                ) : null}
                {resolved.webm ? (
                  <source src={resolved.webm} type="video/webm" />
                ) : null}
                {captionsUrl ? (
                  <track
                    kind="captions"
                    srcLang="he"
                    src={captionsUrl}
                    label="עברית"
                  />
                ) : null}
              </video>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
