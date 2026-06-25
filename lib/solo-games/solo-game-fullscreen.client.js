/** CSS class for mobile pseudo-fullscreen (no Fullscreen API). */
export const SOLO_GAME_PSEUDO_FULLSCREEN_CLASS = "solo-game-mobile-pseudo-fullscreen";

/** @type {boolean} Set when landscape start fires before #game-wrapper mounts. */
let pendingGameWrapperPseudoFullscreen = false;

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

  pendingGameWrapperPseudoFullscreen = false;
  return removed;
}

/** @param {HTMLElement | null | undefined} element */
export function togglePseudoFullscreen(element) {
  if (!element || !isMobileGameFullscreenEligible()) return false;
  if (isPseudoFullscreenActive(element)) {
    return exitPseudoFullscreen(element);
  }
  return enterPseudoFullscreen(element);
}

/**
 * Landscape mobile start: pseudo-fullscreen #game-wrapper when ready, else shell + pending.
 * @param {HTMLElement | null | undefined} element
 */
export function enterMobileGameFullscreenFromUserGesture(element) {
  if (!isMobileGameFullscreenEligible()) return Promise.resolve(false);
  if (typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches) {
    return Promise.resolve(false);
  }

  const gameWrapper = document.getElementById("game-wrapper");
  if (gameWrapper) {
    return Promise.resolve(enterPseudoFullscreen(gameWrapper));
  }

  pendingGameWrapperPseudoFullscreen = true;
  const shell =
    element ??
    document.querySelector("[data-solo-game-shell]") ??
    document.querySelector("[data-educational-game-shell]");
  if (shell) enterPseudoFullscreen(shell);
  return Promise.resolve(Boolean(shell));
}

/** Move pending pseudo-fullscreen from shell to #game-wrapper once the engine mounts. */
export function applyPendingPseudoFullscreenToGameWrapper() {
  if (!pendingGameWrapperPseudoFullscreen) return false;

  const gameWrapper = document.getElementById("game-wrapper");
  if (gameWrapper) {
    pendingGameWrapperPseudoFullscreen = false;
    exitPseudoFullscreen(document.querySelector("[data-solo-game-shell]"));
    exitPseudoFullscreen(document.querySelector("[data-educational-game-shell]"));
    return enterPseudoFullscreen(gameWrapper);
  }

  const educationalShell = document.querySelector("[data-educational-game-shell]");
  if (educationalShell) {
    pendingGameWrapperPseudoFullscreen = false;
    return enterPseudoFullscreen(educationalShell);
  }

  return false;
}

/**
 * @param {HTMLElement | null | undefined} element
 * Mobile solo games use pseudo-fullscreen only — no Fullscreen API.
 */
export function requestMobileGameFullscreen(element) {
  const target = element ?? document.getElementById("game-wrapper");
  return Promise.resolve(enterPseudoFullscreen(target));
}

/** Mobile solo games use pseudo-fullscreen only — no Fullscreen API. */
export function exitMobileGameFullscreen() {
  return Promise.resolve(exitPseudoFullscreen());
}
