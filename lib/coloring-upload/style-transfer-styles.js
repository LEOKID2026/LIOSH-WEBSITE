/**
 * Shared art-style ids for coloring upload (client + server safe).
 */

export const COLORING_UPLOAD_STYLE_COLORING = "coloring";

/** @typedef {"coloring" | "comic" | "pencil" | "anime" | "pixar"} ColoringUploadStyleId */

/** @type {ColoringUploadStyleId[]} */
export const COLORING_UPLOAD_STYLE_IDS = [
  "coloring",
  "comic",
  "pencil",
  "anime",
  "pixar",
];

/** @type {Exclude<ColoringUploadStyleId, "coloring">[]} */
export const COLORING_UPLOAD_REPLICATE_STYLES = [
  "comic",
  "pencil",
  "anime",
  "pixar",
];

/**
 * @param {unknown} style
 * @returns {style is ColoringUploadStyleId}
 */
export function isColoringUploadStyleId(style) {
  return typeof style === "string" && COLORING_UPLOAD_STYLE_IDS.includes(style);
}

/**
 * @param {unknown} style
 * @returns {style is Exclude<ColoringUploadStyleId, "coloring">}
 */
export function isReplicateStyleId(style) {
  return typeof style === "string" && COLORING_UPLOAD_REPLICATE_STYLES.includes(style);
}
