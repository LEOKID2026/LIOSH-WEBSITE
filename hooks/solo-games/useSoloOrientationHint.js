import { useCallback, useEffect, useState } from "react";

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function isPortrait() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * @param {"landscape-recommend" | "portrait-recommend" | null|undefined} hint
 * @param {boolean} mobile
 * @param {boolean} portrait
 */
export function getSoloOrientationHintMessage(hint, mobile, portrait) {
  if (!hint || !mobile) return null;
  if (hint === "landscape-recommend" && portrait) {
    return "מומלץ לסובב לרוחב לחוויה נוחה יותר";
  }
  if (hint === "portrait-recommend" && !portrait) {
    return "מומלץ לשחק לאורך לחוויה נוחה יותר";
  }
  return null;
}

/**
 * @param {"landscape-recommend" | "portrait-recommend" | null|undefined} orientationHint
 */
export function useSoloOrientationHint(orientationHint) {
  const [hintMessage, setHintMessage] = useState(null);

  const recalc = useCallback(() => {
    setHintMessage(
      getSoloOrientationHintMessage(orientationHint, isMobileDevice(), isPortrait())
    );
  }, [orientationHint]);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    window.visualViewport?.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
      window.visualViewport?.removeEventListener("resize", recalc);
    };
  }, [recalc]);

  return hintMessage;
}
