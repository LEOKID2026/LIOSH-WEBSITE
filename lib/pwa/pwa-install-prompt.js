import { useEffect, useState, useCallback } from "react";
import { isParentPwaInstallActive } from "./pwa-install-mode";
import { logPwaInstallEvent } from "./pwa-install-debug";

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;

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
  if (typeof window !== "undefined" && isParentPwaInstallActive()) {
    return;
  }
  e.preventDefault();
  deferredPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
  logPwaInstallEvent("kids:beforeinstallprompt", {
    app: "LEO K",
    platforms: e.platforms,
  });
  notifyListeners();
}

export function isCapacitorNative() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
}

export function isPwaInstalledStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(window.navigator.standalone) ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Register a single global beforeinstallprompt listener as early as the app shell loads.
 * Skipped in Capacitor WebView (no PWA install API).
 */
export function initPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;
  if (captureInitialized) return;
  if (isCapacitorNative()) return;

  captureInitialized = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", () => {
    logPwaInstallEvent("kids:appinstalled", { app: "LEO K" });
  });
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

/** @param {() => void} listener */
export function subscribePwaInstallPrompt(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @returns {Promise<{ outcome: string }>}
 */
export async function promptPwaInstall() {
  if (!deferredPrompt) {
    logPwaInstallEvent("kids:prompt-unavailable", { app: "LEO K" });
    return { outcome: "unavailable" };
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  notifyListeners();

  logPwaInstallEvent("kids:prompt-called", { app: "LEO K" });

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;

  logPwaInstallEvent("kids:userChoice", {
    app: "LEO K",
    outcome: choice.outcome,
  });

  notifyListeners();
  return choice;
}

export function usePwaInstallPromptAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (isCapacitorNative()) {
      setAvailable(false);
      return undefined;
    }

    setAvailable(Boolean(deferredPrompt));
    return subscribePwaInstallPrompt(() => {
      setAvailable(Boolean(deferredPrompt));
    });
  }, []);

  return available;
}

export function usePromptPwaInstall() {
  const promptInstall = useCallback(async () => promptPwaInstall(), []);
  return promptInstall;
}
