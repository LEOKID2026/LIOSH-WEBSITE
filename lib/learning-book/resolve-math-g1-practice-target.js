import { GRADES } from "../../utils/math-constants";
import { isValidMathG1PageId } from "./math-g1-registry";

/**
 * @typedef {{ grade: "g1", mode: "learning", operation: string, forceKind: string, pageId: string }} MathG1PracticeTarget
 */

/**
 * Grade 1 book pageId → Math Master practice preset (operation + forced question kind).
 * Returns null when there is no confident, safe mapping.
 *
 * @param {string} pageId
 * @returns {MathG1PracticeTarget|null}
 */
export function resolveMathG1PracticeTarget(pageId) {
  if (!isValidMathG1PageId(pageId)) return null;

  /** @type {Record<string, { operation: string, forceKind: string }>} */
  const PAGE_TO_PRACTICE = {
    ns_counting_forward: { operation: "number_sense", forceKind: "ns_counting_forward" },
    ns_counting_backward: { operation: "number_sense", forceKind: "ns_counting_backward" },
    ns_number_line: { operation: "number_sense", forceKind: "ns_number_line" },
    ns_neighbors: { operation: "number_sense", forceKind: "ns_neighbors" },
    ns_place_tens_units: { operation: "number_sense", forceKind: "ns_place_tens_units" },
    ns_even_odd: { operation: "number_sense", forceKind: "ns_even_odd" },
    ns_complement10: { operation: "number_sense", forceKind: "ns_complement10" },
    cmp: { operation: "compare", forceKind: "cmp" },
    add_second_decade: { operation: "addition", forceKind: "add_second_decade" },
    add_tens_only: { operation: "addition", forceKind: "add_tens_only" },
    add_two: { operation: "addition", forceKind: "add_two" },
    sub_two: { operation: "subtraction", forceKind: "sub_two" },
    eq_add_simple: { operation: "addition", forceKind: "eq_add_simple" },
    eq_sub_simple: { operation: "subtraction", forceKind: "eq_sub_simple" },
    mul: { operation: "multiplication", forceKind: "mul" },
    wp_coins: { operation: "word_problems", forceKind: "wp_coins" },
    wp_coins_spent: { operation: "word_problems", forceKind: "wp_coins_spent" },
    wp_time_date: { operation: "word_problems", forceKind: "wp_time_date" },
    wp_time_days: { operation: "word_problems", forceKind: "wp_time_days" },
  };

  const entry = PAGE_TO_PRACTICE[pageId];
  if (!entry) return null;

  const gradeCfg = GRADES.g1;
  if (!gradeCfg?.operations?.includes(entry.operation)) return null;

  return {
    pageId,
    grade: "g1",
    mode: "learning",
    operation: entry.operation,
    forceKind: entry.forceKind,
  };
}

/**
 * @param {string} pageId
 * @returns {boolean}
 */
export function hasMathG1PracticeTarget(pageId) {
  return resolveMathG1PracticeTarget(pageId) != null;
}
