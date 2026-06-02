/**
 * Grade 2 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG2Batch */

/** @type {ScienceG2Batch[]} */
export const SCIENCE_G2_BOOK_BATCHES = [
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

export const SCIENCE_G2_PAGE_ORDER = SCIENCE_G2_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const SCIENCE_G2_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g2",
  routeBase: "/learning/book/science/g2",
  bookTitleHe: "ספר מדעים — כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/science/g2/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG2PageNeighbors(pageId) {
  const index = SCIENCE_G2_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? SCIENCE_G2_PAGE_ORDER[index - 1] : null,
    next:
      index < SCIENCE_G2_PAGE_ORDER.length - 1
        ? SCIENCE_G2_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidScienceG2PageId(pageId) {
  return SCIENCE_G2_PAGE_ORDER.includes(pageId);
}
