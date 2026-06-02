/**
 * Grade 2 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG2Batch */

/** @type {GeometryG2Batch[]} */
export const GEOMETRY_G2_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "גופים תלת־ממדיים",
    pages: ["solids"],
  },
  {
    id: "b",
    titleHe: "שטח — ריבוע",
    pages: ["square_area"],
  },
  {
    id: "c",
    titleHe: "הזזה ושיקוף — המשך",
    pages: ["transformations"],
  },
];

export const GEOMETRY_G2_PAGE_ORDER = GEOMETRY_G2_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G2_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g2",
  routeBase: "/learning/book/geometry/g2",
  bookTitleHe: "ספר גאומטריה — כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/geometry/g2/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG2PageNeighbors(pageId) {
  const index = GEOMETRY_G2_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G2_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G2_PAGE_ORDER.length - 1
        ? GEOMETRY_G2_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG2PageId(pageId) {
  return GEOMETRY_G2_PAGE_ORDER.includes(pageId);
}
