/**
 * Grade 5 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g5/drafts/{pageId}.md
 *
 * Official sequence (kita5.pdf): § ד.4 גבהים → § ה. מדידות שטחים / נוסחאות שטח.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG5Batch */

/** @type {GeometryG5Batch[]} */
export const GEOMETRY_G5_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "מקבילות, מרובעים וזוויות",
    pages: ["parallel_perpendicular", "quadrilaterals", "triangle_angles"],
  },
  {
    id: "b",
    titleHe: "היקף — ריבוע ומשולש",
    pages: ["square_perimeter", "triangle_perimeter"],
  },
  {
    id: "c",
    titleHe: "גובה במצולעים",
    pages: ["heights_triangle", "heights_parallelogram", "heights_trapezoid"],
  },
  {
    id: "d",
    titleHe: "שטח — ריבוע, משולש, מקבילית וטרפז",
    pages: ["square_area", "triangle_area", "parallelogram_area", "trapezoid_area"],
  },
  {
    id: "e",
    titleHe: "אלכסונים",
    pages: ["diagonal_square", "diagonal_rectangle", "diagonal_parallelogram"],
  },
  {
    id: "f",
    titleHe: "גופים ונפח",
    pages: ["solids", "rectangular_prism_volume"],
  },
  {
    id: "g",
    titleHe: "ריצוף",
    pages: ["tiling"],
  },
];

export const GEOMETRY_G5_PAGE_ORDER = GEOMETRY_G5_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G5_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g5",
  routeBase: "/learning/book/geometry/g5",
  bookTitleHe: "ספר גאומטריה — כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/geometry/g5/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG5PageNeighbors(pageId) {
  const index = GEOMETRY_G5_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G5_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G5_PAGE_ORDER.length - 1
        ? GEOMETRY_G5_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG5PageId(pageId) {
  return GEOMETRY_G5_PAGE_ORDER.includes(pageId);
}
