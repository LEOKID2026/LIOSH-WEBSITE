/**
 * Writing worksheet shared constants — letters, paths, fonts, asset helpers.
 * @module lib/writing/writing-constants
 */

import { glyphAssetSlug } from "./glyph-asset-slugs.js";

export { resolveWritingTraceAssetUrl, resolveWritingStrokeOrderAssetUrl } from "./writing-trace-asset-resolver.js";
export { glyphAssetSlug } from "./glyph-asset-slugs.js";

/** 22 Hebrew letters + 5 final forms. */
export const HEBREW_LETTERS = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
  "י",
  "כ",
  "ל",
  "מ",
  "נ",
  "ס",
  "ע",
  "פ",
  "צ",
  "ק",
  "ר",
  "ש",
  "ת",
  "ך",
  "ם",
  "ן",
  "ף",
  "ץ",
];

export const HEBREW_FINALS = ["ך", "ם", "ן", "ף", "ץ"];

export const ENGLISH_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const ENGLISH_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");

/** 16 prewriting path ids — W-201 through W-216. */
export const PREWRITING_PATHS = [
  "horizontal",
  "vertical",
  "waves",
  "circles",
  "zigzag",
  "loops",
  "curves",
  "spirals",
  "peaks",
  "valleys",
  "slants",
  "bridges",
  "mountains",
  "tunnels",
  "combo",
  "mixed_shapes",
];

export const WRITING_FONT_FAMILY_HE_PRINT = "Noto Sans Hebrew";
export const WRITING_FONT_FAMILY_HE_SCRIPT = "Gveret Levin";
export const WRITING_FONT_FAMILY_EN_PRINT = "Noto Sans";
export const WRITING_FONT_FAMILY_EN_SCRIPT = "Patrick Hand";

/** @type {Record<"he" | "en", { print: string, script: string }>} */
export const WRITING_FONT_FAMILIES = {
  he: {
    print: WRITING_FONT_FAMILY_HE_PRINT,
    script: WRITING_FONT_FAMILY_HE_SCRIPT,
  },
  en: {
    print: WRITING_FONT_FAMILY_EN_PRINT,
    script: WRITING_FONT_FAMILY_EN_SCRIPT,
  },
};

const ASSET_ROOT = "/assets/writing";

/**
 * @param {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits"} group
 * @param {string} glyphId
 * @returns {string}
 */
export function strokePathAssetPath(group, glyphId) {
  const slug = glyphAssetSlug(glyphId);
  return `${ASSET_ROOT}/stroke-path/${group}/${slug}.svg`;
}

/**
 * @param {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits"} group
 * @param {string} glyphId
 * @returns {string}
 */
export function outlineGlyphAssetPath(group, glyphId) {
  const slug = glyphAssetSlug(glyphId);
  return `${ASSET_ROOT}/outline/${group}/${slug}.svg`;
}

/**
 * @param {string} pathId
 * @returns {string}
 */
export function prewritingPathAssetPath(pathId) {
  const safe = encodeURIComponent(String(pathId || "").trim());
  return `${ASSET_ROOT}/prewriting/${safe}.svg`;
}

/**
 * @param {string} illustrationId
 * @returns {string}
 */
export function illustrationAssetPath(illustrationId) {
  const safe = encodeURIComponent(String(illustrationId || "").trim());
  return `${ASSET_ROOT}/illustrations/${safe}.svg`;
}

export function fullTraceGlyphAssetPath(group, glyphId) {
  const slug = glyphAssetSlug(glyphId);
  return `${ASSET_ROOT}/full-trace/${group}/${slug}.svg`;
}

/**
 * @param {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits"} group
 * @param {string} glyphId
 * @returns {string}
 */
export function strokeOrderAssetPath(group, glyphId) {
  const slug = glyphAssetSlug(glyphId);
  return `${ASSET_ROOT}/stroke-order/${group}/${slug}.json`;
}

/**
 * @param {"he" | "en"} language
 * @param {"print" | "script"} scriptStyle
 * @returns {string}
 */
export function writingFontFamilyFor(language, scriptStyle) {
  const bucket = WRITING_FONT_FAMILIES[language] || WRITING_FONT_FAMILIES.he;
  return scriptStyle === "script" ? bucket.script : bucket.print;
}

/**
 * @param {string} letter
 * @returns {boolean}
 */
export function isHebrewLetter(letter) {
  return HEBREW_LETTERS.includes(String(letter || "").trim());
}

/**
 * @param {string} letter
 * @returns {boolean}
 */
export function isEnglishLetter(letter) {
  const ch = String(letter || "").trim();
  return ENGLISH_UPPER.includes(ch) || ENGLISH_LOWER.includes(ch);
}

/**
 * @param {string} pathId
 * @returns {boolean}
 */
export function isPrewritingPathId(pathId) {
  return PREWRITING_PATHS.includes(String(pathId || "").trim());
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function hebrewLetterRange(from, to) {
  const start = HEBREW_LETTERS.indexOf(from);
  const end = HEBREW_LETTERS.indexOf(to);
  if (start < 0 || end < 0) return [];
  if (start <= end) return HEBREW_LETTERS.slice(start, end + 1);
  return HEBREW_LETTERS.slice(end, start + 1);
}

/**
 * @param {"upper" | "lower" | "pairs"} letterCase
 * @param {string[]} characters
 * @returns {string[]}
 */
export function expandEnglishCharacters(letterCase, characters) {
  const base = characters.length ? characters : ENGLISH_UPPER;
  if (letterCase === "lower") {
    return base.map((c) => c.toLowerCase());
  }
  if (letterCase === "pairs") {
    return base.flatMap((c) => {
      const upper = c.toUpperCase();
      const lower = c.toLowerCase();
      return upper === lower ? [upper] : [upper, lower];
    });
  }
  return base.map((c) => c.toUpperCase());
}

import { HEBREW_WORD_PACKS as HE_WORD_PACKS_RAW, HEBREW_WORD_PACK_IDS } from "../../data/writing/word-packs.he.js";
import { ENGLISH_WORD_PACKS as EN_WORD_PACKS_RAW, ENGLISH_WORD_PACK_IDS } from "../../data/writing/word-packs.en.js";

/** @typedef {string | { word: string, illustrationId?: string }} WordPackEntry */

/**
 * @param {WordPackEntry} entry
 * @returns {string}
 */
export function wordPackEntryText(entry) {
  if (typeof entry === "string") return entry;
  return entry?.word || "";
}

/**
 * @param {Record<string, WordPackEntry[]>} packs
 * @param {string} packId
 * @returns {string[]}
 */
export function wordsFromPack(packs, packId) {
  const pack = packs[packId];
  if (!Array.isArray(pack)) return [];
  return pack.map(wordPackEntryText).filter(Boolean);
}

/** Word packs — full nikud from data/writing. */
export const HEBREW_WORD_PACKS = HE_WORD_PACKS_RAW;
export const ENGLISH_WORD_PACKS = EN_WORD_PACKS_RAW;
export { HEBREW_WORD_PACK_IDS, ENGLISH_WORD_PACK_IDS };

/** @type {Record<string, string>} */
export const WRITING_CATEGORY_LABELS_HE = {
  hebrew_letters: "אותיות בעברית",
  english_letters: "אותיות באנגלית",
  numbers: "מספרים",
  prewriting: "הכנה לכתיבה",
  hebrew_words: "מילים בעברית",
  english_words: "מילים באנגלית",
  personal_text: "שם וטקסט אישי",
  mixed: "משולב",
};
