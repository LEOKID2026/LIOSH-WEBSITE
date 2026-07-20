/**
 * Glyph groups, font files, and glyph lists for asset build.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { glyphAssetSlug, isLegacyEncodedGlyphFilename } from "../../../lib/writing/glyph-asset-slugs.js";
import { ENGLISH_LOWER, ENGLISH_UPPER, HEBREW_LETTERS } from "../../../lib/writing/writing-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../../..");
export const FONTS_DIR = path.join(ROOT, "public", "fonts", "writing");
export const ASSETS_DIR = path.join(ROOT, "public", "assets", "writing");

/** @typedef {{ id: string, fontFile: string, glyphs: string[], fontSize?: number }} GlyphGroupConfig */

/** @type {GlyphGroupConfig[]} */
export const GLYPH_GROUPS = [
  {
    id: "he-print",
    fontFile: "NotoSansHebrew-Regular.ttf",
    glyphs: [...HEBREW_LETTERS],
    fontSize: 220,
  },
  {
    id: "he-script",
    fontFile: "GveretLevin-Regular.ttf",
    glyphs: [...HEBREW_LETTERS],
    fontSize: 220,
  },
  {
    id: "en-upper",
    fontFile: "NotoSans-Regular.ttf",
    glyphs: [...ENGLISH_UPPER],
    fontSize: 220,
  },
  {
    id: "en-lower",
    fontFile: "PatrickHand-Regular.ttf",
    glyphs: [...ENGLISH_LOWER],
    fontSize: 220,
  },
  {
    id: "digits",
    fontFile: "NotoSans-Regular.ttf",
    glyphs: "0123456789".split(""),
    fontSize: 220,
  },
];

export const VIEWBOX = 100;
export const RASTER_SIZE = 384;

/**
 * @param {string} group
 * @param {string} glyph
 */
export function glyphAssetBasename(_group, glyph) {
  return glyphAssetSlug(glyph);
}

/**
 * @param {string} group
 * @param {string} glyph
 */
export function outlineSvgPath(group, glyph) {
  return path.join(ASSETS_DIR, "outline", group, `${glyphAssetBasename(group, glyph)}.svg`);
}

/**
 * @param {string} group
 * @param {string} glyph
 */
export function strokePathSvgPath(group, glyph) {
  return path.join(ASSETS_DIR, "stroke-path", group, `${glyphAssetBasename(group, glyph)}.svg`);
}

/**
 * @param {string} group
 * @param {string} glyph
 */
export function fullTraceSvgPath(group, glyph) {
  return path.join(ASSETS_DIR, "full-trace", group, `${glyphAssetBasename(group, glyph)}.svg`);
}

/**
 * @param {string} group
 * @param {string} glyph
 */
export function strokeOrderJsonPath(group, glyph) {
  return path.join(ASSETS_DIR, "stroke-order", group, `${glyphAssetBasename(group, glyph)}.json`);
}
