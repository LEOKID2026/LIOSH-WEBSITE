import { useCallback, useEffect, useState } from "react";
import { isCapacitorNative, isPwaInstalledStandalone } from "./pwa-install-prompt";
import { isTeacherPwaInstallActive } from "./pwa-install-mode";
import { logPwaInstallEvent } from "./pwa-install-debug";

/** @type {BeforeInstallPromptEvent | null} */
let deferredTeacherPrompt = null;

/** @type {Set<() => void>} */
const promptListeners = new Set();

/** @type {Set<() => void>} */
const installedListeners = new Set();

let captureInitialized = false;
let teacherPromptConsumed = false;
let teacherAppInstalledFired = false;

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
  if (typeof window === "undefined" || !isTeacherPwaInstallActive()) {
    return;
  }

  e.preventDefault();
  deferredTeacherPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
  logPwaInstallEvent("teacher:beforeinstallprompt", {
    app: "T LEO KIDS",
    platforms: e.platforms,
  });
  notifyPromptListeners();
}

function handleAppInstalled() {
  if (!isTeacherPwaInstallActive()) return;
  teacherAppInstalledFired = true;
  logPwaInstallEvent("teacher:appinstalled", { app: "T LEO KIDS" });
  notifyInstalledListeners();
}

export function initTeacherPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;
  if (captureInitialized) return;
  if (isCapacitorNative()) return;

  captureInitialized = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
}

export function wasTeacherInstallPromptConsumed() {
  return teacherPromptConsumed;
}

export function wasTeacherAppInstalledEventFired() {
  return teacherAppInstalledFired;
}

/** @param {() => void} listener */
export function subscribeTeacherPwaInstallPrompt(listener) {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

/** @param {() => void} listener */
export function subscribeTeacherAppInstalled(listener) {
  installedListeners.add(listener);
  return () => {
    installedListeners.delete(listener);
  };
}

/**
 * @returns {Promise<{ outcome: string }>}
 */
export async function promptTeacherPwaInstall() {
  if (!deferredTeacherPrompt) {
    logPwaInstallEvent("teacher:prompt-unavailable", { app: "T LEO KIDS" });
    return { outcome: "unavailable" };
  }

  const promptEvent = deferredTeacherPrompt;
  deferredTeacherPrompt = null;
  teacherPromptConsumed = true;
  notifyPromptListeners();

  logPwaInstallEvent("teacher:prompt-called", { app: "T LEO KIDS" });

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;

  logPwaInstallEvent("teacher:userChoice", {
    app: "T LEO KIDS",
    outcome: choice.outcome,
    appinstalledAlready: teacherAppInstalledFired,
  });

  notifyPromptListeners();
  return choice;
}

export function useTeacherPwaInstallPromptAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (isCapacitorNative()) {
      setAvailable(false);
      return undefined;
    }

    setAvailable(Boolean(deferredTeacherPrompt));
    return subscribeTeacherPwaInstallPrompt(() => {
      setAvailable(Boolean(deferredTeacherPrompt));
    });
  }, []);

  return available;
}

export function usePromptTeacherPwaInstall() {
  return useCallback(async () => promptTeacherPwaInstall(), []);
}

/** True when the teacher PWA is running standalone under /teacher/. */
export function isTeacherPwaInstalledStandalone() {
  if (!isPwaInstalledStandalone()) return false;
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/teacher");
}
