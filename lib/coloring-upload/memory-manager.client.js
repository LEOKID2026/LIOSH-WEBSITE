/**
 * Central memory cleanup — lifecycle events, not only beforeunload.
 */

/** @type {Set<string>} */
const objectUrls = new Set();

/** @type {Set<ImageBitmap>} */
const bitmaps = new Set();

/** @type {Worker | null} */
let activeWorker = null;

/** @type {AbortController | null} */
let activeAbort = null;

/** @type {HTMLCanvasElement | null} */
let activeCanvas = null;

export function trackObjectUrl(url) {
  if (url && String(url).startsWith("blob:")) objectUrls.add(url);
}

export function trackImageBitmap(bitmap) {
  if (bitmap) bitmaps.add(bitmap);
}

export function trackCanvas(canvas) {
  activeCanvas = canvas;
}

export function setActiveWorker(_worker) {
  // Worker lifecycle owned by pipeline-client.client.js
}

export function setActiveAbort(controller) {
  activeAbort = controller;
}

export function abortActiveProcessing() {
  if (activeAbort) {
    try {
      activeAbort.abort();
    } catch {
      /* ignore */
    }
    activeAbort = null;
  }
}

/**
 * @param {{ keepWorker?: boolean }} [opts]
 */
export function cleanupColoringUploadMemory(opts = {}) {
  abortActiveProcessing();

  for (const url of objectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  objectUrls.clear();

  for (const bmp of bitmaps) {
    try {
      bmp.close();
    } catch {
      /* ignore */
    }
  }
  bitmaps.clear();

  if (activeCanvas) {
    try {
      activeCanvas.width = 0;
      activeCanvas.height = 0;
    } catch {
      /* ignore */
    }
    activeCanvas = null;
  }

  if (!opts.keepWorker) {
    activeWorker = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => cleanupColoringUploadMemory());
}
