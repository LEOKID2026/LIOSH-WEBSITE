import { GRADES } from "../../utils/math-constants";
import { isValidMathG2PageId } from "./math-g2-registry";

/**
 * @typedef {{ grade: "g2", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG2PracticeTarget
 */

/**
 * @param {string} pageId
 * @returns {MathG2PracticeTarget|null}
 */
export function resolveMathG2PracticeTarget(pageId) {
  if (!isValidMathG2PageId(pageId)) return null;

  /** @type {Record<string, { operation: string, forceKind: string }>} */
  const PAGE_TO_PRACTICE = {
    ns_place_tens_units: { operation: "number_sense", forceKind: "ns_place_tens_units" },
    ns_neighbors: { operation: "number_sense", forceKind: "ns_neighbors" },
    ns_complement10: { operation: "number_sense", forceKind: "ns_complement10" },
    ns_even_odd: { operation: "number_sense", forceKind: "ns_even_odd" },
    cmp: { operation: "compare", forceKind: "cmp" },
    add_two: { operation: "addition", forceKind: "add_two" },
    sub_two: { operation: "subtraction", forceKind: "sub_two" },
    add_vertical: { operation: "addition", forceKind: "add_vertical" },
    sub_vertical: { operation: "subtraction", forceKind: "sub_vertical" },
    mul: { operation: "multiplication", forceKind: "mul" },
    div: { operation: "division", forceKind: "div" },
    divisibility: { operation: "number_sense", forceKind: "divisibility" },
    frac_half: { operation: "fractions", forceKind: "frac_half" },
    frac_half_reverse: { operation: "fractions", forceKind: "frac_half_reverse" },
    frac_quarter: { operation: "fractions", forceKind: "frac_quarter" },
    frac_quarter_reverse: { operation: "fractions", forceKind: "frac_quarter_reverse" },
    wp_coins: { operation: "word_problems", forceKind: "wp_coins" },
    wp_coins_spent: { operation: "word_problems", forceKind: "wp_coins_spent" },
    wp_time_date: { operation: "word_problems", forceKind: "wp_time_date" },
    wp_time_days: { operation: "word_problems", forceKind: "wp_time_days" },
    wp_groups_g2: { operation: "word_problems", forceKind: "wp_groups_g2" },
    wp_division_simple: { operation: "word_problems", forceKind: "wp_division_simple" },
  };

  const entry = PAGE_TO_PRACTICE[pageId];
  if (!entry) return null;

  const gradeCfg = GRADES.g2;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g2",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

/**
 * @param {string} pageId
 * @returns {boolean}
 */
export function hasMathG2PracticeTarget(pageId) {
  return resolveMathG2PracticeTarget(pageId) != null;
}
