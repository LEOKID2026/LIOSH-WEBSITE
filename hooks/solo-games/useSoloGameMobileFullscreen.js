import { useCallback, useEffect, useState } from "react";

import {
  exitMobileGameFullscreen,
  isMobileGameFullscreenEligible,
  requestMobileGameFullscreen,
} from "../../lib/solo-games/solo-game-fullscreen.client.js";

function isPortraitViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

function resolveFullscreenTarget(element) {
  return element ?? document.getElementById("game-wrapper");
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
 * Fullscreen is never requested from effects or state watchers — only call
 * `enterFromUserGesture` / `toggleFromUserGesture` from a click/pointer handler.
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
  const [mobileEligible, setMobileEligible] = useState(false);
  const [showPortraitPrompt, setShowPortraitPrompt] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);

  useEffect(() => {
    const update = () => {
      const fullscreenEl =
        document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(fullscreenEl));
      setMobileEligible(isMobileGameFullscreenEligible());
    };

    update();

    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
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
  const enterFromUserGesture = useCallback((element) => {
    if (!isMobileGameFullscreenEligible()) return;
    void requestMobileGameFullscreen(resolveFullscreenTarget(element));
  }, []);

  const toggleFromUserGesture = useCallback(() => {
    if (!isMobileGameFullscreenEligible()) return;
    const active =
      document.fullscreenElement || document.webkitFullscreenElement;
    if (active) {
      void exitMobileGameFullscreen();
      return;
    }
    void requestMobileGameFullscreen(resolveFullscreenTarget());
  }, []);

  const showFullscreenButton =
    mobileEligible && gameRunning && !showIntro && !gameOver;

  return {
    isFullscreen,
    mobileEligible,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  };
}
