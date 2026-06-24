/** Mobile / real-touch gate — desktop with mouse never passes. */
export function isMobileGameFullscreenEligible() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
}

/** @deprecated alias */
export function isMobileGameViewport() {
  return isMobileGameFullscreenEligible();
}

/** @param {HTMLElement | null | undefined} element */
export function enterMobileGameFullscreenFromUserGesture(element) {
  if (!isMobileGameFullscreenEligible()) return Promise.resolve(false);
  if (typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches) {
    return Promise.resolve(false);
  }
  const target = element ?? document.getElementById("game-wrapper");
  return requestMobileGameFullscreen(target);
}

/** @param {HTMLElement | null | undefined} element */
export function requestMobileGameFullscreen(element) {
  if (!element || !isMobileGameFullscreenEligible()) return Promise.resolve(false);

  const req =
    element.requestFullscreen?.bind(element) ||
    /** @type {(() => void) | undefined} */ (element.webkitRequestFullscreen?.bind(element));

  if (!req) return Promise.resolve(false);

  try {
    const result = req();
    if (result && typeof result.then === "function") {
      return result.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function exitMobileGameFullscreen() {
  if (typeof document === "undefined") return Promise.resolve(false);

  const active =
    document.fullscreenElement ||
    /** @type {Element | null} */ (document.webkitFullscreenElement);
  if (!active) return Promise.resolve(false);

  const exit =
    document.exitFullscreen?.bind(document) ||
    /** @type {(() => void) | undefined} */ (document.webkitExitFullscreen?.bind(document));

  if (!exit) return Promise.resolve(false);

  try {
    const result = exit();
    if (result && typeof result.then === "function") {
      return result.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}
