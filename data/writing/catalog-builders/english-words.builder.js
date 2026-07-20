/**
 * English words ready catalog — W-240 to W-262 (23 entries).
 * W-241 = colors trace (public) per plan v3.1 §15.
 * Uses 11 catalog packs (excludes sight); sight appears as W-262 variant.
 * @module data/writing/catalog-builders/english-words.builder
 */

import { ENGLISH_WORD_PACK_IDS } from "../word-packs.en.js";
import { formatCatalogNumber, makeCatalogEntry } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {Record<string, string>} */
const PACK_TITLES = {
  colors: "Colors",
  animals: "Animals",
  family: "Family",
  food: "Food",
  school: "School",
  body: "Body",
  home: "Home",
  nature: "Nature",
  transport: "Transport",
  numbers: "Numbers",
  cvc: "CVC",
  sight: "Sight words",
};

/**
 * Primary pack traces W-240–W-250 (11 packs). W-241 = colors (public).
 * @type {Array<{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string }>}
 */
const ENGLISH_WORD_PRIMARY = [
  { catalogNum: 240, packId: "animals", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 241, packId: "colors", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 242, packId: "family", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 243, packId: "food", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 244, packId: "school", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 245, packId: "body", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 246, packId: "home", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 247, packId: "nature", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 248, packId: "transport", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 249, packId: "numbers", slugSuffix: "trace", titleSuffix: "Trace" },
  { catalogNum: 250, packId: "cvc", slugSuffix: "trace", titleSuffix: "Trace" },
];

/**
 * Variant entries W-251–W-262 (12).
 * @type {Array<{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string, tracingMode: string, lineCount?: number }>}
 */
const ENGLISH_WORD_VARIANTS = [
  { catalogNum: 251, packId: "colors", slugSuffix: "copy", titleSuffix: "Copy", tracingMode: "copy" },
  { catalogNum: 252, packId: "animals", slugSuffix: "copy", titleSuffix: "Copy", tracingMode: "copy" },
  { catalogNum: 253, packId: "family", slugSuffix: "trace-and-copy", titleSuffix: "Trace & copy", tracingMode: "trace_and_copy" },
  { catalogNum: 254, packId: "food", slugSuffix: "trace-and-copy", titleSuffix: "Trace & copy", tracingMode: "trace_and_copy" },
  { catalogNum: 255, packId: "school", slugSuffix: "review", titleSuffix: "Review", tracingMode: "trace_and_copy" },
  { catalogNum: 256, packId: "body", slugSuffix: "copy", titleSuffix: "Copy", tracingMode: "copy" },
  { catalogNum: 257, packId: "home", slugSuffix: "trace-and-copy", titleSuffix: "Trace & copy", tracingMode: "trace_and_copy" },
  { catalogNum: 258, packId: "nature", slugSuffix: "review", titleSuffix: "Review", tracingMode: "trace_and_copy" },
  { catalogNum: 259, packId: "transport", slugSuffix: "copy", titleSuffix: "Copy", tracingMode: "copy" },
  { catalogNum: 260, packId: "numbers", slugSuffix: "trace-and-copy", titleSuffix: "Trace & copy", tracingMode: "trace_and_copy" },
  { catalogNum: 261, packId: "cvc", slugSuffix: "review", titleSuffix: "Review", tracingMode: "trace_and_copy" },
  {
    catalogNum: 262,
    packId: "sight",
    slugSuffix: "trace",
    titleSuffix: "Trace",
    tracingMode: "trace",
    lineCount: 12,
  },
];

/**
 * @param {{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string, tracingMode?: string, lineCount?: number }} item
 * @returns {WritingCatalogBuilderEntry}
 */
function makeEnglishWordEntry(item) {
  const tracingMode =
    item.tracingMode ||
    (item.slugSuffix === "copy" ? "copy" : item.slugSuffix === "trace-and-copy" ? "trace_and_copy" : "trace");
  const slug =
    item.slugSuffix === "trace" && item.catalogNum !== 262
      ? `writing-en-words-${item.packId}-trace`
      : item.catalogNum === 262
        ? "writing-en-words-sight-trace"
        : `writing-en-words-${item.packId}-${item.slugSuffix}`;

  return makeCatalogEntry({
    slug,
    catalogNumber: formatCatalogNumber(item.catalogNum),
    writingCategory: "english_words",
    titleHe: `Words — ${PACK_TITLES[item.packId]} (${item.titleSuffix})`,
    seed: 1000 + item.catalogNum,
    builderConfig: {
      writingCategory: "english_words",
      wordPackId: item.packId,
      tracingMode,
      traceRenderMode: "faint_model",
      lineTemplate: "word_row",
      lineCount: item.lineCount || (item.packId === "sight" ? 12 : 8),
      itemsPerLine: 1,
      includeImage: true,
    },
  });
}

/** @type {WritingCatalogBuilderEntry[]} */
export const ENGLISH_WORDS_CATALOG = [
  ...ENGLISH_WORD_PRIMARY.map(makeEnglishWordEntry),
  ...ENGLISH_WORD_VARIANTS.map(makeEnglishWordEntry),
];

/** @type {string[]} */
export const ENGLISH_WORD_PACK_IDS_USED = ENGLISH_WORD_PACK_IDS;

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildEnglishWordsCatalog() {
  return ENGLISH_WORDS_CATALOG;
}
