import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 3 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g3/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG3Batch */

/** @type {GeometryG3Batch[]} */
const GEOMETRY_G3_BOOK_BATCHES_RAW = [
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


const _GEOMETRY_G3_SEQUENCE = createSequencedBookExports("geometry", "g3", GEOMETRY_G3_BOOK_BATCHES_RAW);
export const GEOMETRY_G3_PAGE_ORDER = _GEOMETRY_G3_SEQUENCE.pageOrder;
export const GEOMETRY_G3_BOOK_BATCHES = _GEOMETRY_G3_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG3PageNeighbors(pageId) {
  return _GEOMETRY_G3_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidGeometryG3PageId(pageId) {
  return _GEOMETRY_G3_SEQUENCE.isValidPageId(pageId);
}

export const GEOMETRY_G3_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g3",
  routeBase: "/student/learning/book/geometry/g3",
  bookTitleHe: "ספר גאומטריה - כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/geometry/g3/drafts",
});

