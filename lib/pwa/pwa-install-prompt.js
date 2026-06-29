import { useEffect, useState, useCallback } from "react";
import { isStudentPwaInstallActive } from "./pwa-install-mode";
import { logPwaInstallEvent } from "./pwa-install-debug";

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;

/** @type {Set<() => void>} */
const promptListeners = new Set();

/** @type {Set<() => void>} */
const installedListeners = new Set();

let captureInitialized = false;
let studentPromptConsumed = false;
let studentAppInstalledFired = false;

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
  if (typeof window === "undefined" || !isStudentPwaInstallActive()) {
    return;
  }

  e.preventDefault();
  deferredPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
  logPwaInstallEvent("student:beforeinstallprompt", {
    app: "LEO KIDS",
    platforms: e.platforms,
  });
  notifyPromptListeners();
}

function handleAppInstalled() {
  if (!isStudentPwaInstallActive()) return;
  studentAppInstalledFired = true;
  logPwaInstallEvent("student:appinstalled", { app: "LEO KIDS" });
  notifyInstalledListeners();
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

/** True when the student PWA is running standalone under /student/. */
export function isStudentPwaInstalledStandalone() {
  if (!isPwaInstalledStandalone()) return false;
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/student");
}

export function initPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;
  if (captureInitialized) return;
  if (isCapacitorNative()) return;

  captureInitialized = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function wasStudentInstallPromptConsumed() {
  return studentPromptConsumed;
}

export function wasStudentAppInstalledEventFired() {
  return studentAppInstalledFired;
}

/** @param {() => void} listener */
export function subscribePwaInstallPrompt(listener) {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

/** @param {() => void} listener */
export function subscribeStudentAppInstalled(listener) {
  installedListeners.add(listener);
  return () => {
    installedListeners.delete(listener);
  };
}

/**
 * @returns {Promise<{ outcome: string }>}
 */
export async function promptPwaInstall() {
  if (!deferredPrompt) {
    logPwaInstallEvent("student:prompt-unavailable", { app: "LEO KIDS" });
    return { outcome: "unavailable" };
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  studentPromptConsumed = true;
  notifyPromptListeners();

  logPwaInstallEvent("student:prompt-called", { app: "LEO KIDS" });

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;

  logPwaInstallEvent("student:userChoice", {
    app: "LEO KIDS",
    outcome: choice.outcome,
    appinstalledAlready: studentAppInstalledFired,
  });

  notifyPromptListeners();
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
  return useCallback(async () => promptPwaInstall(), []);
}
