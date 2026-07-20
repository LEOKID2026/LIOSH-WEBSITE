/**
 * Browser capability detection — no degraded processing fallback.
 */

import { OPENCV_SCRIPT_URL } from "./constants.js";

/**
 * @returns {{
 *   supported: boolean,
 *   worker: boolean,
 *   offscreenCanvas: boolean,
 *   createImageBitmap: boolean,
 *   wasm: boolean,
 *   weakDevice: boolean,
 *   unsupportedReasonHe?: string,
 * }}
 */
export function detectColoringUploadCapabilities() {
  if (typeof window === "undefined") {
    return {
      supported: false,
      worker: false,
      offscreenCanvas: false,
      createImageBitmap: false,
      wasm: false,
      weakDevice: true,
      unsupportedReasonHe: "הכלי זמין רק בדפדפן.",
    };
  }

  const worker = typeof Worker !== "undefined";
  const offscreenCanvas = typeof OffscreenCanvas !== "undefined";
  const hasCreateImageBitmap = typeof createImageBitmap === "function";
  const wasm = typeof WebAssembly !== "undefined";
  const mem = /** @type {{ deviceMemory?: number }} */ (navigator).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const weakDevice =
    (typeof mem === "number" && mem > 0 && mem <= 3) ||
    (typeof cores === "number" && cores > 0 && cores <= 4);

  let supported = worker && hasCreateImageBitmap && wasm;
  let unsupportedReasonHe = "";

  if (!worker || !wasm || !hasCreateImageBitmap) {
    supported = false;
    unsupportedReasonHe =
      "הדפדפן שלך לא תומך בכלי זה. נסו Chrome, Edge או Safari עדכני.";
  }

  return {
    supported,
    worker,
    offscreenCanvas,
    createImageBitmap: hasCreateImageBitmap,
    wasm,
    weakDevice,
    unsupportedReasonHe: supported ? undefined : unsupportedReasonHe,
  };
}

let opencvLoadPromise = null;

/**
 * Lazy-load OpenCV (same-origin static GET).
 * @returns {Promise<boolean>}
 */
export function loadOpenCvScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.__coloringUploadCvReady) return Promise.resolve(true);
  if (opencvLoadPromise) return opencvLoadPromise;

  opencvLoadPromise = new Promise((resolve) => {
    const done = (ok) => resolve(!!ok);
    const existing = document.querySelector('script[data-coloring-opencv="1"]');
    if (existing) {
      if (window.__coloringUploadCvReady) return done(true);
      existing.addEventListener("load", () => done(window.__coloringUploadCvReady));
      existing.addEventListener("error", () => done(false));
      return;
    }
    const script = document.createElement("script");
    script.src = OPENCV_SCRIPT_URL;
    script.async = true;
    script.dataset.coloringOpencv = "1";
    script.onload = async () => {
      try {
        let cv = window.cv;
        if (!cv) return done(false);
        if (cv instanceof Promise) cv = await cv;
        else if (!cv.Mat) {
          await new Promise((resolve) => {
            if (cv.Mat) return resolve(undefined);
            const prev = cv.onRuntimeInitialized;
            cv.onRuntimeInitialized = () => {
              if (typeof prev === "function") prev();
              resolve(undefined);
            };
          });
          cv = window.cv instanceof Promise ? await window.cv : window.cv;
        }
        if (!cv?.Mat) return done(false);
        window.cv = cv;
        window.__coloringUploadCvReady = true;
        done(true);
      } catch {
        done(false);
      }
    };
    script.onerror = () => done(false);
    document.head.appendChild(script);
  });

  return opencvLoadPromise;
}
