import { useCallback, useEffect, useState } from "react";

import {
  applyPendingPseudoFullscreenToGameWrapper,
  exitMobileGameFullscreen,
  isMobileGameFullscreenActive,
  isMobileGameFullscreenEligible,
  isPseudoFullscreenActive,
  requestMobileGameFullscreen,
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
 * Mobile fullscreen + portrait recommendation for solo games.
 * Uses the Fullscreen API on #game-wrapper; pseudo CSS class is fallback only.
 * Fullscreen enter/exit from effects is limited to pending wrapper upgrade — prefer gesture helpers.
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [mobileEligible, setMobileEligible] = useState(false);
  const [showPortraitPrompt, setShowPortraitPrompt] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);

  const syncFullscreenState = useCallback(() => {
    setIsFullscreen(isMobileGameFullscreenActive());
    setIsPseudoFullscreen(isPseudoFullscreenActive());
    setMobileEligible(isMobileGameFullscreenEligible());
  }, []);

  useEffect(() => {
    syncFullscreenState();

    const onFullscreenChange = () => syncFullscreenState();

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    window.addEventListener("resize", syncFullscreenState);
    window.addEventListener("orientationchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", syncFullscreenState);
      window.removeEventListener("orientationchange", syncFullscreenState);
    };
  }, [syncFullscreenState]);

  useEffect(() => {
    if (!gameRunning || showIntro || gameOver) return;
    if (!applyPendingPseudoFullscreenToGameWrapper()) return;

    syncFullscreenState();
    const timer = window.setTimeout(syncFullscreenState, 400);
    return () => window.clearTimeout(timer);
  }, [gameRunning, showIntro, gameOver, syncFullscreenState]);

  useEffect(() => {
    return () => {
      void exitMobileGameFullscreen();
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
      if (!target) return;
      void requestMobileGameFullscreen(target).then(() => syncFullscreenState());
    },
    [syncFullscreenState],
  );

  const toggleFromUserGesture = useCallback(() => {
    if (!isMobileGameFullscreenEligible()) return;

    if (isMobileGameFullscreenActive()) {
      void exitMobileGameFullscreen().then(() => syncFullscreenState());
      return;
    }

    const target = resolveFullscreenTarget();
    if (!target) return;
    void requestMobileGameFullscreen(target).then(() => syncFullscreenState());
  }, [syncFullscreenState]);

  const showFullscreenButton =
    mobileEligible && gameRunning && !showIntro && !gameOver;

  return {
    isFullscreen,
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
