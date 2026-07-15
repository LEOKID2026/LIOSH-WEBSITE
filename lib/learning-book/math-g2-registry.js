import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 2 Math Learning Book — internal TOC registry.
 * Content files: docs/learning-book/math/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG2Batch */

/** @type {MathG2Batch[]} */
const MATH_G2_BOOK_BATCHES_RAW = [
  {
    id: "a",
    titleHe: "יסודות מספרים והשוואה",
    pages: [
      "ns_place_tens_units",
      "ns_neighbors",
      "ns_complement10",
      "ns_even_odd",
      "cmp",
    ],
  },
  {
    id: "b",
    titleHe: "חיבור, חיסור, כפל וחילוק",
    pages: [
      "add_two",
      "sub_two",
      "add_vertical",
      "sub_vertical",
      "mul",
      "div",
    ],
  },
  {
    id: "c",
    titleHe: "התחלקות ושברים",
    pages: [
      "divisibility",
      "frac_half",
      "frac_half_reverse",
      "frac_quarter",
      "frac_quarter_reverse",
    ],
  },
  {
    id: "d",
    titleHe: "שאלות מילוליות",
    pages: [
      "wp_coins",
      "wp_coins_spent",
      "wp_time_date",
      "wp_time_days",
      "wp_groups_g2",
      "wp_division_simple",
    ],
  },
];


const _MATH_G2_SEQUENCE = createSequencedBookExports("math", "g2", MATH_G2_BOOK_BATCHES_RAW);
export const MATH_G2_PAGE_ORDER = _MATH_G2_SEQUENCE.pageOrder;
export const MATH_G2_BOOK_BATCHES = _MATH_G2_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG2PageNeighbors(pageId) {
  return _MATH_G2_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidMathG2PageId(pageId) {
  return _MATH_G2_SEQUENCE.isValidPageId(pageId);
}

export const MATH_G2_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g2",
  routeBase: "/student/learning/book/math/g2",
  bookTitleHe: "ספר מתמטיקה - כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/math/g2/drafts",
});

