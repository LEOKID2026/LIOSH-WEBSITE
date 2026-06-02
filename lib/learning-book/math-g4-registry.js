/**
 * Grade 4 Math Learning Book — internal TOC registry.
 * Content files: docs/learning-book/math/g4/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} MathG4Batch */

/** @type {MathG4Batch[]} */
export const MATH_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "ערך מקום, השוואה, סדרות ועיגול",
    pages: [
      "ns_place_hundreds",
      "ns_neighbors",
      "ns_complement100",
      "ns_complement10",
      "ns_even_odd",
      "cmp",
      "sequence",
      "round",
    ],
  },
  {
    id: "b",
    titleHe: "תכונות 0 ו-1",
    pages: ["zero_add", "zero_sub", "zero_mul", "one_mul"],
  },
  {
    id: "c",
    titleHe: "חיבור, חיסור וכפל",
    pages: ["add_two", "sub_two", "add_three", "mul", "mul_vertical"],
  },
  {
    id: "d",
    titleHe: "חילוק, התחלקות, ראשוניים, גורמים וכפולים",
    pages: [
      "div",
      "div_with_remainder",
      "div_long",
      "divisibility",
      "prime_composite",
      "fm_factor",
      "fm_multiple",
      "fm_gcd",
    ],
  },
  {
    id: "e",
    titleHe: "עשרוניים, משוואות ואומדן",
    pages: [
      "dec_add",
      "dec_sub",
      "eq_add",
      "eq_sub",
      "est_add",
      "est_mul",
      "est_quantity",
    ],
  },
  {
    id: "f",
    titleHe: "חזקות",
    pages: ["power_base", "power_calc"],
  },
  {
    id: "g",
    titleHe: "שאלות מילוליות",
    pages: ["wp_comparison_more", "wp_leftover", "wp_time_sum"],
  },
];

/** Flat reading order for prev/next navigation */
export const MATH_G4_PAGE_ORDER = MATH_G4_BOOK_BATCHES.flatMap((batch) => batch.pages);

export const MATH_G4_BOOK_META = Object.freeze({
  subject: "math",
  grade: "g4",
  routeBase: "/learning/book/math/g4",
  bookTitleHe: "ספר חשבון — כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/math/g4/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getMathG4PageNeighbors(pageId) {
  const index = MATH_G4_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? MATH_G4_PAGE_ORDER[index - 1] : null,
    next: index < MATH_G4_PAGE_ORDER.length - 1 ? MATH_G4_PAGE_ORDER[index + 1] : null,
    index,
  };
}

export function isValidMathG4PageId(pageId) {
  return MATH_G4_PAGE_ORDER.includes(pageId);
}
