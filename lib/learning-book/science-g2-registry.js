import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 2 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG2Batch */

/** @type {ScienceG2Batch[]} */
const SCIENCE_G2_BOOK_BATCHES_RAW = [
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
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];


const _SCIENCE_G2_SEQUENCE = createSequencedBookExports("science", "g2", SCIENCE_G2_BOOK_BATCHES_RAW);
export const SCIENCE_G2_PAGE_ORDER = _SCIENCE_G2_SEQUENCE.pageOrder;
export const SCIENCE_G2_BOOK_BATCHES = _SCIENCE_G2_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG2PageNeighbors(pageId) {
  return _SCIENCE_G2_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidScienceG2PageId(pageId) {
  return _SCIENCE_G2_SEQUENCE.isValidPageId(pageId);
}

export const SCIENCE_G2_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g2",
  routeBase: "/student/learning/book/science/g2",
  bookTitleHe: "ספר מדעים - כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/science/g2/drafts",
});

