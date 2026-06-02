/**
 * Grade 1 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG1Batch */

/** @type {ScienceG1Batch[]} */
export const SCIENCE_G1_BOOK_BATCHES = [
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

export const SCIENCE_G1_PAGE_ORDER = SCIENCE_G1_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const SCIENCE_G1_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g1",
  routeBase: "/learning/book/science/g1",
  bookTitleHe: "ספר מדעים — כיתה א׳",
  gradeShortLabel: "כיתה א׳",
  draftsDir: "docs/learning-book/science/g1/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG1PageNeighbors(pageId) {
  const index = SCIENCE_G1_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? SCIENCE_G1_PAGE_ORDER[index - 1] : null,
    next:
      index < SCIENCE_G1_PAGE_ORDER.length - 1
        ? SCIENCE_G1_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidScienceG1PageId(pageId) {
  return SCIENCE_G1_PAGE_ORDER.includes(pageId);
}
