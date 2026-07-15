import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 4 Moledet Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/g4/drafts/{pageId}.md
 * Status: launch-ready (G2–G6 student-visible via learning book catalog).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MOLEDET_G4Batch */

/** @type {MOLEDET_G4Batch[]} */
const MOLEDET_G4_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "יישובים בישראל",
    "pages": [
      "mg_g4_settlement_types",
      "mg_g4_settlement_development"
    ]
  },
  {
    "id": "b",
    "titleHe": "מפות ומשאבי טבע",
    "pages": [
      "mg_g4_map_scale_symbols",
      "mg_g4_natural_resources"
    ]
  },
  {
    "id": "c",
    "titleHe": "ממשל וקהילה",
    "pages": [
      "mg_g4_government_structure",
      "mg_g4_organizations",
      "mg_g4_government_institutions"
    ]
  }
];

const _MOLEDET_G4_SEQUENCE = createSequencedBookExports("moledet", "g4", MOLEDET_G4_BOOK_BATCHES_RAW);
export const MOLEDET_G4_PAGE_ORDER = _MOLEDET_G4_SEQUENCE.pageOrder;
export const MOLEDET_G4_BOOK_BATCHES = _MOLEDET_G4_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMoledetG4PageNeighbors(pageId) {
  return _MOLEDET_G4_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidMoledetG4PageId(pageId) {
  return _MOLEDET_G4_SEQUENCE.isValidPageId(pageId);
}

export const MOLEDET_G4_BOOK_META = Object.freeze({
  subject: "moledet",
  grade: "g4",
  routeBase: "/student/learning/book/moledet/g4",
  bookTitleHe: "ספר מולדת - כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/moledet-geography/g4/drafts",
  subjectTitleHe: "מולדת",
});
