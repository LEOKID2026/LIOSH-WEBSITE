import { useCallback, useEffect, useState } from "react";

import {
  applyPendingPseudoFullscreenToGameWrapper,
  enterPseudoFullscreen,
  exitPseudoFullscreen,
  isMobileGameFullscreenEligible,
  isPseudoFullscreenActive,
  togglePseudoFullscreen,
} from "../../lib/solo-games/solo-game-fullscreen.client.js";

function isPortraitViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

function resolveFullscreenTarget(element) {
  if (element) return element;
  return (
    document.getElementById("game-wrapper") ??
    document.querySelector("[data-educational-game-shell]")
  );
}

/**
 * @param {string} gameKey
 */
export function soloGamePortraitDismissStorageKey(gameKey) {
  return `solo-game-portrait-dismiss:${gameKey}`;
}

function shouldShowPortraitPrompt(dismissKey, portraitDismissed) {
  if (!isMobileGameFullscreenEligible()) return false;
  if (!isPortraitViewport()) return false;
  if (portraitDismissed) return false;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dismissKey) === "1") {
    return false;
  }
  return true;
}

/**
 * Mobile pseudo-fullscreen + portrait recommendation for solo games.
 * Never uses the Fullscreen API — only toggles a CSS class on #game-wrapper.
 *
 * @param {{
 *   gameKey: string,
 *   gameRunning: boolean,
 *   showIntro?: boolean,
 *   gameOver?: boolean,
 * }} options
 */
export function useSoloGameMobileFullscreen({
  gameKey,
  gameRunning,
  showIntro = false,
  gameOver = false,
}) {
  const dismissKey = soloGamePortraitDismissStorageKey(gameKey);

  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [mobileEligible, setMobileEligible] = useState(false);
  const [showPortraitPrompt, setShowPortraitPrompt] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);

  const syncPseudoState = useCallback(() => {
    setIsPseudoFullscreen(isPseudoFullscreenActive());
    setMobileEligible(isMobileGameFullscreenEligible());
  }, []);

  useEffect(() => {
    syncPseudoState();
    window.addEventListener("resize", syncPseudoState);
    window.addEventListener("orientationchange", syncPseudoState);
    return () => {
      window.removeEventListener("resize", syncPseudoState);
      window.removeEventListener("orientationchange", syncPseudoState);
    };
  }, [syncPseudoState]);

  useEffect(() => {
    if (!gameRunning || showIntro || gameOver) return;
    if (applyPendingPseudoFullscreenToGameWrapper()) {
      syncPseudoState();
    }
  }, [gameRunning, showIntro, gameOver, syncPseudoState]);

  useEffect(() => {
    return () => {
      exitPseudoFullscreen();
    };
  }, []);

  useEffect(() => {
    if (!gameRunning || showIntro || gameOver) {
      setShowPortraitPrompt(false);
      return;
    }

    setShowPortraitPrompt(shouldShowPortraitPrompt(dismissKey, portraitDismissed));
  }, [gameRunning, showIntro, gameOver, portraitDismissed, dismissKey]);

  const syncPortraitPromptForRun = useCallback(() => {
    setPortraitDismissed(false);
    setShowPortraitPrompt(shouldShowPortraitPrompt(dismissKey, false));
  }, [dismissKey]);

  const dismissPortraitPrompt = useCallback(
    (persist) => {
      setPortraitDismissed(true);
      setShowPortraitPrompt(false);
      if (persist) sessionStorage.setItem(dismissKey, "1");
    },
    [dismissKey],
  );

  /** @param {HTMLElement | null | undefined} [element] */
  const enterFromUserGesture = useCallback(
    (element) => {
      if (!isMobileGameFullscreenEligible()) return;
      const target = resolveFullscreenTarget(element);
      if (enterPseudoFullscreen(target)) {
        setIsPseudoFullscreen(true);
      }
    },
    [],
  );

  const toggleFromUserGesture = useCallback(() => {
    if (!isMobileGameFullscreenEligible()) return;
    const target = resolveFullscreenTarget();
    if (!target) return;
    togglePseudoFullscreen(target);
    setIsPseudoFullscreen(isPseudoFullscreenActive());
  }, []);

  const showFullscreenButton =
    mobileEligible && gameRunning && !showIntro && !gameOver;

  return {
    isFullscreen: isPseudoFullscreen,
    isPseudoFullscreen,
    mobileEligible,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  };
}
