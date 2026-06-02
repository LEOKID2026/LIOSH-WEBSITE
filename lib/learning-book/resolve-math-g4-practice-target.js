import { GRADES } from "../../utils/math-constants";
import { isValidMathG4PageId } from "./math-g4-registry";

/**
 * @typedef {{ grade: "g4", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG4PracticeTarget
 */

/**
 * @param {string} pageId
 * @returns {MathG4PracticeTarget|null}
 */
export function resolveMathG4PracticeTarget(pageId) {
  if (!isValidMathG4PageId(pageId)) return null;

  /** @type {Record<string, { operation: string, forceKind: string }>} */
  const PAGE_TO_PRACTICE = {
    ns_place_hundreds: { operation: "number_sense", forceKind: "ns_place_hundreds" },
    ns_neighbors: { operation: "number_sense", forceKind: "ns_neighbors" },
    ns_complement100: { operation: "number_sense", forceKind: "ns_complement100" },
    ns_complement10: { operation: "number_sense", forceKind: "ns_complement10" },
    ns_even_odd: { operation: "number_sense", forceKind: "ns_even_odd" },
    cmp: { operation: "compare", forceKind: "cmp" },
    sequence: { operation: "sequences", forceKind: "sequence" },
    round: { operation: "rounding", forceKind: "round" },
    zero_add: { operation: "zero_one_properties", forceKind: "zero_add" },
    zero_sub: { operation: "zero_one_properties", forceKind: "zero_sub" },
    zero_mul: { operation: "zero_one_properties", forceKind: "zero_mul" },
    one_mul: { operation: "zero_one_properties", forceKind: "one_mul" },
    add_two: { operation: "addition", forceKind: "add_two" },
    sub_two: { operation: "subtraction", forceKind: "sub_two" },
    add_three: { operation: "addition", forceKind: "add_three" },
    mul: { operation: "multiplication", forceKind: "mul" },
    mul_vertical: { operation: "multiplication", forceKind: "mul_vertical" },
    div: { operation: "division", forceKind: "div" },
    div_with_remainder: {
      operation: "division_with_remainder",
      forceKind: "div_with_remainder",
    },
    div_long: { operation: "division", forceKind: "div_long" },
    divisibility: { operation: "divisibility", forceKind: "divisibility" },
    prime_composite: { operation: "prime_composite", forceKind: "prime_composite" },
    fm_factor: { operation: "factors_multiples", forceKind: "fm_factor" },
    fm_multiple: { operation: "factors_multiples", forceKind: "fm_multiple" },
    fm_gcd: { operation: "factors_multiples", forceKind: "fm_gcd" },
    dec_add: { operation: "decimals", forceKind: "dec_add" },
    dec_sub: { operation: "decimals", forceKind: "dec_sub" },
    eq_add: { operation: "equations", forceKind: "eq_add" },
    eq_sub: { operation: "equations", forceKind: "eq_sub" },
    est_add: { operation: "estimation", forceKind: "est_add" },
    est_mul: { operation: "estimation", forceKind: "est_mul" },
    est_quantity: { operation: "estimation", forceKind: "est_quantity" },
    power_base: { operation: "powers", forceKind: "power_base" },
    power_calc: { operation: "powers", forceKind: "power_calc" },
    wp_comparison_more: {
      operation: "word_problems",
      forceKind: "wp_comparison_more",
    },
    wp_leftover: { operation: "word_problems", forceKind: "wp_leftover" },
    wp_time_sum: { operation: "word_problems", forceKind: "wp_time_sum" },
  };

  const entry = PAGE_TO_PRACTICE[pageId];
  if (!entry) return null;

  const gradeCfg = GRADES.g4;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g4",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

export function hasMathG4PracticeTarget(pageId) {
  return resolveMathG4PracticeTarget(pageId) != null;
}
