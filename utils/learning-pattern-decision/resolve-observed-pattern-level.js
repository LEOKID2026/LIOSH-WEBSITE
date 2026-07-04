/**
 * observedPatternLevel — subject-agnostic staging helper.
 */
import {
  resolveObservedPatternLevelFromPatterns,
  resolveRepeatedMistakePatterns,
} from "./resolve-repeated-mistake-patterns.js";

/**
 * @param {object} p
 * @param {number} p.questionCount
 * @param {number} p.wrongCount
 * @param {import("../mistake-event.js").MistakeEventV1[]} [p.wrongEvents]
 * @param {boolean} [p.hasPositiveDominance]
 */
export function resolveObservedPatternLevel({ questionCount, wrongCount, wrongEvents = [], hasPositiveDominance = false }) {
  const q = Math.max(0, Number(questionCount) || 0);
  const w = Math.max(0, Number(wrongCount) || 0);
  if (q === 0) return "none";

  const repeated = resolveRepeatedMistakePatterns(wrongEvents);
  if (repeated.length) {
    return resolveObservedPatternLevelFromPatterns(repeated, q);
  }

  if (hasPositiveDominance && q >= 5 && w === 0) return "observed";
  if (w >= 2 && q >= 3) return "observed";
  return "none";
}

export { resolveRepeatedMistakePatterns, resolveObservedPatternLevelFromPatterns };
