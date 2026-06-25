/** CSS class for mobile pseudo-fullscreen fallback when Fullscreen API fails. */
export const SOLO_GAME_PSEUDO_FULLSCREEN_CLASS = "solo-game-mobile-pseudo-fullscreen";

/** @type {boolean} Landscape start before #game-wrapper mounts — upgrade target when ready. */
let pendingGameWrapperFullscreen = false;

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

/** @returns {Element | null} */
export function getActiveFullscreenElement() {
  if (typeof document === "undefined") return null;
  return (
    document.fullscreenElement ||
    /** @type {Element | null} */ (document.webkitFullscreenElement) ||
    null
  );
}

/** @returns {boolean} */
export function isRealFullscreenActive() {
  return Boolean(getActiveFullscreenElement());
}

/** @param {HTMLElement | null | undefined} element */
export function isPseudoFullscreenActive(element) {
  if (typeof document === "undefined") return false;
  if (element) {
    return element.classList.contains(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS);
  }
  return Boolean(
    document.getElementById("game-wrapper")?.classList.contains(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS) ||
      document.querySelector("[data-solo-game-shell]")?.classList.contains(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS) ||
      document.querySelector("[data-educational-game-shell]")?.classList.contains(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS),
  );
}

/** Real Fullscreen API or pseudo fallback — any active mobile play fullscreen. */
export function isMobileGameFullscreenActive(element) {
  return isRealFullscreenActive() || isPseudoFullscreenActive(element);
}

/** @param {HTMLElement | null | undefined} element */
export function enterPseudoFullscreen(element) {
  if (!element || !isMobileGameFullscreenEligible()) return false;
  element.classList.add(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS);
  return true;
}

/**
 * Remove pseudo-fullscreen from one element, or from all known solo targets.
 * @param {HTMLElement | null | undefined} [element]
 */
export function exitPseudoFullscreen(element) {
  if (typeof document === "undefined") return false;

  let removed = false;
  const targets = element
    ? [element]
    : [
        document.getElementById("game-wrapper"),
        document.querySelector("[data-solo-game-shell]"),
        document.querySelector("[data-educational-game-shell]"),
      ].filter(Boolean);

  for (const target of targets) {
    if (target.classList.contains(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS)) {
      target.classList.remove(SOLO_GAME_PSEUDO_FULLSCREEN_CLASS);
      removed = true;
    }
  }

  return removed;
}

/**
 * @param {HTMLElement} element
 * @returns {Promise<boolean>}
 */
async function tryRequestRealFullscreen(element) {
  if (!element || !isMobileGameFullscreenEligible()) return false;

  const req =
    element.requestFullscreen?.bind(element) ||
    /** @type {(() => void | Promise<void>) | undefined} */ (element.webkitRequestFullscreen?.bind(element));

  if (!req) return false;

  try {
    const result = req();
    if (result && typeof result.then === "function") {
      await result;
    }
    return isRealFullscreenActive();
  } catch {
    return false;
  }
}

/**
 * Enter mobile play fullscreen: Fullscreen API first, pseudo CSS class only on failure.
 * @param {HTMLElement | null | undefined} element
 * @returns {Promise<boolean>}
 */
export async function requestMobileGameFullscreen(element) {
  const target = element ?? document.getElementById("game-wrapper");
  if (!target || !isMobileGameFullscreenEligible()) return false;

  const realOk = await tryRequestRealFullscreen(target);
  if (realOk) {
    exitPseudoFullscreen();
    return true;
  }

  return enterPseudoFullscreen(target);
}

/**
 * Exit mobile play fullscreen: real Fullscreen API first, then pseudo fallback cleanup.
 * @returns {Promise<boolean>}
 */
export async function exitMobileGameFullscreen() {
  pendingGameWrapperFullscreen = false;

  let exited = false;
  const active = getActiveFullscreenElement();

  if (active) {
    const exit =
      document.exitFullscreen?.bind(document) ||
      /** @type {(() => void | Promise<void>) | undefined} */ (document.webkitExitFullscreen?.bind(document));

    if (exit) {
      try {
        const result = exit();
        if (result && typeof result.then === "function") {
          await result;
        }
        exited = true;
      } catch {
        // ignore — still attempt pseudo cleanup below
      }
    }
  }

  if (exitPseudoFullscreen()) {
    exited = true;
  }

  return exited;
}

/** @param {HTMLElement | null | undefined} element */
export async function toggleMobileGameFullscreen(element) {
  if (!isMobileGameFullscreenEligible()) return false;

  if (isMobileGameFullscreenActive(element)) {
    return exitMobileGameFullscreen();
  }

  const target =
    element ??
    document.getElementById("game-wrapper") ??
    document.querySelector("[data-solo-game-shell]") ??
    document.querySelector("[data-educational-game-shell]");

  if (!target) return false;
  return requestMobileGameFullscreen(target);
}

/**
 * Landscape mobile start: real fullscreen on #game-wrapper when ready, else shell + pending.
 * @param {HTMLElement | null | undefined} element
 */
export function enterMobileGameFullscreenFromUserGesture(element) {
  if (!isMobileGameFullscreenEligible()) return Promise.resolve(false);
  if (typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches) {
    return Promise.resolve(false);
  }

  const gameWrapper = document.getElementById("game-wrapper");
  if (gameWrapper) {
    pendingGameWrapperFullscreen = false;
    return requestMobileGameFullscreen(gameWrapper);
  }

  pendingGameWrapperFullscreen = true;
  const shell =
    element ??
    document.querySelector("[data-solo-game-shell]") ??
    document.querySelector("[data-educational-game-shell]");
  if (!shell) return Promise.resolve(false);
  return requestMobileGameFullscreen(shell);
}

/** Move pending fullscreen from shell to #game-wrapper once the engine mounts. */
export function applyPendingPseudoFullscreenToGameWrapper() {
  if (!pendingGameWrapperFullscreen) return false;

  const gameWrapper = document.getElementById("game-wrapper");
  if (gameWrapper) {
    pendingGameWrapperFullscreen = false;
    exitPseudoFullscreen(document.querySelector("[data-solo-game-shell]"));
    exitPseudoFullscreen(document.querySelector("[data-educational-game-shell]"));
    void (async () => {
      if (isRealFullscreenActive()) {
        await exitMobileGameFullscreen();
      }
      await requestMobileGameFullscreen(gameWrapper);
    })();
    return true;
  }

  return false;
}

/** @deprecated Use toggleMobileGameFullscreen */
export function togglePseudoFullscreen(element) {
  void toggleMobileGameFullscreen(element);
  return isMobileGameFullscreenActive(element);
}
