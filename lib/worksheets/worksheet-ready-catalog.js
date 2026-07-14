/**
 * Ready worksheet catalog — Wave F frozen entries.
 * @module lib/worksheets/worksheet-ready-catalog
 */

import { READY_CATALOG_ENTRIES } from "../../data/worksheets/ready-catalog.entries.js";

/** @typedef {import("./worksheet-level-display.js").WorksheetPublicLevelKey} WorksheetPublicLevelKey */
/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/**
 * @typedef {Object} ReadyWorksheetCatalogEntry
 * @property {string} slug
 * @property {WorksheetSubjectId} subjectId
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {WorksheetPublicLevelKey} levelKey
 * @property {number} count
 * @property {number} seed
 * @property {boolean} [inkSave]
 * @property {string} [titleHe]
 * @property {string} [mathPracticeFormat]
 */

/** @type {ReadyWorksheetCatalogEntry[]} */
export const READY_WORKSHEET_CATALOG = READY_CATALOG_ENTRIES;

const SLUG_SET = new Set(READY_WORKSHEET_CATALOG.map((e) => e.slug));

/**
 * @param {string} slug
 * @returns {ReadyWorksheetCatalogEntry | null}
 */
export function getReadyWorksheetBySlug(slug) {
  const key = String(slug || "").trim();
  return READY_WORKSHEET_CATALOG.find((e) => e.slug === key) || null;
}

/**
 * @returns {Record<WorksheetSubjectId, number>}
 */
export function countReadyCatalogBySubject() {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const entry of READY_WORKSHEET_CATALOG) {
    counts[entry.subjectId] = (counts[entry.subjectId] || 0) + 1;
  }
  return counts;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isKnownReadyWorksheetSlug(slug) {
  return SLUG_SET.has(String(slug || "").trim());
}
