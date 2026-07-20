/**
 * Prewriting ready catalog — W-201 to W-216 (16 entries).
 * @module data/writing/catalog-builders/prewriting.builder
 */

import { formatCatalogNumber, makeCatalogEntry } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/**
 * Fixed catalog order — public slugs W-201, W-205, W-207, W-215 per plan v3.1 §15–16.
 * @type {Array<{ pathId: string, titleHe: string }>}
 */
const PREWRITING_CATALOG_ORDER = [
  { pathId: "horizontal", titleHe: "קווים אופקיים" },
  { pathId: "vertical", titleHe: "קווים אנכיים" },
  { pathId: "slants", titleHe: "קווים אלכסוניים" },
  { pathId: "bridges", titleHe: "גשרים" },
  { pathId: "waves", titleHe: "גלים" },
  { pathId: "peaks", titleHe: "פסגות" },
  { pathId: "circles", titleHe: "עיגולים" },
  { pathId: "loops", titleHe: "לולאות" },
  { pathId: "curves", titleHe: "עקומות" },
  { pathId: "spirals", titleHe: "ספירלות" },
  { pathId: "zigzag", titleHe: "זיגזג" },
  { pathId: "valleys", titleHe: "עמקים" },
  { pathId: "mountains", titleHe: "הרים" },
  { pathId: "tunnels", titleHe: "מנהרות" },
  { pathId: "combo", titleHe: "שילוב קווים" },
  { pathId: "mixed_shapes", titleHe: "צורות מעורבות" },
];

/** @type {WritingCatalogBuilderEntry[]} */
export const PREWRITING_CATALOG = PREWRITING_CATALOG_ORDER.map((item, index) => {
  const catalogNum = 201 + index;
  return makeCatalogEntry({
    slug: `writing-pre-${item.pathId}`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "prewriting",
    titleHe: item.titleHe,
    gradeKey: "prek",
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "prewriting",
      prewritingPathId: item.pathId,
      tracingMode: "trace",
      traceRenderMode: "outline",
      lineTemplate: "prewriting_path",
      lineCount: 6,
      itemsPerLine: 1,
    },
  });
});

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildPrewritingCatalog() {
  return PREWRITING_CATALOG;
}
