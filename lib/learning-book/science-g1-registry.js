import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 1 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG1Batch */

/** @type {ScienceG1Batch[]} */
const SCIENCE_G1_BOOK_BATCHES_RAW = [
  {
    id: "a",
    titleHe: "עולם החיים",
    pages: ["body", "animals", "plants"],
  },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
];


const _SCIENCE_G1_SEQUENCE = createSequencedBookExports("science", "g1", SCIENCE_G1_BOOK_BATCHES_RAW);
export const SCIENCE_G1_PAGE_ORDER = _SCIENCE_G1_SEQUENCE.pageOrder;
export const SCIENCE_G1_BOOK_BATCHES = _SCIENCE_G1_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG1PageNeighbors(pageId) {
  return _SCIENCE_G1_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidScienceG1PageId(pageId) {
  return _SCIENCE_G1_SEQUENCE.isValidPageId(pageId);
}

export const SCIENCE_G1_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g1",
  routeBase: "/student/learning/book/science/g1",
  bookTitleHe: "ספר מדעים - כיתה א׳",
  gradeShortLabel: "כיתה א׳",
  draftsDir: "docs/learning-book/science/g1/drafts",
});

