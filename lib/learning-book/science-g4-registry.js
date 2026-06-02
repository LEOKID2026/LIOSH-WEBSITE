/**
 * Grade 4 Science Learning Book — internal TOC registry.
 * Content files: docs/learning-book/science/g4/drafts/{pageId}.md
 * Note: plants excluded (spine maxGrade 3).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ScienceG4Batch */

/** @type {ScienceG4Batch[]} */
export const SCIENCE_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "עולם החיים",
    pages: ["body", "animals"],
  },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G4_PAGE_ORDER = SCIENCE_G4_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const SCIENCE_G4_BOOK_META = Object.freeze({
  subject: "science",
  grade: "g4",
  routeBase: "/learning/book/science/g4",
  bookTitleHe: "ספר מדעים — כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/science/g4/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getScienceG4PageNeighbors(pageId) {
  const index = SCIENCE_G4_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? SCIENCE_G4_PAGE_ORDER[index - 1] : null,
    next:
      index < SCIENCE_G4_PAGE_ORDER.length - 1
        ? SCIENCE_G4_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidScienceG4PageId(pageId) {
  return SCIENCE_G4_PAGE_ORDER.includes(pageId);
}
