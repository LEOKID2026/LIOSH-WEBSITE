import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 5 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g5/drafts/{pageId}.md
 * Note: plants excluded (spine maxGrade 3).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG5Batch */

/** @type {ScienceG5Batch[]} */
const SCIENCE_G5_BOOK_BATCHES_RAW = [
  { id: "a", titleHe: "עולם החיים", pages: ["body", "animals"] },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];


const _SCIENCE_G5_SEQUENCE = createSequencedBookExports("science", "g5", SCIENCE_G5_BOOK_BATCHES_RAW);
export const SCIENCE_G5_PAGE_ORDER = _SCIENCE_G5_SEQUENCE.pageOrder;
export const SCIENCE_G5_BOOK_BATCHES = _SCIENCE_G5_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG5PageNeighbors(pageId) {
  return _SCIENCE_G5_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidScienceG5PageId(pageId) {
  return _SCIENCE_G5_SEQUENCE.isValidPageId(pageId);
}

export const SCIENCE_G5_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g5",
  routeBase: "/student/learning/book/science/g5",
  bookTitleHe: "ספר מדעים - כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/science/g5/drafts",
});

