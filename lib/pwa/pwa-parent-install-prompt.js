import { useCallback, useEffect, useState } from "react";
import { isCapacitorNative, isPwaInstalledStandalone } from "./pwa-install-prompt";

/** @type {BeforeInstallPromptEvent | null} */
let deferredParentPrompt = null;

/** @type {Set<() => void>} */
const listeners = new Set();

let captureInitialized = false;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * @param {Event} e
 */
function handleBeforeInstallPrompt(e) {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/parent/")) {
    return;
  }
  e.preventDefault();
  deferredParentPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
  notifyListeners();
}

export function initParentPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;
  if (captureInitialized) return;
  if (isCapacitorNative()) return;

  captureInitialized = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
}

export function getDeferredParentInstallPrompt() {
  return deferredParentPrompt;
}

/** @param {() => void} listener */
export function subscribeParentPwaInstallPrompt(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @returns {Promise<{ outcome: string }>}
 */
export async function promptParentPwaInstall() {
  if (!deferredParentPrompt) {
    return { outcome: "unavailable" };
  }

  const promptEvent = deferredParentPrompt;
  deferredParentPrompt = null;
  notifyListeners();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  notifyListeners();
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

/** True when running as installed parent PWA (standalone under /parent/). */
export function isParentPwaInstalledStandalone() {
  if (!isPwaInstalledStandalone()) return false;
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/parent");
}
