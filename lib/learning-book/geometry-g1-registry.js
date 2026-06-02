/**
 * Grade 1 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG1Batch */

/** @type {GeometryG1Batch[]} */
export const GEOMETRY_G1_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "צורות בסיסיות — ריבוע ומלבן",
    pages: ["shapes_basic_square", "shapes_basic_rectangle"],
  },
  {
    id: "b",
    titleHe: "הזזה ושיקוף",
    pages: ["transformations"],
  },
];

export const GEOMETRY_G1_PAGE_ORDER = GEOMETRY_G1_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G1_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g1",
  routeBase: "/learning/book/geometry/g1",
  bookTitleHe: "ספר הנדסה — כיתה א׳",
  draftsDir: "docs/learning-book/geometry/g1/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG1PageNeighbors(pageId) {
  const index = GEOMETRY_G1_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G1_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G1_PAGE_ORDER.length - 1
        ? GEOMETRY_G1_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG1PageId(pageId) {
  return GEOMETRY_G1_PAGE_ORDER.includes(pageId);
}
