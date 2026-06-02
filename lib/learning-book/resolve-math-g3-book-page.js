import { isValidMathG3PageId, MATH_G3_BOOK_META } from "./math-g3-registry";

/** Direct skill/kind → book pageId (Grade 3 spine) */
const KIND_TO_PAGE = Object.freeze({
  ns_place_hundreds: "ns_place_hundreds",
  ns_neighbors: "ns_neighbors",
  ns_complement10: "ns_complement10",
  ns_complement100: "ns_complement100",
  ns_even_odd: "ns_even_odd",
  cmp: "cmp",
  sequence: "sequence",
  add_two: "add_two",
  sub_two: "sub_two",
  add_three: "add_three",
  mul: "mul",
  mul_tens: "mul_tens",
  mul_hundreds: "mul_hundreds",
  div: "div",
  div_with_remainder: "div_with_remainder",
  divisibility: "divisibility",
  eq_add: "eq_add",
  eq_sub: "eq_sub",
  dec_add: "dec_add",
  dec_sub: "dec_sub",
  order_add_mul: "order_add_mul",
  order_mul_sub: "order_mul_sub",
  order_parentheses: "order_parentheses",
  wp_comparison_more: "wp_comparison_more",
  wp_leftover: "wp_leftover",
  wp_time_sum: "wp_time_sum",
});

const KIND_ALIASES = Object.freeze({
  place_hundreds: "ns_place_hundreds",
  neighbors: "ns_neighbors",
  complement10: "ns_complement10",
  complement100: "ns_complement100",
  even_odd: "ns_even_odd",
  seq_inline: "sequence",
  seq_pattern_gap: "sequence",
  seq_arithmetic_explicit: "sequence",
  seq_continue: "sequence",
});

/**
 * Operation → pageId only when the practice topic is a single confident book page.
 */
const OPERATION_TO_PAGE = Object.freeze({
  addition: "add_two",
  subtraction: "sub_two",
  multiplication: "mul",
  division: "div",
  compare: "cmp",
  decimals: "dec_add",
  sequences: "sequence",
});

function normalizeKindKey(kind) {
  const key = String(kind || "").trim();
  if (!key) return "";
  return KIND_ALIASES[key] || key;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null} pageId
 */
export function resolveMathG3BookPageId({ grade, operation, kind }) {
  if (grade !== "g3") return null;

  const kindKey = normalizeKindKey(kind);
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG3PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed" || op === "number_sense" || op === "order_of_operations") {
    return null;
  }

  if (op === "word_problems") {
    const wpKinds = ["wp_comparison_more", "wp_leftover", "wp_time_sum"];
    if (kindKey && wpKinds.includes(kindKey) && isValidMathG3PageId(kindKey)) {
      return kindKey;
    }
    return null;
  }

  const fromOp = OPERATION_TO_PAGE[op];
  if (fromOp && isValidMathG3PageId(fromOp)) {
    return fromOp;
  }

  return null;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getMathG3BookHref(ctx) {
  const pageId = resolveMathG3BookPageId(ctx);
  if (!pageId) return null;
  return `${MATH_G3_BOOK_META.routeBase}/${pageId}`;
}
