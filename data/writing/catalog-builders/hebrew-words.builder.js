/**
 * Hebrew words ready catalog — W-217 to W-239 (23 entries).
 * W-219 = animals trace (public) per plan v3.1 §15.
 * @module data/writing/catalog-builders/hebrew-words.builder
 */

import { HEBREW_WORD_PACKS } from "../word-packs.he.js";
import { formatCatalogNumber, makeCatalogEntry } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/**
 * Primary pack traces W-217–W-228 (12). W-218 = family copy so animals lands on W-219.
 * @type {Array<{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string, tracingMode?: string }>}
 */
const HEBREW_WORD_PRIMARY = [
  { catalogNum: 217, packId: "family", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 218, packId: "family", slugSuffix: "copy", titleSuffix: "העתקה" },
  { catalogNum: 219, packId: "animals", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 220, packId: "colors", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 221, packId: "food", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 222, packId: "home", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 223, packId: "school", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 224, packId: "nature", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 225, packId: "body", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 226, packId: "transport", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 227, packId: "holidays", slugSuffix: "trace", titleSuffix: "עקיבה" },
  { catalogNum: 228, packId: "daily", slugSuffix: "trace", titleSuffix: "עקיבה" },
];

/**
 * Variant / review entries W-229–W-239 (11).
 * @type {Array<{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string, tracingMode: string }>}
 */
const HEBREW_WORD_VARIANTS = [
  { catalogNum: 229, packId: "fruits_vegetables", slugSuffix: "trace", titleSuffix: "עקיבה", tracingMode: "trace" },
  { catalogNum: 230, packId: "animals", slugSuffix: "copy", titleSuffix: "העתקה", tracingMode: "copy" },
  { catalogNum: 231, packId: "colors", slugSuffix: "copy", titleSuffix: "העתקה", tracingMode: "copy" },
  { catalogNum: 232, packId: "food", slugSuffix: "trace-and-copy", titleSuffix: "עקיבה והעתקה", tracingMode: "trace_and_copy" },
  { catalogNum: 233, packId: "home", slugSuffix: "trace-and-copy", titleSuffix: "עקיבה והעתקה", tracingMode: "trace_and_copy" },
  { catalogNum: 234, packId: "school", slugSuffix: "review", titleSuffix: "חזרה", tracingMode: "trace_and_copy" },
  { catalogNum: 235, packId: "nature", slugSuffix: "review", titleSuffix: "חזרה", tracingMode: "trace_and_copy" },
  { catalogNum: 236, packId: "body", slugSuffix: "copy", titleSuffix: "העתקה", tracingMode: "copy" },
  { catalogNum: 237, packId: "transport", slugSuffix: "trace-and-copy", titleSuffix: "עקיבה והעתקה", tracingMode: "trace_and_copy" },
  { catalogNum: 238, packId: "holidays", slugSuffix: "review", titleSuffix: "חזרה", tracingMode: "trace_and_copy" },
  { catalogNum: 239, packId: "daily", slugSuffix: "review", titleSuffix: "חזרה", tracingMode: "trace_and_copy" },
];

/**
 * @param {{ catalogNum: number, packId: string, slugSuffix: string, titleSuffix: string, tracingMode?: string }} item
 * @returns {WritingCatalogBuilderEntry}
 */
function makeHebrewWordEntry(item) {
  const pack = HEBREW_WORD_PACKS[item.packId];
  const tracingMode = item.tracingMode || (item.slugSuffix === "copy" ? "copy" : "trace");
  const slug =
    item.slugSuffix === "trace"
      ? `writing-he-words-${item.packId}-trace`
      : `writing-he-words-${item.packId}-${item.slugSuffix}`;

  return makeCatalogEntry({
    slug,
    catalogNumber: formatCatalogNumber(item.catalogNum),
    writingCategory: "hebrew_words",
    titleHe: `מילים — ${pack.titleHe} (${item.titleSuffix})`,
    seed: 1000 + item.catalogNum,
    builderConfig: {
      writingCategory: "hebrew_words",
      wordPackId: item.packId,
      nikudMode: "word_nikud",
      tracingMode,
      traceRenderMode: "faint_model",
      lineTemplate: "word_row",
      lineCount: 8,
      itemsPerLine: 1,
      includeImage: true,
    },
  });
}

/** @type {WritingCatalogBuilderEntry[]} */
export const HEBREW_WORDS_CATALOG = [
  ...HEBREW_WORD_PRIMARY.map(makeHebrewWordEntry),
  ...HEBREW_WORD_VARIANTS.map(makeHebrewWordEntry),
];

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildHebrewWordsCatalog() {
  return HEBREW_WORDS_CATALOG;
}
