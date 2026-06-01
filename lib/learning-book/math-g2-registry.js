/**
 * Grade 2 Math Learning Book — internal TOC registry.
 * Content files: docs/learning-book/math/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG2Batch */

/** @type {MathG2Batch[]} */
export const MATH_G2_BOOK_BATCHES = [
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

/** Flat reading order for prev/next navigation */
export const MATH_G2_PAGE_ORDER = MATH_G2_BOOK_BATCHES.flatMap((batch) => batch.pages);

export const MATH_G2_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g2",
  routeBase: "/learning/book/math/g2",
  bookTitleHe: "ספר חשבון — כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/math/g2/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG2PageNeighbors(pageId) {
  const index = MATH_G2_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? MATH_G2_PAGE_ORDER[index - 1] : null,
    next: index < MATH_G2_PAGE_ORDER.length - 1 ? MATH_G2_PAGE_ORDER[index + 1] : null,
    index,
  };
}

export function isValidMathG2PageId(pageId) {
  return MATH_G2_PAGE_ORDER.includes(pageId);
}
