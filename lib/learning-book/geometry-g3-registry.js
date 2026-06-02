/**
 * Grade 3 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g3/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG3Batch */

/** @type {GeometryG3Batch[]} */
export const GEOMETRY_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "משולשים ומרובעים",
    pages: ["triangles", "quadrilaterals"],
  },
  {
    id: "b",
    titleHe: "מקבילות ומאונכות",
    pages: ["parallel_perpendicular"],
  },
  {
    id: "c",
    titleHe: "שטח והיקף",
    pages: ["square_area", "square_perimeter", "triangle_perimeter"],
  },
  {
    id: "d",
    titleHe: "זוויות במשולש",
    pages: ["triangle_angles"],
  },
  {
    id: "e",
    titleHe: "סיבוב וגופים",
    pages: ["rotation", "solids"],
  },
];

export const GEOMETRY_G3_PAGE_ORDER = GEOMETRY_G3_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G3_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g3",
  routeBase: "/learning/book/geometry/g3",
  bookTitleHe: "ספר גאומטריה — כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/geometry/g3/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG3PageNeighbors(pageId) {
  const index = GEOMETRY_G3_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G3_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G3_PAGE_ORDER.length - 1
        ? GEOMETRY_G3_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG3PageId(pageId) {
  return GEOMETRY_G3_PAGE_ORDER.includes(pageId);
}
