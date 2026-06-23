import { GRADES } from "../../utils/math-constants";
import { isValidMathG3PageId } from "./math-g3-registry";

/**
 * @typedef {{ grade: "g3", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG3PracticeTarget
 */

/**
 * Grade 3 book pageId → Math Master practice preset (operation + forced question kind).
 *
 * @param {string} pageId
 * @returns {MathG3PracticeTarget|null}
 */
export function resolveMathG3PracticeTarget(pageId) {
  if (!isValidMathG3PageId(pageId)) return null;

  /** @type {Record<string, { operation: string, forceKind: string }>} */
  const PAGE_TO_PRACTICE = {
    ns_place_hundreds: { operation: "number_sense", forceKind: "ns_place_hundreds" },
    ns_neighbors: { operation: "number_sense", forceKind: "ns_neighbors" },
    ns_complement10: { operation: "number_sense", forceKind: "ns_complement10" },
    ns_complement100: { operation: "number_sense", forceKind: "ns_complement100" },
    ns_even_odd: { operation: "number_sense", forceKind: "ns_even_odd" },
    cmp: { operation: "compare", forceKind: "cmp" },
    sequence: { operation: "sequences", forceKind: "sequence" },
    add_two: { operation: "addition", forceKind: "add_two" },
    sub_two: { operation: "subtraction", forceKind: "sub_two" },
    add_three: { operation: "addition", forceKind: "add_three" },
    mul: { operation: "multiplication", forceKind: "mul" },
    mul_tens: { operation: "multiplication", forceKind: "mul_tens" },
    mul_hundreds: { operation: "multiplication", forceKind: "mul_hundreds" },
    div: { operation: "division", forceKind: "div" },
    div_with_remainder: {
      operation: "division_with_remainder",
      forceKind: "div_with_remainder",
    },
    divisibility: { operation: "divisibility", forceKind: "divisibility" },
    fractions: { operation: "fractions", forceKind: "frac_half" },
    eq_add: { operation: "order_of_operations", forceKind: "eq_add" },
    eq_sub: { operation: "order_of_operations", forceKind: "eq_sub" },
    dec_add: { operation: "decimals", forceKind: "dec_add" },
    dec_sub: { operation: "decimals", forceKind: "dec_sub" },
    order_add_mul: { operation: "order_of_operations", forceKind: "order_add_mul" },
    order_mul_sub: { operation: "order_of_operations", forceKind: "order_mul_sub" },
    order_parentheses: {
      operation: "order_of_operations",
      forceKind: "order_parentheses",
    },
    wp_comparison_more: {
      operation: "word_problems",
      forceKind: "wp_comparison_more",
    },
    wp_leftover: { operation: "word_problems", forceKind: "wp_leftover" },
    wp_time_sum: { operation: "word_problems", forceKind: "wp_time_sum" },
  };

  const entry = PAGE_TO_PRACTICE[pageId];
  if (!entry) return null;

  const gradeCfg = GRADES.g3;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g3",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

/**
 * @param {string} pageId
 * @returns {boolean}
 */
export function hasMathG3PracticeTarget(pageId) {
  return resolveMathG3PracticeTarget(pageId) != null;
}
