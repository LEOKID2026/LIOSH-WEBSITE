/**
 * Within-page difficulty consistency checks for worksheets.
 * @module lib/worksheets/worksheet-page-consistency.server
 */

import {
  checkMathQuestionBounds,
  mathUniformityScore,
} from "./worksheet-math-content-bounds.server.js";

/**
 * @param {number[]} scores
 */
export function pageSpreadMetrics(scores) {
  if (!scores.length) return { min: 0, max: 0, ratio: 0, spreadExtreme: false };
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const ratio = min > 0 ? max / min : max;
  const spreadExtreme = ratio >= 50 || (max >= 1000 && min <= 30);
  return { min, max, ratio, spreadExtreme };
}

/**
 * @param {Record<string, unknown>} candidate
 * @param {Record<string, unknown>[]} existing
 * @param {Object} ctx
 * @param {string} ctx.subjectId
 * @param {string} ctx.topicKey
 * @returns {boolean}
 */
export function wouldBreakPageConsistency(candidate, existing, ctx) {
  if (!existing.length) return false;
  const { subjectId, topicKey } = ctx;

  if (subjectId === "math") {
    const scores = existing.map((q) => mathUniformityScore(q, topicKey));
    const next = mathUniformityScore(candidate, topicKey);
    const { spreadExtreme } = pageSpreadMetrics([...scores, next]);
    return spreadExtreme;
  }

  if (subjectId === "hebrew" || subjectId === "english") {
    const wordCount = (text) =>
      String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    const scores = existing.map((q) => wordCount(q.question || q.exerciseText));
    const next = wordCount(candidate.question || candidate.exerciseText);
    if (scores.length >= 2) {
      const { spreadExtreme } = pageSpreadMetrics([...scores, next]);
      if (spreadExtreme && Math.abs(next - Math.min(...scores)) < 3) return true;
    }
  }

  return false;
}

/**
 * @param {Record<string, unknown>[]} questions
 * @param {Object} ctx
 * @param {string} ctx.subjectId
 * @param {string} ctx.topicKey
 * @param {string} [ctx.displayLevel]
 */
export function analyzePageUniformity(questions, ctx) {
  const { subjectId, topicKey } = ctx;
  if (subjectId === "math") {
    const scores = questions.map((q) => mathUniformityScore(q, topicKey));
    return pageSpreadMetrics(scores);
  }
  const scores = questions.map((q) => {
    const t = String(q.question || q.exerciseText || "");
    return t.split(/\s+/).filter(Boolean).length;
  });
  return pageSpreadMetrics(scores);
}

/**
 * Advanced should not be easier than regular on average for math.
 * @param {Record<string, unknown>} q
 * @param {"regular"|"advanced"} displayLevel
 * @param {string} sourceDifficulty
 */
export function mathDisplayLevelMismatch(q, displayLevel, sourceDifficulty) {
  if (displayLevel === "advanced" && sourceDifficulty !== "hard") {
    return true;
  }
  if (displayLevel === "regular" && sourceDifficulty === "hard") {
    const bounds = checkMathQuestionBounds(q, {
      gradeKey: String(q.gradeLevel || "g3"),
      topicKey: String(q.topic || q.operation || ""),
      sourceDifficulty: "hard",
    });
    if (!bounds.flags.some((f) => f.startsWith("too_hard"))) return true;
  }
  return false;
}
