/**
 * Public writing demo allowlist — shared UI + server constants.
 * @module data/writing/public-demo-allowlist
 */

/** Allowed task types for public writing demo generator. */
export const PUBLIC_WRITING_DEMO_TASK_TYPES = new Set(["trace", "copy", "quantity_match"]);

/** @type {Set<string>} */
export const PUBLIC_WRITING_DEMO_HEBREW_LETTERS = new Set(["א", "ב", "מ", "ש", "ך"]);

/** @type {Set<string>} */
export const PUBLIC_WRITING_DEMO_ENGLISH_PAIRS = new Set(["A", "a", "B", "b", "M", "m", "S", "s"]);

/** @type {Set<string>} */
export const PUBLIC_WRITING_DEMO_HEBREW_WORDS = new Set(["חתול", "כלב", "סוס"]);

/** @type {Set<string>} */
export const PUBLIC_WRITING_DEMO_ENGLISH_WORDS = new Set(["cat", "dog", "sun"]);

/** @type {Set<number>} */
export const PUBLIC_WRITING_DEMO_NUMBERS = new Set([0, 1, 2, 3, 5]);

/** @type {Set<string>} */
export const PUBLIC_WRITING_DEMO_PREWRITING_PATHS = new Set([
  "horizontal",
  "waves",
  "circles",
  "combo",
]);

/**
 * @typedef {Object} PublicWritingDemoPreset
 * @property {string} id
 * @property {import("../../lib/writing/writing-worksheet-types.js").WritingCategory} writingCategory
 * @property {string} titleHe
 * @property {Record<string, unknown>} request
 */

/** @type {PublicWritingDemoPreset[]} */
export const PUBLIC_WRITING_DEMO_PRESETS = [
  {
    id: "he-aleph-trace",
    writingCategory: "hebrew_letters",
    titleHe: "עקיבה — א",
    request: {
      writingCategory: "hebrew_letters",
      characters: ["א"],
      tracingMode: "trace",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    id: "he-bet-copy",
    writingCategory: "hebrew_letters",
    titleHe: "העתקה — ב",
    request: {
      writingCategory: "hebrew_letters",
      characters: ["ב"],
      tracingMode: "copy",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    id: "en-A-trace",
    writingCategory: "english_letters",
    titleHe: "Trace — A",
    request: {
      writingCategory: "english_letters",
      characters: ["A"],
      letterCase: "upper",
      tracingMode: "trace",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    id: "num-1-trace",
    writingCategory: "numbers",
    titleHe: "מספר 1",
    request: {
      writingCategory: "numbers",
      numberRange: { min: 1, max: 1 },
      numberMode: "digit",
      tracingMode: "trace",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    id: "num-qty-2",
    writingCategory: "numbers",
    titleHe: "כמות 2",
    request: {
      writingCategory: "numbers",
      numberRange: { min: 2, max: 2 },
      numberMode: "quantity_match",
      tracingMode: "trace",
      lineCount: 4,
      itemsPerLine: 1,
    },
  },
  {
    id: "pre-horizontal",
    writingCategory: "prewriting",
    titleHe: "קווים אופקיים",
    request: {
      writingCategory: "prewriting",
      prewritingPathId: "horizontal",
      tracingMode: "trace",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    id: "he-word-cat",
    writingCategory: "hebrew_words",
    titleHe: "מילה — חתול",
    request: {
      writingCategory: "hebrew_words",
      wordPackId: "custom",
      words: ["חתול"],
      tracingMode: "trace",
      lineCount: 4,
      itemsPerLine: 1,
    },
  },
  {
    id: "en-word-cat",
    writingCategory: "english_words",
    titleHe: "Word — cat",
    request: {
      writingCategory: "english_words",
      wordPackId: "custom",
      words: ["cat"],
      tracingMode: "trace",
      lineCount: 4,
      itemsPerLine: 1,
    },
  },
  {
    id: "personal-name",
    writingCategory: "personal_text",
    titleHe: "שם",
    request: {
      writingCategory: "personal_text",
      customText: "דני",
      customTextKind: "first_name",
      tracingMode: "trace",
      lineCount: 4,
      itemsPerLine: 1,
    },
  },
];

/**
 * @param {string} presetId
 * @returns {PublicWritingDemoPreset | null}
 */
export function getPublicWritingDemoPreset(presetId) {
  const key = String(presetId || "").trim();
  return PUBLIC_WRITING_DEMO_PRESETS.find((p) => p.id === key) || null;
}

export const PUBLIC_WRITING_DEMO_LIMITS = {
  maxPages: 1,
  maxLines: 6,
  maxCharsPerLine: 4,
  maxCustomNameLength: 30,
  maxCustomWordLength: 15,
  maxQuantityMatchValue: 3,
};
