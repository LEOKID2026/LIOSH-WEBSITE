import { isValidMathG1PageId, MATH_G1_BOOK_META } from "./math-g1-registry";

/** Direct skill/kind → book pageId (Grade 1 spine) */
const KIND_TO_PAGE = Object.freeze({
  ns_counting_forward: "ns_counting_forward",
  ns_counting_backward: "ns_counting_backward",
  ns_number_line: "ns_number_line",
  ns_neighbors: "ns_neighbors",
  cmp: "cmp",
  ns_place_tens_units: "ns_place_tens_units",
  ns_even_odd: "ns_even_odd",
  ns_complement10: "ns_complement10",
  add_second_decade: "add_second_decade",
  add_tens_only: "add_tens_only",
  add_two: "add_two",
  sub_two: "sub_two",
  eq_add_simple: "eq_add_simple",
  eq_sub_simple: "eq_sub_simple",
  mul: "mul",
  wp_coins: "wp_coins",
  wp_coins_spent: "wp_coins_spent",
  wp_time_date: "wp_time_date",
  wp_time_days: "wp_time_days",
});

/** Safe operation fallback when no specific kind is known */
const OPERATION_TO_PAGE = Object.freeze({
  addition: "add_two",
  subtraction: "sub_two",
  multiplication: "mul",
  compare: "cmp",
  number_sense: "ns_number_line",
});

/**
 * Resolve the best Grade 1 book page for the current math session context.
 * Returns null when grade is not g1 or there is no confident match.
 *
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null} pageId
 */
export function resolveMathG1BookPageId({ grade, operation, kind }) {
  if (grade !== "g1") return null;

  const kindKey = String(kind || "").trim();
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG1PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed") return null;

  if (op === "word_problems") {
    if (kindKey === "wp_time_days" || kindKey === "wp_time_date") {
      return KIND_TO_PAGE[kindKey];
    }
    if (kindKey === "wp_coins_spent") return "wp_coins_spent";
    if (kindKey === "wp_coins") return "wp_coins";
    return null;
  }

  const fromOp = OPERATION_TO_PAGE[op];
  if (fromOp && isValidMathG1PageId(fromOp)) {
    return fromOp;
  }

  return null;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null} href or null to hide entry
 */
export function getMathG1BookHref(ctx) {
  const pageId = resolveMathG1BookPageId(ctx);
  if (!pageId) return null;
  return `${MATH_G1_BOOK_META.routeBase}/${pageId}`;
}
