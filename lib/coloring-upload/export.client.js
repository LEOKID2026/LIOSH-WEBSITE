/**
 * Export helpers — download + in-page A4 print (upload coloring pages only).
 */

import { trackObjectUrl } from "./memory-manager.client.js";

export const COLORING_UPLOAD_DOWNLOAD_FILENAME = "leo-kids-coloring-page.png";

const PRINT_BODY_CLASSES = ["worksheet-print-mode", "worksheet-coloring-upload-print-mode"];

const PRINT_IMAGE_SELECTOR = "#coloring-upload-print-root .coloring-upload-print-image";

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

  const cleanup = () => {
    document.body.classList.remove(...PRINT_BODY_CLASSES);
    document.body.classList.remove(`coloring-upload-print-orientation-${orientation}`);
    document.body.style.overflow = prevOverflow;
    onDone?.();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
