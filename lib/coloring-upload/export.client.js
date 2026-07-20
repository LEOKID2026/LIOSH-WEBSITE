/**
 * Export helpers — download + in-page A4 print (upload coloring pages only).
 */

import { trackObjectUrl } from "./memory-manager.client.js";

export const COLORING_UPLOAD_DOWNLOAD_FILENAME = "leo-kids-coloring-page.png";

const PRINT_BODY_CLASSES = ["worksheet-print-mode", "worksheet-coloring-upload-print-mode"];

const PRINT_IMAGE_SELECTOR = "#coloring-upload-print-root .coloring-upload-print-image";

/** Keep print-mode classes from sticking forever if no return signal fires. */
const PRINT_CLEANUP_SAFETY_MS = 5 * 60 * 1000;

/**
 * Android / touch mobile: afterprint may fire when the OS print UI opens, before render.
 * @returns {boolean}
 */
function isMobilePrintEnvironment() {
  if (typeof navigator === "undefined") return false;
  if (/Android/i.test(navigator.userAgent)) return true;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  return coarsePointer && navigator.maxTouchPoints > 0;
}

/**
 * @param {number} [count]
 */
function waitAnimationFrames(count = 2) {
  return new Promise((resolve) => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve(undefined);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * @param {Blob} blob
 * @param {string} [filename]
 */
export function downloadBlob(blob, filename = COLORING_UPLOAD_DOWNLOAD_FILENAME) {
  const url = URL.createObjectURL(blob);
  trackObjectUrl(url);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param {Blob} finalA4Blob
 */
export function downloadUploadFinalA4(finalA4Blob) {
  downloadBlob(finalA4Blob, COLORING_UPLOAD_DOWNLOAD_FILENAME);
}

/**
 * @param {string} imageUrl
 * @param {number} [timeoutMs]
 */
export async function waitForUploadPrintImage(imageUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  /** @returns {HTMLImageElement | null} */
  const findReadyCandidate = () => {
    const img = document.querySelector(PRINT_IMAGE_SELECTOR);
    if (!(img instanceof HTMLImageElement)) return null;
    if (img.getAttribute("src") !== imageUrl) return null;
    return img;
  };

  while (Date.now() < deadline) {
    const img = findReadyCandidate();
    if (img) {
      if (!img.complete) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("PRINT_IMAGE_LOAD_TIMEOUT")), deadline - Date.now());
          img.onload = () => {
            clearTimeout(timer);
            resolve(undefined);
          };
          img.onerror = () => {
            clearTimeout(timer);
            reject(new Error("PRINT_IMAGE_LOAD_FAILED"));
          };
        });
      }

      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          /* decode may fail on older browsers; loaded img is still usable */
        }
      }

      return img;
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  throw new Error("PRINT_IMAGE_NOT_FOUND");
}

/**
 * Print only the portaled upload A4 document.
 * @param {string} imageUrl
 * @param {"portrait" | "landscape"} [orientation]
 * @param {() => void} [onDone]
 */
export async function printUploadColoringPage(imageUrl, orientation = "portrait", onDone) {
  if (typeof window === "undefined" || !imageUrl) return;

  await waitForUploadPrintImage(imageUrl);

  document.body.classList.add(...PRINT_BODY_CLASSES);
  document.body.classList.add(`coloring-upload-print-orientation-${orientation}`);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const mobilePrint = isMobilePrintEnvironment();
  let cleaned = false;
  let printFlowActive = true;
  let sawPrintMedia = false;
  let sawHiddenAfterPrint = false;
  let sawBlurAfterPrint = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let safetyTimer = null;

  /** @type {MediaQueryList | null} */
  let printMediaQuery = null;

  /** @type {(() => void) | null} */
  let onAfterPrint = null;
  /** @type {((event: MediaQueryListEvent) => void) | null} */
  let onPrintMediaChange = null;
  /** @type {(() => void) | null} */
  let onVisibilityChange = null;
  /** @type {(() => void) | null} */
  let onBlur = null;
  /** @type {(() => void) | null} */
  let onFocus = null;

  const removePrintListeners = () => {
    if (onAfterPrint) {
      window.removeEventListener("afterprint", onAfterPrint);
      onAfterPrint = null;
    }
    if (printMediaQuery && onPrintMediaChange) {
      if (typeof printMediaQuery.removeEventListener === "function") {
        printMediaQuery.removeEventListener("change", onPrintMediaChange);
      } else if (typeof printMediaQuery.removeListener === "function") {
        printMediaQuery.removeListener(onPrintMediaChange);
      }
      onPrintMediaChange = null;
    }
    printMediaQuery = null;
    if (onVisibilityChange) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      onVisibilityChange = null;
    }
    if (onBlur) {
      window.removeEventListener("blur", onBlur);
      onBlur = null;
    }
    if (onFocus) {
      window.removeEventListener("focus", onFocus);
      onFocus = null;
    }
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
  };

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    printFlowActive = false;
    removePrintListeners();
    document.body.classList.remove(...PRINT_BODY_CLASSES);
    document.body.classList.remove(`coloring-upload-print-orientation-${orientation}`);
    document.body.style.overflow = prevOverflow;
    onDone?.();
  };

  onAfterPrint = () => {
    if (!printFlowActive || cleaned) return;
    if (mobilePrint) return;
    cleanup();
  };

  onPrintMediaChange = (event) => {
    if (!printFlowActive || cleaned) return;
    if (event.matches) {
      sawPrintMedia = true;
      return;
    }
    if (sawPrintMedia) cleanup();
  };

  onVisibilityChange = () => {
    if (!printFlowActive || cleaned) return;
    if (document.hidden) {
      sawHiddenAfterPrint = true;
      return;
    }
    if (sawHiddenAfterPrint) cleanup();
  };

  onBlur = () => {
    if (!printFlowActive || cleaned) return;
    sawBlurAfterPrint = true;
  };

  onFocus = () => {
    if (!printFlowActive || cleaned || !sawBlurAfterPrint) return;
    cleanup();
  };

  window.addEventListener("afterprint", onAfterPrint);
  printMediaQuery = window.matchMedia?.("print") ?? null;
  if (printMediaQuery && onPrintMediaChange) {
    if (typeof printMediaQuery.addEventListener === "function") {
      printMediaQuery.addEventListener("change", onPrintMediaChange);
    } else if (typeof printMediaQuery.addListener === "function") {
      printMediaQuery.addListener(onPrintMediaChange);
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  safetyTimer = setTimeout(cleanup, PRINT_CLEANUP_SAFETY_MS);

  await waitAnimationFrames(2);
  window.print();
}
