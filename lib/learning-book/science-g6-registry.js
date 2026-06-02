/**
 * Grade 6 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g6/drafts/{pageId}.md
 * Note: plants excluded (spine maxGrade 3).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG6Batch */

/** @type {ScienceG6Batch[]} */
export const SCIENCE_G6_BOOK_BATCHES = [
  { id: "a", titleHe: "עולם החיים", pages: ["body", "animals"] },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G6_PAGE_ORDER = SCIENCE_G6_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const SCIENCE_G6_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g6",
  routeBase: "/learning/book/science/g6",
  bookTitleHe: "ספר מדעים — כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/science/g6/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG6PageNeighbors(pageId) {
  const index = SCIENCE_G6_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? SCIENCE_G6_PAGE_ORDER[index - 1] : null,
    next:
      index < SCIENCE_G6_PAGE_ORDER.length - 1
        ? SCIENCE_G6_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidScienceG6PageId(pageId) {
  return SCIENCE_G6_PAGE_ORDER.includes(pageId);
}
