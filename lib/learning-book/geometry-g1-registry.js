import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 1 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG1Batch */

/** @type {GeometryG1Batch[]} */
const GEOMETRY_G1_BOOK_BATCHES_RAW = [
  {
    id: "a",
    titleHe: "צורות בסיסיות - ריבוע ומלבן",
    pages: ["shapes_basic_square", "shapes_basic_rectangle"],
  },
  {
    id: "b",
    titleHe: "הזזה ושיקוף",
    pages: ["transformations"],
  },
];


const _GEOMETRY_G1_SEQUENCE = createSequencedBookExports("geometry", "g1", GEOMETRY_G1_BOOK_BATCHES_RAW);
export const GEOMETRY_G1_PAGE_ORDER = _GEOMETRY_G1_SEQUENCE.pageOrder;
export const GEOMETRY_G1_BOOK_BATCHES = _GEOMETRY_G1_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG1PageNeighbors(pageId) {
  return _GEOMETRY_G1_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidGeometryG1PageId(pageId) {
  return _GEOMETRY_G1_SEQUENCE.isValidPageId(pageId);
}

export const GEOMETRY_G1_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g1",
  routeBase: "/student/learning/book/geometry/g1",
  bookTitleHe: "ספר גאומטריה - כיתה א׳",
  draftsDir: "docs/learning-book/geometry/g1/drafts",
});

