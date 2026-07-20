/**
 * Client-side subject segmentation before OpenCV line extraction.
 * Uses @imgly/background-removal (lazy-loaded, 100% in-browser).
 */

import {
  compositeSubjectOnWhite,
  extractBinaryMaskFromRgba,
  isUsableSubjectMask,
} from "./subject-mask.js";

/** @type {Promise<typeof import("@imgly/background-removal")> | null} */
let modulePromise = null;

function loadSegmentationModule() {
  if (!modulePromise) {
    modulePromise = import("@imgly/background-removal");
  }
  return modulePromise;
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<Blob>}
 */
async function imageDataToPngBlob(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png");
  });
  return blob;
}

/**
 * @param {Blob} blob
 * @returns {Promise<ImageData>}
 */
async function blobToImageData(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D unavailable");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {ImageData} source
 * @param {number} width
 * @param {number} height
 * @returns {Promise<ImageData>}
 */
async function resizeImageData(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const tmp = document.createElement("canvas");
  tmp.width = source.width;
  tmp.height = source.height;
  tmp.getContext("2d")?.putImageData(source, 0, 0);
  ctx.drawImage(tmp, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * @param {ImageData} imageData
 * @param {{
 *   onProgress?: (progress: number) => void,
 *   signal?: AbortSignal,
 *   weakDevice?: boolean,
 * }} [opts]
 * @returns {Promise<{
 *   isolatedImageData: ImageData,
 *   subjectMask: Uint8ClampedArray | null,
 *   usedSegmentation: boolean,
 * }>}
 */
export async function segmentSubjectForColoring(imageData, opts = {}) {
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  try {
    const { removeBackground } = await loadSegmentationModule();
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    opts.onProgress?.(0.05);
    const inputBlob = await imageDataToPngBlob(imageData);

    const segmentedBlob = await removeBackground(inputBlob, {
      model: opts.weakDevice ? "isnet_quint8" : "isnet_fp16",
      device: opts.weakDevice ? "cpu" : "gpu",
      output: { format: "image/png", quality: 1 },
      progress: (_key, current, total) => {
        if (!total) return;
        opts.onProgress?.(0.1 + (current / total) * 0.85);
      },
    });

    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let segmented = await blobToImageData(segmentedBlob);
    if (segmented.width !== imageData.width || segmented.height !== imageData.height) {
      segmented = await resizeImageData(segmented, imageData.width, imageData.height);
    }

    const isolatedImageData = compositeSubjectOnWhite(segmented);
    const subjectMask = extractBinaryMaskFromRgba(segmented);
    opts.onProgress?.(1);

    if (!isUsableSubjectMask(subjectMask)) {
      return { isolatedImageData: imageData, subjectMask: null, usedSegmentation: false };
    }

    return { isolatedImageData, subjectMask, usedSegmentation: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.warn("[coloring-upload] Subject segmentation failed, continuing without mask:", err);
    return {
      isolatedImageData: imageData,
      subjectMask: null,
      usedSegmentation: false,
    };
  }
}

export { compositeSubjectOnWhite, extractBinaryMaskFromRgba, computeSubjectMaskRatio } from "./subject-mask.js";
