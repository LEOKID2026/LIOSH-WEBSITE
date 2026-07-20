/**
 * Shared helpers for writing catalog builders.
 * @module data/writing/catalog-builders/_builder-utils
 */

/** @typedef {import("../../../lib/writing/writing-worksheet-types.js").WritingCategory} WritingCategory */

/**
 * @typedef {Object} WritingCatalogBuilderEntry
 * @property {string} slug
 * @property {string} catalogNumber
 * @property {WritingCategory} writingCategory
 * @property {string} titleHe
 * @property {boolean} publicAccess
 * @property {string} [gradeKey]
 * @property {string} [levelKey]
 * @property {number} [seed]
 * @property {boolean} [inkSave]
 * @property {Record<string, unknown>} builderConfig
 * @property {Record<string, unknown>} requestDefaults
 */

/** Exactly 25 public ready slugs — plan v3.1 §15. */
export const PUBLIC_ACCESS_SLUGS = new Set([
  "writing-he-aleph-trace-standard",
  "writing-he-bet-trace-standard",
  "writing-he-mem-trace-standard",
  "writing-he-shin-trace-standard",
  "writing-he-final-kaf-trace",
  "writing-he-group-aleph-he",
  "writing-en-upper-A-trace",
  "writing-en-pair-Mm-trace",
  "writing-num-1-trace",
  "writing-num-2-trace",
  "writing-num-3-trace",
  "writing-num-group-1-10",
  "writing-pre-horizontal",
  "writing-pre-waves",
  "writing-pre-circles",
  "writing-pre-combo",
  "writing-he-words-animals-trace",
  "writing-en-words-colors-trace",
  "writing-he-group-full-alphabet",
  "writing-en-group-all-upper",
  "writing-mixed-he-en-combo",
  "writing-mixed-num-1-10",
  "writing-mixed-pre-starter",
  "writing-mixed-review-g1",
  "writing-mixed-review-g2",
]);

/**
 * @param {number} n
 * @returns {string}
 */
export function formatCatalogNumber(n) {
  return `W-${String(n).padStart(3, "0")}`;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isPublicAccessSlug(slug) {
  return PUBLIC_ACCESS_SLUGS.has(slug);
}

/**
 * @param {Omit<WritingCatalogBuilderEntry, "publicAccess" | "requestDefaults"> & {
 *   publicAccess?: boolean,
 *   requestDefaults?: Record<string, unknown>,
 * }} params
 * @returns {WritingCatalogBuilderEntry}
 */
export function makeCatalogEntry(params) {
  const builderConfig = { ...params.builderConfig };
  return {
    slug: params.slug,
    catalogNumber: params.catalogNumber,
    writingCategory: params.writingCategory,
    titleHe: params.titleHe,
    publicAccess: params.publicAccess ?? isPublicAccessSlug(params.slug),
    ...(params.gradeKey ? { gradeKey: params.gradeKey } : {}),
    ...(params.levelKey ? { levelKey: params.levelKey } : {}),
    ...(params.seed !== undefined ? { seed: params.seed } : {}),
    ...(params.inkSave ? { inkSave: true } : {}),
    builderConfig,
    requestDefaults: params.requestDefaults ?? builderConfig,
  };
}

/** 22 Hebrew letters (non-final). */
export const HEBREW_LETTERS_22 = [
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
];

/** @type {Record<string, string>} */
export const HEBREW_LETTER_SLUG_NAMES = {
  א: "aleph",
  ב: "bet",
  ג: "gimel",
  ד: "dalet",
  ה: "he",
  ו: "vav",
  ז: "zayin",
  ח: "het",
  ט: "tet",
  י: "yod",
  כ: "kaf",
  ל: "lamed",
  מ: "mem",
  נ: "nun",
  ס: "samekh",
  ע: "ayin",
  פ: "pe",
  צ: "tsadi",
  ק: "qof",
  ר: "resh",
  ש: "shin",
  ת: "tav",
};

/** @type {Record<string, string>} */
export const HEBREW_FINAL_SLUG_NAMES = {
  ך: "final-kaf",
  ם: "final-mem",
  ן: "final-nun",
  ף: "final-pe",
  ץ: "final-tsadi",
};

export const HEBREW_FINALS = ["ך", "ם", "ן", "ף", "ץ"];

export const ENGLISH_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const ENGLISH_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
