import { isValidMathG4PageId, MATH_G4_BOOK_META } from "./math-g4-registry";

/** Direct skill/kind → book pageId (Grade 4 spine) */
const KIND_TO_PAGE = Object.freeze({
  ns_place_hundreds: "ns_place_hundreds",
  ns_neighbors: "ns_neighbors",
  ns_complement100: "ns_complement100",
  ns_complement10: "ns_complement10",
  ns_even_odd: "ns_even_odd",
  cmp: "cmp",
  sequence: "sequence",
  round: "round",
  zero_add: "zero_add",
  zero_sub: "zero_sub",
  zero_mul: "zero_mul",
  one_mul: "one_mul",
  add_two: "add_two",
  sub_two: "sub_two",
  add_three: "add_three",
  mul: "mul",
  mul_vertical: "mul_vertical",
  div: "div",
  div_with_remainder: "div_with_remainder",
  div_long: "div_long",
  divisibility: "divisibility",
  prime_composite: "prime_composite",
  fm_factor: "fm_factor",
  fm_multiple: "fm_multiple",
  fm_gcd: "fm_gcd",
  dec_add: "dec_add",
  dec_sub: "dec_sub",
  eq_add: "eq_add",
  eq_sub: "eq_sub",
  est_add: "est_add",
  est_mul: "est_mul",
  est_quantity: "est_quantity",
  power_base: "power_base",
  power_calc: "power_calc",
  wp_comparison_more: "wp_comparison_more",
  wp_leftover: "wp_leftover",
  wp_time_sum: "wp_time_sum",
});

const KIND_ALIASES = Object.freeze({
  place_hundreds: "ns_place_hundreds",
  neighbors: "ns_neighbors",
  complement100: "ns_complement100",
  complement10: "ns_complement10",
  even_odd: "ns_even_odd",
  seq_inline: "sequence",
  seq_pattern_gap: "sequence",
  seq_arithmetic_explicit: "sequence",
  seq_continue: "sequence",
});

const OPERATION_TO_PAGE = Object.freeze({
  addition: "add_two",
  subtraction: "sub_two",
  multiplication: "mul",
  division: "div",
  compare: "cmp",
  decimals: "dec_add",
  sequences: "sequence",
  rounding: "round",
  divisibility: "divisibility",
  prime_composite: "prime_composite",
  powers: "power_base",
  zero_one_properties: "zero_add",
  equations: "eq_add",
  factors_multiples: "fm_factor",
  estimation: "est_add",
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
export function resolveMathG4BookPageId({ grade, operation, kind }) {
  if (grade !== "g4") return null;

  const kindKey = normalizeKindKey(kind);
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG4PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed" || op === "number_sense") {
    return null;
  }

  if (op === "word_problems") {
    const wpKinds = ["wp_comparison_more", "wp_leftover", "wp_time_sum"];
    if (kindKey && wpKinds.includes(kindKey) && isValidMathG4PageId(kindKey)) {
      return kindKey;
    }
    return null;
  }

  if (op === "division_with_remainder") {
    return isValidMathG4PageId("div_with_remainder") ? "div_with_remainder" : null;
  }

  const fromOp = OPERATION_TO_PAGE[op];
  if (fromOp && isValidMathG4PageId(fromOp)) {
    return fromOp;
  }

  return null;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getMathG4BookHref(ctx) {
  const pageId = resolveMathG4BookPageId(ctx);
  if (!pageId) return null;
  return `${MATH_G4_BOOK_META.routeBase}/${pageId}`;
}
