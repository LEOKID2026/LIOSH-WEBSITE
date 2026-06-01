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

/** Generator / planner aliases → canonical kind keys */
const KIND_ALIASES = Object.freeze({
  counting_forward: "ns_counting_forward",
  counting_backward: "ns_counting_backward",
  number_line: "ns_number_line",
  neighbors: "ns_neighbors",
  place_tens_units: "ns_place_tens_units",
  even_odd: "ns_even_odd",
  complement10: "ns_complement10",
  wp_pocket_money: "wp_coins_spent",
  wp_simple_sub: "wp_coins_spent",
});

/**
 * Operation → pageId only when the practice topic is a single confident book page.
 * Omit umbrella topics (number_sense, word_problems, mixed) — no safe default.
 */
const OPERATION_TO_PAGE = Object.freeze({
  addition: "add_two",
  subtraction: "sub_two",
  multiplication: "mul",
  compare: "cmp",
});

function normalizeKindKey(kind) {
  const key = String(kind || "").trim();
  if (!key) return "";
  return KIND_ALIASES[key] || key;
}

/**
 * Resolve the best Grade 1 book page for the current math session context.
 * Returns null when grade is not g1 or there is no confident match.
 *
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null} pageId
 */
export function resolveMathG1BookPageId({ grade, operation, kind }) {
  if (grade !== "g1") return null;

  const kindKey = normalizeKindKey(kind);
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG1PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed" || op === "number_sense") return null;

  if (op === "word_problems") {
    if (
      kindKey === "wp_time_days" ||
      kindKey === "wp_time_date" ||
      kindKey === "wp_coins_spent" ||
      kindKey === "wp_coins"
    ) {
      return KIND_TO_PAGE[kindKey];
    }
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
