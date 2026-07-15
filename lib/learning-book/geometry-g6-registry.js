/**
 * Grade 6 Geometry Learning Book — internal TOC registry.
 * Content files: docs/learning-book/geometry/g6/drafts/{pageId}.md
 */
import { createSequencedBookExports } from "./learning-book-sequence.js";
import { isPrismVolumeTriangleAllowed } from "../../utils/geometry-curriculum-gates.js";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} GeometryG6Batch */

/** @type {GeometryG6Batch[]} */
const GEOMETRY_G6_BOOK_BATCHES_RAW = [
  {
    id: "a",
    titleHe: "היקף, שטח וזוויות - המשך כיתה ו׳",
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


const _GEOMETRY_G6_SEQUENCE = createSequencedBookExports("geometry", "g6", GEOMETRY_G6_BOOK_BATCHES_RAW);
export const GEOMETRY_G6_PAGE_ORDER = _GEOMETRY_G6_SEQUENCE.pageOrder;
export const GEOMETRY_G6_BOOK_BATCHES = _GEOMETRY_G6_SEQUENCE.batches;

/** Pages reachable in product while teach-path gates apply. */
export function getGeometryG6AccessiblePageOrder() {
  if (isPrismVolumeTriangleAllowed()) return GEOMETRY_G6_PAGE_ORDER;
  return GEOMETRY_G6_PAGE_ORDER.filter((pageId) => pageId !== "prism_volume_triangle");
}

/** TOC batches with gated pages removed from navigation. */
export function getGeometryG6AccessibleBookBatches() {
  const allowed = new Set(getGeometryG6AccessiblePageOrder());
  return GEOMETRY_G6_BOOK_BATCHES.map((batch) => ({
    ...batch,
    pages: batch.pages.filter((pageId) => allowed.has(pageId)),
  })).filter((batch) => batch.pages.length > 0);
}

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG6PageNeighbors(pageId) {
  const order = getGeometryG6AccessiblePageOrder();
  const index = order.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
    index,
  };
}

export function isValidGeometryG6PageId(pageId) {
  return getGeometryG6AccessiblePageOrder().includes(pageId);
}

export const GEOMETRY_G6_BOOK_META = Object.freeze({
  subject: "geometry",
  grade: "g6",
  routeBase: "/student/learning/book/geometry/g6",
  bookTitleHe: "ספר גאומטריה - כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/geometry/g6/drafts",
});

