/**
 * Visual-size normalization for full_trace SVG glyphs.
 *
 * All families share viewBox 0 0 100 100, but stroke bounds differ.
 * Normalization targets a neutral visual height (~70% of frame at md),
 * not the small he-print band (~37%).
 *
 * scale = WRITING_GLYPH_TARGET_FILL_H / familyMedianFillH
 *
 * @module lib/writing/writing-glyph-visual-scale
 */

/** @typedef {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits"} WritingGlyphAssetGroup */

/** Neutral target: visible stroke height as fraction of glyph frame (md baseline). */
export const WRITING_GLYPH_TARGET_FILL_H = 0.7;

/** Median stroke bounding-box height as fraction of viewBox height (measured). */
export const WRITING_GLYPH_MEDIAN_FILL_H = /** @type {const} */ ({
  "he-print": 0.3688,
  "he-script": 0.4158,
  "en-upper": 0.822,
  "en-lower": 0.547,
  digits: 0.822,
});

/**
 * Scale applied inside the glyph frame for full_trace only.
 * Values > 1 enlarge he-print/he-script; values < 1 shrink en-upper/digits slightly.
 * @type {Record<WritingGlyphAssetGroup, number>}
 */
export const WRITING_GLYPH_VISUAL_SCALE_FULL_TRACE = {
  "he-print": 1.898,
  "he-script": 1.6835,
  "en-upper": 0.8516,
  "en-lower": 1.2797,
  digits: 0.8516,
};

/**
 * @param {WritingGlyphAssetGroup | string | null | undefined} group
 * @param {import("./writing-worksheet-types.js").TraceRenderMode | string | undefined} traceRenderMode
 * @returns {number}
 */
export function writingGlyphVisualScaleForGroup(group, traceRenderMode) {
  if (traceRenderMode !== "full_trace" && traceRenderMode !== "faint_model") {
    return 1;
  }
  return writingGlyphVisualScaleForFullTrace(group);
}

/**
 * @param {WritingGlyphAssetGroup | string | null | undefined} group
 * @returns {number}
 */
export function writingGlyphVisualScaleForFullTrace(group) {
  if (!group) return 1;
  return WRITING_GLYPH_VISUAL_SCALE_FULL_TRACE[/** @type {WritingGlyphAssetGroup} */ (group)] ?? 1;
}
