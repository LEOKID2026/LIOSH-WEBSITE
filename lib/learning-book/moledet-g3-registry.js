import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 3 Moledet Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/g3/drafts/{pageId}.md
 * Status: launch-ready (G2–G6 student-visible via learning book catalog).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MOLEDET_G3Batch */

/** @type {MOLEDET_G3Batch[]} */
const MOLEDET_G3_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "גאוגרפיה של ישראל",
    "pages": [
      "mg_g3_israel_map",
      "mg_g3_regions_cities",
      "mg_g3_landscapes",
      "mg_g3_water_sources",
      "mg_g3_districts_borders"
    ]
  },
  {
    "id": "b",
    "titleHe": "אזרחות - יסודות",
    "pages": [
      "mg_g3_citizenship_basics",
      "mg_g3_rights_duties",
      "mg_g3_social_participation"
    ]
  }
];

const _MOLEDET_G3_SEQUENCE = createSequencedBookExports("moledet", "g3", MOLEDET_G3_BOOK_BATCHES_RAW);
export const MOLEDET_G3_PAGE_ORDER = _MOLEDET_G3_SEQUENCE.pageOrder;
export const MOLEDET_G3_BOOK_BATCHES = _MOLEDET_G3_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMoledetG3PageNeighbors(pageId) {
  return _MOLEDET_G3_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidMoledetG3PageId(pageId) {
  return _MOLEDET_G3_SEQUENCE.isValidPageId(pageId);
}

export const MOLEDET_G3_BOOK_META = Object.freeze({
  subject: "moledet",
  grade: "g3",
  routeBase: "/student/learning/book/moledet/g3",
  bookTitleHe: "ספר מולדת - כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/moledet-geography/g3/drafts",
  subjectTitleHe: "מולדת",
});
