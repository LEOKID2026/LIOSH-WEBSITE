/**
 * Grade 3 Math Learning Book — internal TOC registry.
 * Content files: docs/learning-book/math/g3/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG3Batch */

/** @type {MathG3Batch[]} */
export const MATH_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "יסודות מספרים, השוואה וסדרות",
    pages: [
      "ns_place_hundreds",
      "ns_neighbors",
      "ns_complement10",
      "ns_complement100",
      "ns_even_odd",
      "cmp",
      "sequence",
    ],
  },
  {
    id: "b",
    titleHe: "חיבור, חיסור, כפל וחילוק",
    pages: [
      "add_two",
      "sub_two",
      "add_three",
      "mul",
      "mul_tens",
      "mul_hundreds",
      "div",
      "div_with_remainder",
      "divisibility",
    ],
  },
  {
    id: "c",
    titleHe: "משוואות, עשרוניים וסדר פעולות",
    pages: [
      "eq_add",
      "eq_sub",
      "dec_add",
      "dec_sub",
      "order_add_mul",
      "order_mul_sub",
      "order_parentheses",
    ],
  },
  {
    id: "d",
    titleHe: "שאלות מילוליות",
    pages: ["wp_comparison_more", "wp_leftover", "wp_time_sum"],
  },
];

/** Flat reading order for prev/next navigation */
export const MATH_G3_PAGE_ORDER = MATH_G3_BOOK_BATCHES.flatMap((batch) => batch.pages);

export const MATH_G3_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g3",
  routeBase: "/learning/book/math/g3",
  bookTitleHe: "ספר חשבון — כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/math/g3/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG3PageNeighbors(pageId) {
  const index = MATH_G3_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? MATH_G3_PAGE_ORDER[index - 1] : null,
    next: index < MATH_G3_PAGE_ORDER.length - 1 ? MATH_G3_PAGE_ORDER[index + 1] : null,
    index,
  };
}

export function isValidMathG3PageId(pageId) {
  return MATH_G3_PAGE_ORDER.includes(pageId);
}
