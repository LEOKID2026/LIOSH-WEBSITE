import { useCallback, useEffect, useRef } from "react";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Inline-only promo playback on mobile — no programmatic fullscreen or orientation lock.
 * Native controls fullscreen remains available via the browser video UI.
 * @param {HTMLVideoElement} video
 * @returns {() => void}
 */
export function bindPromoVideoInlinePlayback(video) {
  if (!video || typeof window === "undefined") return () => {};

  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("x5-playsinline", "true");
  video.setAttribute("x5-video-player-type", "h5");
  video.setAttribute("x5-video-player-fullscreen", "false");

  if (isMobileViewport() && "webkitEnterFullscreen" in video) {
    video.webkitEnterFullscreen = () => {};
  }

  const onPlay = () => {
    if (!isMobileViewport()) return;
    if (typeof video.webkitSetPresentationMode !== "function") return;
    try {
      video.webkitSetPresentationMode("inline");
    } catch {
      /* inline presentation not supported */
    }
  };

  video.addEventListener("play", onPlay);

  return () => {
    video.removeEventListener("play", onPlay);
  };
}

/** Ref callback for promo `<video>` — binds inline playback once per element. */
export function usePromoVideoInlineRef() {
  const cleanupRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return useCallback((node) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (node) {
      cleanupRef.current = bindPromoVideoInlinePlayback(node);
    }
  }, []);
}
