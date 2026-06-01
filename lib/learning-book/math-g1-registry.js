/**
 * Grade 1 Math Learning Book — internal TOC registry (preview slice only).
 * Content files: docs/learning-book/math/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG1Batch */

/** @type {MathG1Batch[]} */
export const MATH_G1_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "יסודות ציר המספרים והמספרים",
    pages: [
      "ns_counting_forward",
      "ns_counting_backward",
      "ns_number_line",
      "ns_neighbors",
      "cmp",
    ],
  },
  {
    id: "b",
    titleHe: "עשרות, זוגיות וחיבור בסיסי",
    pages: [
      "ns_place_tens_units",
      "ns_even_odd",
      "ns_complement10",
      "add_second_decade",
      "add_tens_only",
    ],
  },
  {
    id: "c",
    titleHe: "פעולות חשבון בסיסיות",
    pages: [
      "add_two",
      "sub_two",
      "eq_add_simple",
      "eq_sub_simple",
      "mul",
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
    ],
  },
];

/** Flat reading order for prev/next navigation */
export const MATH_G1_PAGE_ORDER = MATH_G1_BOOK_BATCHES.flatMap((batch) => batch.pages);

export const MATH_G1_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g1",
  routeBase: "/learning/book/math/g1",
  bookTitleHe: "ספר חשבון — כיתה א׳",
  draftsDir: "docs/learning-book/math/g1/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG1PageNeighbors(pageId) {
  const index = MATH_G1_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? MATH_G1_PAGE_ORDER[index - 1] : null,
    next: index < MATH_G1_PAGE_ORDER.length - 1 ? MATH_G1_PAGE_ORDER[index + 1] : null,
    index,
  };
}

export function isValidMathG1PageId(pageId) {
  return MATH_G1_PAGE_ORDER.includes(pageId);
}
