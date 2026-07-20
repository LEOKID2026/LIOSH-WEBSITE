/** Processing presets — Hebrew labels in worksheet-ui.he.js */

/** @typedef {'simple'|'balanced'|'detailed'} ColoringUploadPresetId */

/** @type {Record<ColoringUploadPresetId, object>} */
export const COLORING_UPLOAD_PRESETS = {
  simple: {
    id: "simple",
    bilateralDiameter: 9,
    bilateralSigmaColor: 75,
    bilateralSigmaSpace: 75,
    cannyLow: 80,
    cannyHigh: 160,
    adaptiveBlockSize: 15,
    adaptiveC: 8,
    morphCloseKernel: 5,
    morphOpenKernel: 3,
    minComponentArea: 120,
    dilateIterations: 2,
    claheClipLimit: 3,
    estimatedSeconds: 35,
  },
  balanced: {
    id: "balanced",
    bilateralDiameter: 7,
    bilateralSigmaColor: 60,
    bilateralSigmaSpace: 60,
    cannyLow: 50,
    cannyHigh: 120,
    adaptiveBlockSize: 11,
    adaptiveC: 5,
    morphCloseKernel: 3,
    morphOpenKernel: 2,
    minComponentArea: 40,
    dilateIterations: 1,
    claheClipLimit: 2.5,
    estimatedSeconds: 45,
  },
  detailed: {
    id: "detailed",
    bilateralDiameter: 5,
    bilateralSigmaColor: 50,
    bilateralSigmaSpace: 50,
    cannyLow: 30,
    cannyHigh: 90,
    adaptiveBlockSize: 9,
    adaptiveC: 3,
    morphCloseKernel: 2,
    morphOpenKernel: 1,
    minComponentArea: 16,
    dilateIterations: 0,
    claheClipLimit: 2,
    estimatedSeconds: 55,
  },
};

/**
 * @param {string} id
 */
export function getColoringUploadPreset(id) {
  return COLORING_UPLOAD_PRESETS[id] || COLORING_UPLOAD_PRESETS.balanced;
}
