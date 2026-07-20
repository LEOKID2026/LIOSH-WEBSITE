/**
 * Writing ready catalog — 270 frozen entries from builders (plan v3.1).
 * @module lib/writing/writing-ready-catalog
 */

import { WRITING_CATALOG_ENTRIES } from "../../data/writing/catalog-builders/index.js";

/** @typedef {import("./writing-worksheet-types.js").WritingCategory} WritingCategory */

/**
 * @typedef {import("./writing-worksheet-types.js").ReadyWritingCatalogEntry & {
 *   builderConfig?: Record<string, unknown>,
 *   gradeKey?: string,
 *   levelKey?: string,
 * }} ReadyWritingCatalogEntryExtended
 */

/** @type {ReadyWritingCatalogEntryExtended[]} */
export const READY_WRITING_CATALOG = WRITING_CATALOG_ENTRIES;

const SLUG_INDEX = new Map(READY_WRITING_CATALOG.map((entry) => [entry.slug, entry]));
const CATALOG_NUMBER_INDEX = new Map(
  READY_WRITING_CATALOG.map((entry) => [entry.catalogNumber, entry])
);

/**
 * @param {string} slug
 * @returns {ReadyWritingCatalogEntryExtended | null}
 */
export function getReadyWritingBySlug(slug) {
  return SLUG_INDEX.get(String(slug || "").trim()) || null;
}

/**
 * @param {string} catalogNumber
 * @returns {ReadyWritingCatalogEntryExtended | null}
 */
export function getReadyWritingByCatalogNumber(catalogNumber) {
  return CATALOG_NUMBER_INDEX.get(String(catalogNumber || "").trim()) || null;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isKnownReadyWritingSlug(slug) {
  return SLUG_INDEX.has(String(slug || "").trim());
}

/**
 * @returns {ReadyWritingCatalogEntryExtended[]}
 */
export function getPublicReadyWritingCatalog() {
  return READY_WRITING_CATALOG.filter((entry) => entry.publicAccess === true);
}

/**
 * @returns {Record<WritingCategory, number>}
 */
export function countReadyWritingByCategory() {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const entry of READY_WRITING_CATALOG) {
    counts[entry.writingCategory] = (counts[entry.writingCategory] || 0) + 1;
  }
  return counts;
}

/**
 * @returns {number}
 */
export function countPublicReadyWritingEntries() {
  return READY_WRITING_CATALOG.filter((entry) => entry.publicAccess === true).length;
}

/**
 * @returns {{ total: number, public: number, byCategory: Record<string, number> }}
 */
export function getReadyWritingCatalogStats() {
  return {
    total: READY_WRITING_CATALOG.length,
    public: countPublicReadyWritingEntries(),
    byCategory: countReadyWritingByCategory(),
  };
}
