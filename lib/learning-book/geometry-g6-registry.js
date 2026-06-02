/**
 * Grade 6 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g6/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG6Batch */

/** @type {GeometryG6Batch[]} */
export const GEOMETRY_G6_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "היקף, שטח וזוויות — המשך כיתה ו׳",
    pages: [
      "square_perimeter",
      "triangle_perimeter",
      "square_area",
      "parallelogram_area",
      "trapezoid_area",
      "triangle_angles",
    ],
  },
  {
    id: "b",
    titleHe: "מעגל ועיגול",
    pages: ["circle_perimeter", "circle_area"],
  },
  {
    id: "c",
    titleHe: "משפט פיתגורס",
    pages: ["pythagoras_hyp", "pythagoras_leg"],
  },
  {
    id: "d",
    titleHe: "גופים ונפח בסיסי",
    pages: ["solids", "rectangular_prism_volume"],
  },
  {
    id: "e",
    titleHe: "נפח מנסרות",
    pages: ["prism_volume_rectangular", "prism_volume_triangle"],
  },
  {
    id: "f",
    titleHe: "נפח פירמידות",
    pages: ["pyramid_volume_square", "pyramid_volume_rectangular"],
  },
  {
    id: "g",
    titleHe: "נפח גליל, חרוט וכדור",
    pages: ["cylinder_volume", "cone_volume", "sphere_volume"],
  },
];

export const GEOMETRY_G6_PAGE_ORDER = GEOMETRY_G6_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G6_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g6",
  routeBase: "/learning/book/geometry/g6",
  bookTitleHe: "ספר גאומטריה — כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/geometry/g6/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG6PageNeighbors(pageId) {
  const index = GEOMETRY_G6_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G6_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G6_PAGE_ORDER.length - 1
        ? GEOMETRY_G6_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG6PageId(pageId) {
  return GEOMETRY_G6_PAGE_ORDER.includes(pageId);
}
