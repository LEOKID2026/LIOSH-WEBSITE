import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 6 Geography Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/g6/drafts/{pageId}.md
 * Status: launch-ready (G2–G6 student-visible via learning book catalog).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GEOGRAPHY_G6Batch */

/** @type {GEOGRAPHY_G6Batch[]} */
const GEOGRAPHY_G6_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "חברה, סביבה וטבע",
    "pages": [
      "mg_g6_population",
      "mg_g6_natural_phenomena",
      "mg_g6_environment_quality",
      "mg_g6_human_environment"
    ]
  },
  {
    "id": "b",
    "titleHe": "דמוקרטיה, ערכים ומעורבות",
    "pages": [
      "mg_g6_democracy",
      "mg_g6_values",
      "mg_g6_state_institutions",
      "mg_g6_social_involvement"
    ]
  }
];

const _GEOGRAPHY_G6_SEQUENCE = createSequencedBookExports("geography", "g6", GEOGRAPHY_G6_BOOK_BATCHES_RAW);
export const GEOGRAPHY_G6_PAGE_ORDER = _GEOGRAPHY_G6_SEQUENCE.pageOrder;
export const GEOGRAPHY_G6_BOOK_BATCHES = _GEOGRAPHY_G6_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeographyG6PageNeighbors(pageId) {
  return _GEOGRAPHY_G6_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidGeographyG6PageId(pageId) {
  return _GEOGRAPHY_G6_SEQUENCE.isValidPageId(pageId);
}

export const GEOGRAPHY_G6_BOOK_META = Object.freeze({
  subject: "geography",
  grade: "g6",
  routeBase: "/student/learning/book/geography/g6",
  bookTitleHe: "ספר גאוגרפיה - כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/moledet-geography/g6/drafts",
  subjectTitleHe: "גאוגרפיה",
});
