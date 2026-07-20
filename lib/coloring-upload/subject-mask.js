import { SUBJECT_MASK_ALPHA_THRESHOLD } from "./constants.js";

/**
 * @param {ImageData} rgba
 * @param {number} [alphaThreshold]
 * @returns {ImageData}
 */
export function compositeSubjectOnWhite(rgba, alphaThreshold = SUBJECT_MASK_ALPHA_THRESHOLD) {
  const data = new Uint8ClampedArray(rgba.data.length);
  for (let i = 0; i < rgba.data.length; i += 4) {
    if (rgba.data[i + 3] >= alphaThreshold) {
      data[i] = rgba.data[i];
      data[i + 1] = rgba.data[i + 1];
      data[i + 2] = rgba.data[i + 2];
      data[i + 3] = 255;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  if (typeof ImageData !== "undefined") {
    return new ImageData(data, rgba.width, rgba.height);
  }
  return { width: rgba.width, height: rgba.height, data };
}

/**
 * @param {ImageData} rgba
 * @param {number} [alphaThreshold]
 * @returns {Uint8ClampedArray}
 */
export function extractBinaryMaskFromRgba(rgba, alphaThreshold = SUBJECT_MASK_ALPHA_THRESHOLD) {
  const mask = new Uint8ClampedArray(rgba.width * rgba.height);
  for (let i = 0, j = 0; i < rgba.data.length; i += 4, j += 1) {
    mask[j] = rgba.data[i + 3] >= alphaThreshold ? 255 : 0;
  }
  return mask;
}

/**
 * @param {Uint8ClampedArray} mask
 * @returns {number} 0–1 ratio of subject pixels
 */
export function computeSubjectMaskRatio(mask) {
  if (!mask.length) return 0;
  let on = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] >= 128) on += 1;
  }
  return on / mask.length;
}

/**
 * @param {Uint8ClampedArray | null} subjectMask
 * @returns {boolean}
 */
export function isUsableSubjectMask(subjectMask) {
  if (!subjectMask) return false;
  const ratio = computeSubjectMaskRatio(subjectMask);
  return ratio >= 0.02 && ratio <= 0.98;
}
