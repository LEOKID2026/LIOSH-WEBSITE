/**
 * Grade 5 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g5/drafts/{pageId}.md
 * Note: plants excluded (spine maxGrade 3).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG5Batch */

/** @type {ScienceG5Batch[]} */
export const SCIENCE_G5_BOOK_BATCHES = [
  { id: "a", titleHe: "עולם החיים", pages: ["body", "animals"] },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G5_PAGE_ORDER = SCIENCE_G5_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const SCIENCE_G5_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g5",
  routeBase: "/learning/book/science/g5",
  bookTitleHe: "ספר מדעים — כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/science/g5/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG5PageNeighbors(pageId) {
  const index = SCIENCE_G5_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? SCIENCE_G5_PAGE_ORDER[index - 1] : null,
    next:
      index < SCIENCE_G5_PAGE_ORDER.length - 1
        ? SCIENCE_G5_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidScienceG5PageId(pageId) {
  return SCIENCE_G5_PAGE_ORDER.includes(pageId);
}
