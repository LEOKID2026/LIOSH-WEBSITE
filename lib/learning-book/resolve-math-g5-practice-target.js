import { GRADES } from "../../utils/math-constants";
import { isValidMathG5PageId } from "./math-g5-registry";

/**
 * @typedef {{ grade: "g5", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG5PracticeTarget
 */

/**
 * @param {string} pageId
 * @returns {MathG5PracticeTarget|null}
 */
export function resolveMathG5PracticeTarget(pageId) {
  if (!isValidMathG5PageId(pageId)) return null;

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
    div_two_digit: { operation: "division", forceKind: "div_two_digit" },
    frac_reduce: { operation: "fractions", forceKind: "frac_reduce" },
    frac_expand: { operation: "fractions", forceKind: "frac_expand" },
    frac_add_sub: { operation: "fractions", forceKind: "frac_add_sub" },
    mixed_to_frac: { operation: "fractions", forceKind: "mixed_to_frac" },
    frac_to_mixed: { operation: "fractions", forceKind: "frac_to_mixed" },
    dec_add: { operation: "decimals", forceKind: "dec_add" },
    dec_sub: { operation: "decimals", forceKind: "dec_sub" },
    eq_add: { operation: "equations", forceKind: "eq_add" },
    eq_sub: { operation: "equations", forceKind: "eq_sub" },
    eq_mul: { operation: "equations", forceKind: "eq_mul" },
    eq_div: { operation: "equations", forceKind: "eq_div" },
    fm_factor: { operation: "factors_multiples", forceKind: "fm_factor" },
    fm_multiple: { operation: "factors_multiples", forceKind: "fm_multiple" },
    fm_gcd: { operation: "factors_multiples", forceKind: "fm_gcd" },
    est_add: { operation: "estimation", forceKind: "est_add" },
    est_mul: { operation: "estimation", forceKind: "est_mul" },
    est_quantity: { operation: "estimation", forceKind: "est_quantity" },
    perc_part_of: { operation: "percentages", forceKind: "perc_part_of" },
    perc_discount: { operation: "percentages", forceKind: "perc_discount" },
    wp_comparison_more: {
      operation: "word_problems",
      forceKind: "wp_comparison_more",
    },
    wp_leftover: { operation: "word_problems", forceKind: "wp_leftover" },
    wp_time_sum: { operation: "word_problems", forceKind: "wp_time_sum" },
    wp_multi_step: { operation: "word_problems", forceKind: "wp_multi_step" },
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

  const gradeCfg = GRADES.g5;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g5",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

export function hasMathG5PracticeTarget(pageId) {
  return resolveMathG5PracticeTarget(pageId) != null;
}
