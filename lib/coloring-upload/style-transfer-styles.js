/**
 * Shared art-style ids for coloring upload (client + server safe).
 */

export const COLORING_UPLOAD_STYLE_COLORING = "coloring";

/** @typedef {"coloring" | "comic" | "pencil" | "poster" | "pixar" | "watercolor" | "anime" | "storybook" | "pixel"} ColoringUploadStyleId */

/** @type {ColoringUploadStyleId[]} */
export const COLORING_UPLOAD_STYLE_IDS = [
  "coloring",
  "comic",
  "pencil",
  "poster",
  "pixar",
  "watercolor",
  "anime",
  "storybook",
  "pixel",
];

/** @type {Exclude<ColoringUploadStyleId, "coloring">[]} */
export const COLORING_UPLOAD_REPLICATE_STYLES = [
  "comic",
  "pencil",
  "poster",
  "pixar",
  "watercolor",
  "anime",
  "storybook",
  "pixel",
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
