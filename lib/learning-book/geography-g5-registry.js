import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 5 Geography Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/g5/drafts/{pageId}.md
 * Status: launch-ready (G2–G6 student-visible via learning book catalog).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GEOGRAPHY_G5Batch */

/** @type {GEOGRAPHY_G5Batch[]} */
const GEOGRAPHY_G5_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "מפות, אקלים וסביבה",
    "pages": [
      "mg_g5_coordinates",
      "mg_g5_climate",
      "mg_g5_natural_hazards",
      "mg_g5_resources"
    ]
  },
  {
    "id": "b",
    "titleHe": "אזרחות וזהות",
    "pages": [
      "mg_g5_government_institutions",
      "mg_g5_law_society",
      "mg_g5_identity"
    ]
  }
];

const _GEOGRAPHY_G5_SEQUENCE = createSequencedBookExports("geography", "g5", GEOGRAPHY_G5_BOOK_BATCHES_RAW);
export const GEOGRAPHY_G5_PAGE_ORDER = _GEOGRAPHY_G5_SEQUENCE.pageOrder;
export const GEOGRAPHY_G5_BOOK_BATCHES = _GEOGRAPHY_G5_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeographyG5PageNeighbors(pageId) {
  return _GEOGRAPHY_G5_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidGeographyG5PageId(pageId) {
  return _GEOGRAPHY_G5_SEQUENCE.isValidPageId(pageId);
}

export const GEOGRAPHY_G5_BOOK_META = Object.freeze({
  subject: "geography",
  grade: "g5",
  routeBase: "/student/learning/book/geography/g5",
  bookTitleHe: "ספר גאוגרפיה - כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/moledet-geography/g5/drafts",
  subjectTitleHe: "גאוגרפיה",
});
