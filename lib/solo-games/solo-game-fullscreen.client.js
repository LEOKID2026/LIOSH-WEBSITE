/** @param {string | undefined} ua */
export function isMobileGameDevice(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

/** @param {HTMLElement | null | undefined} element */
export function requestMobileGameFullscreen(element) {
  if (!element || !isMobileGameDevice()) return Promise.resolve(false);

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
