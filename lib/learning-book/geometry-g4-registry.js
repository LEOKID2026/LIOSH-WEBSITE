import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 4 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g4/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG4Batch */

/** @type {GeometryG4Batch[]} */
const GEOMETRY_G4_BOOK_BATCHES_RAW = [
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


const _GEOMETRY_G4_SEQUENCE = createSequencedBookExports("geometry", "g4", GEOMETRY_G4_BOOK_BATCHES_RAW);
export const GEOMETRY_G4_PAGE_ORDER = _GEOMETRY_G4_SEQUENCE.pageOrder;
export const GEOMETRY_G4_BOOK_BATCHES = _GEOMETRY_G4_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG4PageNeighbors(pageId) {
  return _GEOMETRY_G4_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidGeometryG4PageId(pageId) {
  return _GEOMETRY_G4_SEQUENCE.isValidPageId(pageId);
}

export const GEOMETRY_G4_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g4",
  routeBase: "/student/learning/book/geometry/g4",
  bookTitleHe: "ספר גאומטריה - כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/geometry/g4/drafts",
});

