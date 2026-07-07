import { useCallback, useEffect, useId, useRef } from "react";
import { usePromoVideoInlineRef } from "../../lib/promo/promo-video-inline-playback.client.js";

/**
 * Centered promo video lightbox — backdrop + Escape close, native controls + fullscreen.
 * @param {{ open: boolean, onClose: () => void, src: string, title: string }} props
 */
export default function PromoVideoModal({ open, onClose, src, title }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const videoElRef = useRef(null);
  const bindInline = usePromoVideoInlineRef();

  const setVideoRef = useCallback(
    (node) => {
      videoElRef.current = node;
      bindInline(node);
    },
    [bindInline]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    const video = videoElRef.current;
    if (!open) {
      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          /* seek unsupported while loading */
        }
      }
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      video?.play()?.catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, [open, src]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="promo-video-modal"
      onClick={onClose}
    >
      <div
        className="relative aspect-video w-[min(94vw,calc(75vh*16/9))] max-h-[75vh] max-w-[94vw] md:w-[min(80vw,calc(80vh*16/9))] md:max-h-[80vh] md:max-w-[80vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="absolute end-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/70 text-lg font-bold text-white shadow-lg transition hover:bg-black/90 sm:end-3 sm:top-3 sm:h-10 sm:w-10"
          aria-label="סגור"
          data-testid="promo-video-modal-close"
          onClick={onClose}
        >
          ✕
        </button>
        <video
          ref={setVideoRef}
          id={titleId}
          className="h-full w-full rounded-lg bg-black object-contain"
          controls
          playsInline
          disableRemotePlayback
          preload="auto"
          aria-label={title}
          data-testid="promo-video-modal-player"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
