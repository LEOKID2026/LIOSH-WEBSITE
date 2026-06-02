/**
 * Grade 6 Math Learning Book — internal TOC registry.
 * Content files: docs/learning-book/math/g6/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG6Batch */

/** @type {MathG6Batch[]} */
export const MATH_G6_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "ערך מקום, השוואה, סדרות ועיגול",
    pages: ["ns_place_hundreds", "ns_neighbors", "ns_complement100", "cmp", "sequence", "round"],
  },
  {
    id: "b",
    titleHe: "חיבור, חיסור, כפל וחילוק",
    pages: ["add_two", "sub_two", "add_three", "mul", "div", "div_with_remainder"],
  },
  {
    id: "c",
    titleHe: "גורמים, כפולות ומ.א.ח",
    pages: ["fm_factor", "fm_multiple", "fm_gcd"],
  },
  {
    id: "d",
    titleHe: "משוואות",
    pages: ["eq_add", "eq_sub", "eq_mul", "eq_div"],
  },
  {
    id: "e",
    titleHe: "מספרים עשרוניים",
    pages: [
      "dec_add",
      "dec_sub",
      "dec_multiply",
      "dec_multiply_10_100",
      "dec_divide",
      "dec_divide_10_100",
      "dec_repeating",
    ],
  },
  {
    id: "f",
    titleHe: "שברים — כפל, חילוק וחיבור לחילוק",
    pages: ["frac_as_division", "frac_multiply", "frac_divide"],
  },
  {
    id: "g",
    titleHe: "יחס וקנה מידה",
    pages: [
      "ratio_first",
      "ratio_second",
      "ratio_find",
      "scale_find",
      "scale_map_to_real",
      "scale_real_to_map",
    ],
  },
  {
    id: "h",
    titleHe: "אחוזים",
    pages: ["perc_part_of", "perc_discount"],
  },
  {
    id: "i",
    titleHe: "שאלות מילוליות",
    pages: [
      "wp_comparison_more",
      "wp_leftover",
      "wp_time_sum",
      "wp_distance_time",
      "wp_shop_discount",
      "wp_unit_cm_to_m",
      "wp_unit_g_to_kg",
    ],
  },
];

/** Flat reading order for prev/next navigation */
export const MATH_G6_PAGE_ORDER = MATH_G6_BOOK_BATCHES.flatMap((batch) => batch.pages);

export const MATH_G6_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g6",
  routeBase: "/learning/book/math/g6",
  bookTitleHe: "ספר חשבון — כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/math/g6/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG6PageNeighbors(pageId) {
  const index = MATH_G6_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? MATH_G6_PAGE_ORDER[index - 1] : null,
    next: index < MATH_G6_PAGE_ORDER.length - 1 ? MATH_G6_PAGE_ORDER[index + 1] : null,
    index,
  };
}

export function isValidMathG6PageId(pageId) {
  return MATH_G6_PAGE_ORDER.includes(pageId);
}
