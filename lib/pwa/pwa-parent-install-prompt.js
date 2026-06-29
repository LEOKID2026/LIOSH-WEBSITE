import { useCallback, useEffect, useState } from "react";
import { isCapacitorNative, isPwaInstalledStandalone } from "./pwa-install-prompt";
import { isParentPwaInstallActive } from "./pwa-install-mode";
import { logPwaInstallEvent } from "./pwa-install-debug";

/** @type {BeforeInstallPromptEvent | null} */
let deferredParentPrompt = null;

/** @type {Set<() => void>} */
const promptListeners = new Set();

/** @type {Set<() => void>} */
const installedListeners = new Set();

let captureInitialized = false;
let parentPromptConsumed = false;
let parentAppInstalledFired = false;

function notifyPromptListeners() {
  promptListeners.forEach((listener) => listener());
}

function notifyInstalledListeners() {
  installedListeners.forEach((listener) => listener());
}

/**
 * @param {Event} e
 */
function handleBeforeInstallPrompt(e) {
  if (typeof window === "undefined" || !isParentPwaInstallActive()) {
    return;
  }

  e.preventDefault();
  deferredParentPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
  logPwaInstallEvent("parent:beforeinstallprompt", {
    app: "P LEO KIDS",
    platforms: e.platforms,
  });
  notifyPromptListeners();
}

function handleAppInstalled() {
  if (!isParentPwaInstallActive()) return;
  parentAppInstalledFired = true;
  logPwaInstallEvent("parent:appinstalled", { app: "P LEO KIDS" });
  notifyInstalledListeners();
}

export function initParentPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;
  if (captureInitialized) return;
  if (isCapacitorNative()) return;

  captureInitialized = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
}

export function getDeferredParentInstallPrompt() {
  return deferredParentPrompt;
}

export function wasParentInstallPromptConsumed() {
  return parentPromptConsumed;
}

export function wasParentAppInstalledEventFired() {
  return parentAppInstalledFired;
}

/** @param {() => void} listener */
export function subscribeParentPwaInstallPrompt(listener) {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

/** @param {() => void} listener */
export function subscribeParentAppInstalled(listener) {
  installedListeners.add(listener);
  return () => {
    installedListeners.delete(listener);
  };
}

/**
 * @returns {Promise<{ outcome: string }>}
 */
export async function promptParentPwaInstall() {
  if (!deferredParentPrompt) {
    logPwaInstallEvent("parent:prompt-unavailable", { app: "P LEO KIDS" });
    return { outcome: "unavailable" };
  }

  const promptEvent = deferredParentPrompt;
  deferredParentPrompt = null;
  parentPromptConsumed = true;
  notifyPromptListeners();

  logPwaInstallEvent("parent:prompt-called", { app: "P LEO KIDS" });

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;

  logPwaInstallEvent("parent:userChoice", {
    app: "P LEO KIDS",
    outcome: choice.outcome,
    appinstalledAlready: parentAppInstalledFired,
  });

  notifyPromptListeners();
  return choice;
}

export function useParentPwaInstallPromptAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (isCapacitorNative()) {
      setAvailable(false);
      return undefined;
    }

    setAvailable(Boolean(deferredParentPrompt));
    return subscribeParentPwaInstallPrompt(() => {
      setAvailable(Boolean(deferredParentPrompt));
    });
  }, []);

  return available;
}

export function usePromptParentPwaInstall() {
  return useCallback(async () => promptParentPwaInstall(), []);
}

/** True only when the parent PWA is actually running standalone (not userChoice alone). */
export function isParentPwaInstalledStandalone() {
  if (!isPwaInstalledStandalone()) return false;
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/parent");
}
