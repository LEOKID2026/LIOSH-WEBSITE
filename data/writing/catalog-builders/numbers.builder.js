/**
 * Numbers ready catalog — W-156 to W-200 (45 entries).
 * @module data/writing/catalog-builders/numbers.builder
 */

import { formatCatalogNumber, makeCatalogEntry } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {WritingCatalogBuilderEntry[]} */
const NUMBER_DIGIT_SINGLES = Array.from({ length: 10 }, (_, digit) => {
  const catalogNum = 156 + digit;
  return makeCatalogEntry({
    slug: `writing-num-${digit}-trace`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "numbers",
    titleHe: `מספר ${digit}`,
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "numbers",
      numberRange: { min: digit, max: digit },
      numberMode: "digit",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "number_cell",
      lineCount: 6,
      itemsPerLine: 1,
    },
  });
});

/** @type {Array<{ catalogNum: number, value: number, slug: string, titleHe: string, lineTemplate: string, numberMode?: string }>} */
const NUMBER_SPECIAL_SINGLES = [
  {
    catalogNum: 166,
    value: 10,
    slug: "writing-num-10-trace",
    titleHe: "מספר 10",
    lineTemplate: "single_digit_trace",
  },
  {
    catalogNum: 176,
    value: 20,
    slug: "writing-num-20-trace",
    titleHe: "מספר 20",
    lineTemplate: "single_digit_trace",
  },
  {
    catalogNum: 177,
    value: 10,
    slug: "writing-num-10-tens",
    titleHe: "עשר — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 178,
    value: 20,
    slug: "writing-num-20-tens",
    titleHe: "עשרים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 179,
    value: 30,
    slug: "writing-num-30-tens",
    titleHe: "שלושים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 180,
    value: 40,
    slug: "writing-num-40-tens",
    titleHe: "ארבעים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 181,
    value: 50,
    slug: "writing-num-50-tens",
    titleHe: "חמישים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 182,
    value: 60,
    slug: "writing-num-60-tens",
    titleHe: "שישים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 183,
    value: 70,
    slug: "writing-num-70-tens",
    titleHe: "שבעים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 184,
    value: 80,
    slug: "writing-num-80-tens",
    titleHe: "שמונים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 185,
    value: 90,
    slug: "writing-num-90-tens",
    titleHe: "תשעים — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
  {
    catalogNum: 186,
    value: 100,
    slug: "writing-num-100-tens",
    titleHe: "מאה — עשרות",
    lineTemplate: "whole_tens",
    numberMode: "number",
  },
];

/** @type {WritingCatalogBuilderEntry[]} */
const NUMBER_SPECIAL_ENTRIES = NUMBER_SPECIAL_SINGLES.map((item) =>
  makeCatalogEntry({
    slug: item.slug,
    catalogNumber: formatCatalogNumber(item.catalogNum),
    writingCategory: "numbers",
    titleHe: item.titleHe,
    seed: 1000 + item.catalogNum,
    builderConfig: {
      writingCategory: "numbers",
      numberRange: { min: item.value, max: item.value },
      numberMode: item.numberMode || "digit",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: item.lineTemplate,
      lineCount: 6,
      itemsPerLine: 1,
    },
  })
);

/** @type {WritingCatalogBuilderEntry[]} */
const NUMBER_TEEN_SINGLES = Array.from({ length: 9 }, (_, index) => {
  const value = 11 + index;
  const catalogNum = 167 + index;
  return makeCatalogEntry({
    slug: `writing-num-${value}-trace`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "numbers",
    titleHe: `מספר ${value}`,
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "numbers",
      numberRange: { min: value, max: value },
      numberMode: "digit",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "single_digit_trace",
      lineCount: 6,
      itemsPerLine: 1,
    },
  });
});

/** @type {Array<{ catalogNum: number, slug: string, titleHe: string, min: number, max: number, numberMode?: string, tracingMode?: string, builderConfig?: Record<string, unknown> }>} */
const NUMBER_GROUPS = [
  { catalogNum: 187, slug: "writing-num-group-0-5", titleHe: "מספרים 0–5", min: 0, max: 5 },
  { catalogNum: 188, slug: "writing-num-group-1-5", titleHe: "מספרים 1–5", min: 1, max: 5 },
  { catalogNum: 189, slug: "writing-num-group-0-9", titleHe: "מספרים 0–9", min: 0, max: 9 },
  { catalogNum: 190, slug: "writing-num-group-1-10", titleHe: "מספרים 1–10", min: 1, max: 10 },
  { catalogNum: 191, slug: "writing-num-group-0-10", titleHe: "מספרים 0–10", min: 0, max: 10 },
  { catalogNum: 192, slug: "writing-num-group-11-20", titleHe: "מספרים 11–20", min: 11, max: 20 },
  { catalogNum: 193, slug: "writing-num-group-1-20", titleHe: "מספרים 1–20", min: 1, max: 20 },
  { catalogNum: 194, slug: "writing-num-group-even", titleHe: "מספרים זוגיים", min: 0, max: 20 },
  { catalogNum: 195, slug: "writing-num-group-odd", titleHe: "מספרים אי-זוגיים", min: 1, max: 19 },
  {
    catalogNum: 196,
    slug: "writing-num-group-tens",
    titleHe: "עשרות",
    min: 10,
    max: 100,
    builderConfig: { numberMode: "number", lineTemplate: "whole_tens" },
  },
  {
    catalogNum: 197,
    slug: "writing-num-group-before-after",
    titleHe: "לפני ואחרי",
    min: 1,
    max: 10,
    numberMode: "before_after",
    tracingMode: "copy",
  },
  {
    catalogNum: 198,
    slug: "writing-num-group-sequence",
    titleHe: "סדר מספרים",
    min: 1,
    max: 10,
    numberMode: "sequence",
    tracingMode: "copy",
  },
  {
    catalogNum: 199,
    slug: "writing-num-group-quantity",
    titleHe: "התאמת כמות",
    min: 1,
    max: 5,
    numberMode: "quantity_match",
    tracingMode: "trace",
  },
  {
    catalogNum: 200,
    slug: "writing-num-group-review",
    titleHe: "חזרה — מספרים",
    min: 0,
    max: 10,
    builderConfig: {
      numberMode: "digit",
      tracingMode: "trace_and_copy",
      includeImage: true,
    },
  },
];

/** @type {WritingCatalogBuilderEntry[]} */
const NUMBER_GROUP_ENTRIES = NUMBER_GROUPS.map((group) =>
  makeCatalogEntry({
    slug: group.slug,
    catalogNumber: formatCatalogNumber(group.catalogNum),
    writingCategory: "numbers",
    titleHe: group.titleHe,
    seed: 1000 + group.catalogNum,
    builderConfig: {
      writingCategory: "numbers",
      numberRange: { min: group.min, max: group.max },
      numberMode: group.numberMode || "digit",
      tracingMode: group.tracingMode || "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "number_cell",
      lineCount: 6,
      itemsPerLine: Math.min(5, group.max - group.min + 1),
      ...(group.builderConfig || {}),
    },
  })
);

/** @type {WritingCatalogBuilderEntry[]} */
export const NUMBERS_CATALOG = [
  ...NUMBER_DIGIT_SINGLES,
  NUMBER_SPECIAL_ENTRIES.find((entry) => entry.catalogNumber === "W-166"),
  ...NUMBER_TEEN_SINGLES,
  NUMBER_SPECIAL_ENTRIES.find((entry) => entry.catalogNumber === "W-176"),
  ...NUMBER_SPECIAL_ENTRIES.filter(
    (entry) => !["W-166", "W-176"].includes(entry.catalogNumber)
  ),
  ...NUMBER_GROUP_ENTRIES,
];

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildNumbersCatalog() {
  return NUMBERS_CATALOG;
}
