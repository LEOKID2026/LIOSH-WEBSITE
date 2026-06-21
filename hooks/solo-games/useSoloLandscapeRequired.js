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
 * @param {boolean} requiresLandscape
 */
export function useSoloLandscapeRequired(requiresLandscape) {
  const [blocked, setBlocked] = useState(false);

  const recalc = useCallback(() => {
    if (!requiresLandscape) {
      setBlocked(false);
      return;
    }
    setBlocked(isMobileDevice() && isPortrait());
  }, [requiresLandscape]);

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

  return blocked;
}
