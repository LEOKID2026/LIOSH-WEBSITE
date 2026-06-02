/**
 * Grade 4 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g4/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG4Batch */

/** @type {GeometryG4Batch[]} */
export const GEOMETRY_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "תכונות ריבוע ומלבן",
    pages: [
      "shapes_basic_properties_square",
      "shapes_basic_properties_rectangle",
      "shapes_basic_properties_angles",
      "symmetry",
    ],
  },
  {
    id: "b",
    titleHe: "מרובעים ומקבילות",
    pages: ["quadrilaterals", "parallel_perpendicular"],
  },
  {
    id: "c",
    titleHe: "היקף ושטח",
    pages: [
      "square_perimeter",
      "square_area",
      "triangle_perimeter",
      "triangle_angles",
    ],
  },
  {
    id: "d",
    titleHe: "אלכסונים",
    pages: ["diagonal_square", "diagonal_rectangle"],
  },
  {
    id: "e",
    titleHe: "גופים ונפח תיבה",
    pages: ["solids", "rectangular_prism_volume"],
  },
];

export const GEOMETRY_G4_PAGE_ORDER = GEOMETRY_G4_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const GEOMETRY_G4_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g4",
  routeBase: "/learning/book/geometry/g4",
  bookTitleHe: "ספר הנדסה — כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/geometry/g4/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG4PageNeighbors(pageId) {
  const index = GEOMETRY_G4_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? GEOMETRY_G4_PAGE_ORDER[index - 1] : null,
    next:
      index < GEOMETRY_G4_PAGE_ORDER.length - 1
        ? GEOMETRY_G4_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidGeometryG4PageId(pageId) {
  return GEOMETRY_G4_PAGE_ORDER.includes(pageId);
}
