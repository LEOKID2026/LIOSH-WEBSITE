import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 2 Moledet Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/g2/drafts/{pageId}.md
 * Status: launch-ready (G2–G6 student-visible via learning book catalog).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MOLEDET_G2Batch */

/** @type {MOLEDET_G2Batch[]} */
const MOLEDET_G2_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "השכונה ומפת השכונה",
    "pages": [
      "mg_g2_neighborhood",
      "mg_g2_neighborhood_map",
      "mg_g2_community_services"
    ]
  },
  {
    "id": "b",
    "titleHe": "ארץ ישראל - היכרות ראשונה",
    "pages": [
      "mg_g2_israel_basics"
    ]
  },
  {
    "id": "c",
    "titleHe": "חברה, אחריות והשתתפות",
    "pages": [
      "mg_g2_group_decisions",
      "mg_g2_society_responsibility",
      "mg_g2_community_participation"
    ]
  }
];

const _MOLEDET_G2_SEQUENCE = createSequencedBookExports("moledet", "g2", MOLEDET_G2_BOOK_BATCHES_RAW);
export const MOLEDET_G2_PAGE_ORDER = _MOLEDET_G2_SEQUENCE.pageOrder;
export const MOLEDET_G2_BOOK_BATCHES = _MOLEDET_G2_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMoledetG2PageNeighbors(pageId) {
  return _MOLEDET_G2_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidMoledetG2PageId(pageId) {
  return _MOLEDET_G2_SEQUENCE.isValidPageId(pageId);
}

export const MOLEDET_G2_BOOK_META = Object.freeze({
  subject: "moledet",
  grade: "g2",
  routeBase: "/student/learning/book/moledet/g2",
  bookTitleHe: "ספר מולדת - כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/moledet-geography/g2/drafts",
  subjectTitleHe: "מולדת",
});
