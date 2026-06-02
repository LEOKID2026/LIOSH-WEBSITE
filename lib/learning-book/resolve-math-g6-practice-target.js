import { GRADES } from "../../utils/math-constants";
import { isValidMathG6PageId } from "./math-g6-registry";

/**
 * @typedef {{ grade: "g6", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG6PracticeTarget
 */

/**
 * @param {string} pageId
 * @returns {MathG6PracticeTarget|null}
 */
export function resolveMathG6PracticeTarget(pageId) {
  if (!isValidMathG6PageId(pageId)) return null;

  /** @type {Record<string, { operation: string, forceKind: string }>} */
  const PAGE_TO_PRACTICE = {
    ns_place_hundreds: { operation: "number_sense", forceKind: "ns_place_hundreds" },
    ns_neighbors: { operation: "number_sense", forceKind: "ns_neighbors" },
    ns_complement100: { operation: "number_sense", forceKind: "ns_complement100" },
    cmp: { operation: "compare", forceKind: "cmp" },
    sequence: { operation: "sequences", forceKind: "sequence" },
    round: { operation: "rounding", forceKind: "round" },
    add_two: { operation: "addition", forceKind: "add_two" },
    sub_two: { operation: "subtraction", forceKind: "sub_two" },
    add_three: { operation: "addition", forceKind: "add_three" },
    mul: { operation: "multiplication", forceKind: "mul" },
    div: { operation: "division", forceKind: "div" },
    div_with_remainder: {
      operation: "division_with_remainder",
      forceKind: "div_with_remainder",
    },
    fm_factor: { operation: "factors_multiples", forceKind: "fm_factor" },
    fm_multiple: { operation: "factors_multiples", forceKind: "fm_multiple" },
    fm_gcd: { operation: "factors_multiples", forceKind: "fm_gcd" },
    eq_add: { operation: "equations", forceKind: "eq_add" },
    eq_sub: { operation: "equations", forceKind: "eq_sub" },
    eq_mul: { operation: "equations", forceKind: "eq_mul" },
    eq_div: { operation: "equations", forceKind: "eq_div" },
    dec_add: { operation: "decimals", forceKind: "dec_add" },
    dec_sub: { operation: "decimals", forceKind: "dec_sub" },
    dec_multiply: { operation: "decimals", forceKind: "dec_multiply" },
    dec_multiply_10_100: {
      operation: "decimals",
      forceKind: "dec_multiply_10_100",
    },
    dec_divide: { operation: "decimals", forceKind: "dec_divide" },
    dec_divide_10_100: {
      operation: "decimals",
      forceKind: "dec_divide_10_100",
    },
    dec_repeating: { operation: "decimals", forceKind: "dec_repeating" },
    frac_as_division: { operation: "fractions", forceKind: "frac_as_division" },
    frac_multiply: { operation: "fractions", forceKind: "frac_multiply" },
    frac_divide: { operation: "fractions", forceKind: "frac_divide" },
    ratio_first: { operation: "ratio", forceKind: "ratio_first" },
    ratio_second: { operation: "ratio", forceKind: "ratio_second" },
    ratio_find: { operation: "ratio", forceKind: "ratio_find" },
    scale_find: { operation: "scale", forceKind: "scale_find" },
    scale_map_to_real: { operation: "scale", forceKind: "scale_map_to_real" },
    scale_real_to_map: { operation: "scale", forceKind: "scale_real_to_map" },
    perc_part_of: { operation: "percentages", forceKind: "perc_part_of" },
    perc_discount: { operation: "percentages", forceKind: "perc_discount" },
    wp_comparison_more: {
      operation: "word_problems",
      forceKind: "wp_comparison_more",
    },
    wp_leftover: { operation: "word_problems", forceKind: "wp_leftover" },
    wp_time_sum: { operation: "word_problems", forceKind: "wp_time_sum" },
    wp_distance_time: {
      operation: "word_problems",
      forceKind: "wp_distance_time",
    },
    wp_shop_discount: {
      operation: "word_problems",
      forceKind: "wp_shop_discount",
    },
    wp_unit_cm_to_m: {
      operation: "word_problems",
      forceKind: "wp_unit_cm_to_m",
    },
    wp_unit_g_to_kg: {
      operation: "word_problems",
      forceKind: "wp_unit_g_to_kg",
    },
  };

  const entry = PAGE_TO_PRACTICE[pageId];
  if (!entry) return null;

  const gradeCfg = GRADES.g6;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g6",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

export function hasMathG6PracticeTarget(pageId) {
  return resolveMathG6PracticeTarget(pageId) != null;
}
