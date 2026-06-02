import { isValidMathG6PageId, MATH_G6_BOOK_META } from "./math-g6-registry";

/** Direct skill/kind → book pageId (Grade 6 spine) */
const KIND_TO_PAGE = Object.freeze({
  ns_place_hundreds: "ns_place_hundreds",
  ns_neighbors: "ns_neighbors",
  ns_complement100: "ns_complement100",
  cmp: "cmp",
  sequence: "sequence",
  round: "round",
  add_two: "add_two",
  sub_two: "sub_two",
  add_three: "add_three",
  mul: "mul",
  div: "div",
  div_with_remainder: "div_with_remainder",
  fm_factor: "fm_factor",
  fm_multiple: "fm_multiple",
  fm_gcd: "fm_gcd",
  eq_add: "eq_add",
  eq_sub: "eq_sub",
  eq_mul: "eq_mul",
  eq_div: "eq_div",
  dec_add: "dec_add",
  dec_sub: "dec_sub",
  dec_multiply: "dec_multiply",
  dec_multiply_10_100: "dec_multiply_10_100",
  dec_divide: "dec_divide",
  dec_divide_10_100: "dec_divide_10_100",
  dec_repeating: "dec_repeating",
  frac_as_division: "frac_as_division",
  frac_multiply: "frac_multiply",
  frac_divide: "frac_divide",
  ratio_first: "ratio_first",
  ratio_second: "ratio_second",
  ratio_find: "ratio_find",
  scale_find: "scale_find",
  scale_map_to_real: "scale_map_to_real",
  scale_real_to_map: "scale_real_to_map",
  perc_part_of: "perc_part_of",
  perc_discount: "perc_discount",
  wp_comparison_more: "wp_comparison_more",
  wp_leftover: "wp_leftover",
  wp_time_sum: "wp_time_sum",
  wp_distance_time: "wp_distance_time",
  wp_shop_discount: "wp_shop_discount",
  wp_unit_cm_to_m: "wp_unit_cm_to_m",
  wp_unit_g_to_kg: "wp_unit_g_to_kg",
});

const KIND_ALIASES = Object.freeze({
  place_hundreds: "ns_place_hundreds",
  neighbors: "ns_neighbors",
  complement100: "ns_complement100",
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
  fractions: "frac_multiply",
  ratios: "ratio_first",
  scale: "scale_find",
  percentages: "perc_part_of",
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
export function resolveMathG6BookPageId({ grade, operation, kind }) {
  if (grade !== "g6") return null;

  const kindKey = normalizeKindKey(kind);
  if (kindKey && KIND_TO_PAGE[kindKey] && isValidMathG6PageId(KIND_TO_PAGE[kindKey])) {
    return KIND_TO_PAGE[kindKey];
  }

  const op = String(operation || "").trim();

  if (op === "mixed" || op === "number_sense") {
    return null;
  }

  if (op === "word_problems") {
    const wpKinds = [
      "wp_comparison_more",
      "wp_leftover",
      "wp_time_sum",
      "wp_distance_time",
      "wp_shop_discount",
      "wp_unit_cm_to_m",
      "wp_unit_g_to_kg",
    ];
    if (kindKey && wpKinds.includes(kindKey) && isValidMathG6PageId(kindKey)) {
      return kindKey;
    }
    return null;
  }

  const fromOp = OPERATION_TO_PAGE[op];
  if (fromOp && isValidMathG6PageId(fromOp)) {
    return fromOp;
  }

  return null;
}

/**
 * @param {{ grade?: string, operation?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getMathG6BookHref(ctx) {
  const pageId = resolveMathG6BookPageId(ctx);
  if (!pageId) return null;
  return `${MATH_G6_BOOK_META.routeBase}/${pageId}`;
}
