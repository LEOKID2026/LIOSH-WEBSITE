import { isValidMathG2PageId, MATH_G2_BOOK_META } from "./math-g2-registry";

/** Direct skill/kind → book pageId (Grade 2 spine) */
const KIND_TO_PAGE = Object.freeze({
  ns_place_tens_units: "ns_place_tens_units",
  ns_neighbors: "ns_neighbors",
  ns_complement10: "ns_complement10",
  ns_even_odd: "ns_even_odd",
  cmp: "cmp",
  add_two: "add_two",
  sub_two: "sub_two",
  add_vertical: "add_vertical",
  sub_vertical: "sub_vertical",
  mul: "mul",
  div: "div",
  divisibility: "divisibility",
  frac_half: "frac_half",
  frac_half_reverse: "frac_half_reverse",
  frac_quarter: "frac_quarter",
  frac_quarter_reverse: "frac_quarter_reverse",
  wp_coins: "wp_coins",
  wp_coins_spent: "wp_coins_spent",
  wp_time_date: "wp_time_date",
  wp_time_days: "wp_time_days",
  wp_groups_g2: "wp_groups_g2",
  wp_division_simple: "wp_division_simple",
});

const KIND_ALIASES = Object.freeze({
  place_tens_units: "ns_place_tens_units",
  neighbors: "ns_neighbors",
  complement10: "ns_complement10",
  even_odd: "ns_even_odd",
  wp_pocket_money: "wp_coins_spent",
  wp_groups: "wp_groups_g2",
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
export function resolveMathG2BookPageId({ grade, operation, kind }) {
  if (grade !== "g2") return null;

  const kindKey = normalizeKindKey(kind);
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG2PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed" || op === "number_sense" || op === "fractions") {
    return null;
  }

  if (op === "word_problems") {
    const wpKinds = [
      "wp_coins",
      "wp_coins_spent",
      "wp_time_date",
      "wp_time_days",
      "wp_groups_g2",
      "wp_division_simple",
    ];
    if (kindKey && wpKinds.includes(kindKey) && isValidMathG2PageId(kindKey)) {
      return kindKey;
    }
    return null;
  }

  const fromOp = OPERATION_TO_PAGE[op];
  if (fromOp && isValidMathG2PageId(fromOp)) {
    return fromOp;
  }

  return null;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getMathG2BookHref(ctx) {
  const pageId = resolveMathG2BookPageId(ctx);
  if (!pageId) return null;
  return `${MATH_G2_BOOK_META.routeBase}/${pageId}`;
}
