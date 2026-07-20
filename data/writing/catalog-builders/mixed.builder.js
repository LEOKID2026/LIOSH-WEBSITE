/**
 * Mixed internal ready catalog — W-263 to W-270 (8 entries).
 * @module data/writing/catalog-builders/mixed.builder
 */

import { formatCatalogNumber, makeCatalogEntry } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {Array<{ catalogNum: number, slug: string, titleHe: string, gradeKey?: string, builderConfig: Record<string, unknown> }>} */
const MIXED_ENTRIES = [
  {
    catalogNum: 263,
    slug: "writing-mixed-he-alphabet-intro",
    titleHe: "היכרות אלף־בית",
    gradeKey: "g1",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["א", "ב", "ג", "ד", "ה"],
      tracingMode: "trace_and_copy",
      lineCount: 6,
      itemsPerLine: 3,
    },
  },
  {
    catalogNum: 264,
    slug: "writing-mixed-en-alphabet-intro",
    titleHe: "היכרות A–Z",
    gradeKey: "g1",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["A", "B", "C", "D", "E"],
      letterCase: "upper",
      tracingMode: "trace_and_copy",
      lineCount: 6,
      itemsPerLine: 3,
    },
  },
  {
    catalogNum: 265,
    slug: "writing-mixed-num-1-10",
    titleHe: "מספרים 1–10",
    gradeKey: "g1",
    builderConfig: {
      writingCategory: "mixed",
      numberRange: { min: 1, max: 10 },
      numberMode: "digit",
      tracingMode: "trace",
      lineCount: 6,
      itemsPerLine: 5,
    },
  },
  {
    catalogNum: 266,
    slug: "writing-mixed-pre-starter",
    titleHe: "הכנה לכתיבה",
    gradeKey: "prek",
    builderConfig: {
      writingCategory: "mixed",
      prewritingPathId: "horizontal",
      tracingMode: "trace",
      lineTemplate: "prewriting_path",
      lineCount: 6,
      itemsPerLine: 1,
    },
  },
  {
    catalogNum: 267,
    slug: "writing-mixed-he-en-combo",
    titleHe: "עברית ואנגלית",
    gradeKey: "g1",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["א", "ב", "A", "B"],
      tracingMode: "trace_and_copy",
      lineCount: 6,
      itemsPerLine: 4,
    },
  },
  {
    catalogNum: 268,
    slug: "writing-mixed-review-g1",
    titleHe: "חזרה כיתה א׳",
    gradeKey: "g1",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["א", "ב", "מ", "1", "2"],
      tracingMode: "trace_and_copy",
      lineCount: 6,
      itemsPerLine: 5,
    },
  },
  {
    catalogNum: 269,
    slug: "writing-mixed-review-g2",
    titleHe: "חזרה כיתה ב׳",
    gradeKey: "g2",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["ש", "ר", "C", "D", "3", "4"],
      tracingMode: "trace_and_copy",
      lineCount: 6,
      itemsPerLine: 6,
    },
  },
  {
    catalogNum: 270,
    slug: "writing-mixed-full-handwriting",
    titleHe: "תרגול כתיבה מלא",
    gradeKey: "g2",
    builderConfig: {
      writingCategory: "mixed",
      characters: ["א", "ב", "A", "B", "1", "2"],
      tracingMode: "trace_and_copy",
      lineCount: 8,
      itemsPerLine: 6,
    },
  },
];

/** @type {WritingCatalogBuilderEntry[]} */
export const MIXED_CATALOG = MIXED_ENTRIES.map((entry) =>
  makeCatalogEntry({
    slug: entry.slug,
    catalogNumber: formatCatalogNumber(entry.catalogNum),
    writingCategory: "mixed",
    titleHe: entry.titleHe,
    gradeKey: entry.gradeKey,
    seed: 1000 + entry.catalogNum,
    builderConfig: {
      scriptStyle: "print",
      traceRenderMode: "faint_model",
      lineTemplate: "trace_row",
      ...entry.builderConfig,
    },
  })
);

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildMixedCatalog() {
  return MIXED_CATALOG;
}
