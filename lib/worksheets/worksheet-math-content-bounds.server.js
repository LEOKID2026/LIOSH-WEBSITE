/**
 * Math worksheet content bounds — derived from GRADE_LEVELS SSOT.
 * @module lib/worksheets/worksheet-math-content-bounds.server
 */

import { GRADE_LEVELS } from "../../utils/math-constants.js";
import { getLevelConfig } from "../../utils/math-storage.js";

/**
 * @param {string} gradeKey
 * @returns {number}
 */
export function mathGradeNumberFromKey(gradeKey) {
  const n = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  return n >= 1 && n <= 6 ? n : 3;
}

/**
 * @param {Record<string, unknown>} q
 * @returns {number[]}
 */
export function extractMathOperands(q) {
  const nums = [];
  const push = (v) => {
    const n = Number(v);
    if (Number.isFinite(n)) nums.push(Math.abs(n));
  };
  push(q.a);
  push(q.b);
  push(q.params?.a);
  push(q.params?.b);
  push(q.params?.c);
  push(q.params?.d);
  if (Array.isArray(q.params?.operands)) {
    for (const o of q.params.operands) push(o);
  }
  const text = String(q.question || q.questionLabel || q.exerciseText || "");
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  if (matches) {
    for (const m of matches) push(m);
  }
  return [...new Set(nums)];
}

/**
 * @param {number} n
 * @returns {number}
 */
function digitCount(n) {
  return String(Math.floor(Math.abs(n))).replace(/^0+/, "").length || 1;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} sourceDifficulty
 */
export function mathGradeBounds(gradeKey, topicKey, sourceDifficulty) {
  const g = mathGradeNumberFromKey(gradeKey);
  const cfg = getLevelConfig(g, sourceDifficulty);
  const gl = GRADE_LEVELS[g]?.levels?.[sourceDifficulty] || {};
  const addMax = gl.addition?.max ?? cfg.addition?.max ?? 999999;
  const subMax = gl.subtraction?.max ?? cfg.subtraction?.max ?? 999999;
  const mulMax = gl.multiplication?.max ?? cfg.multiplication?.max ?? 999;
  return { addMax, subMax, mulMax, cfg, gl };
}

/**
 * Younger-grade reference ceiling for "too easy" detection.
 * @param {string} gradeKey
 * @param {string} topicKey
 */
export function youngerGradeEasyCeiling(gradeKey, topicKey) {
  const g = mathGradeNumberFromKey(gradeKey);
  if (g <= 1) return { maxOperand: 10, maxSum: 20, refGrade: "g1" };
  const younger = g - 1;
  const yKey = `g${younger}`;
  const yGl = GRADE_LEVELS[younger]?.levels?.medium || GRADE_LEVELS[younger]?.levels?.easy || {};
  if (topicKey === "addition" || topicKey === "subtraction") {
    const op = topicKey === "addition" ? "addition" : "subtraction";
    const max = yGl[op]?.max ?? 100;
    return { maxOperand: max, maxSum: max * 2, refGrade: yKey };
  }
  if (topicKey === "multiplication") {
    const max = yGl.multiplication?.max ?? 10;
    return { maxOperand: max, maxSum: max * max, refGrade: yKey };
  }
  return { maxOperand: 100, maxSum: 200, refGrade: yKey };
}

/**
 * @typedef {Object} MathBoundsCheckResult
 * @property {boolean} ok
 * @property {string[]} flags
 * @property {number} maxOperand
 * @property {number} minOperand
 * @property {number} sum
 * @property {number} maxDigits
 * @property {number} termCount
 * @property {string} kind
 */

/**
 * @param {Record<string, unknown>} q
 * @param {Object} ctx
 * @param {string} ctx.gradeKey
 * @param {string} ctx.topicKey
 * @param {string} ctx.sourceDifficulty
 * @param {"regular"|"advanced"} [ctx.displayLevel]
 * @returns {MathBoundsCheckResult}
 */
export function checkMathQuestionBounds(q, ctx) {
  const { gradeKey, topicKey, sourceDifficulty } = ctx;
  const g = mathGradeNumberFromKey(gradeKey);
  const kind = String(q.params?.kind || q.operation || "");
  const operands = extractMathOperands(q);
  const maxOp = operands.length ? Math.max(...operands) : 0;
  const minOp = operands.length ? Math.min(...operands) : 0;
  const sum = operands.reduce((a, b) => a + b, 0);
  const maxDigits = operands.length ? Math.max(...operands.map(digitCount)) : 0;
  const termCount = kind === "add_three" ? 3 : operands.length >= 3 ? operands.length : 2;
  const bounds = mathGradeBounds(gradeKey, topicKey, sourceDifficulty);
  const hardBounds = mathGradeBounds(gradeKey, topicKey, "hard");
  const younger = youngerGradeEasyCeiling(gradeKey, topicKey);

  /** @type {string[]} */
  const flags = [];

  if (topicKey === "addition" || topicKey === "subtraction") {
    if (termCount <= 2 && maxOp <= younger.maxOperand && sum <= younger.maxSum + 5) {
      flags.push(`too_easy_for_grade:operands<=${younger.maxOperand}`);
    }
    if (g >= 4 && termCount <= 2 && maxDigits <= 2 && maxOp <= 50) {
      flags.push("too_easy_for_grade:single_double_digit_in_upper_grade");
    }
  }

  if (topicKey === "multiplication" && kind === "mul" && maxOp <= 5 && g >= 3) {
    flags.push("too_easy_for_grade:mul_tables_low");
  }

  if (topicKey === "addition" && maxOp > hardBounds.addMax * 1.05) {
    flags.push(`too_hard_for_grade:operand>${hardBounds.addMax}`);
  }
  if (topicKey === "subtraction" && maxOp > hardBounds.subMax * 1.05) {
    flags.push(`too_hard_for_grade:operand>${hardBounds.subMax}`);
  }
  if (topicKey === "multiplication" && operands.length >= 2) {
    const a = operands[0];
    const b = operands[1];
    const tensKinds = new Set(["mul_tens", "mul_hundreds", "mul_vertical", "mul_groups_g1", "mul_skip_count_g1"]);
    if (!tensKinds.has(kind)) {
      const mulCeiling = bounds.mulMax;
      if (a > mulCeiling * 1.05 || b > mulCeiling * 1.05) {
        flags.push(`too_hard_for_grade:mul_factor>${mulCeiling}`);
      }
    }
  }

  const tooHard = flags.some((f) => f.startsWith("too_hard"));
  const tooEasy = flags.some((f) => f.startsWith("too_easy"));

  return {
    ok: !tooHard && !tooEasy,
    flags,
    maxOperand: maxOp,
    minOperand: minOp,
    sum,
    maxDigits,
    termCount,
    kind,
    bounds: bounds.gl[topicKey] || bounds.addMax,
  };
}

/**
 * Score for page uniformity (higher = harder).
 * @param {Record<string, unknown>} q
 * @param {string} topicKey
 * @returns {number}
 */
export function mathUniformityScore(q, topicKey) {
  const operands = extractMathOperands(q);
  if (!operands.length) return 0;
  const maxOp = Math.max(...operands);
  const sum = operands.reduce((a, b) => a + b, 0);
  if (topicKey === "multiplication" && operands.length >= 2) {
    return operands[0] * operands[1];
  }
  return Math.max(maxOp, sum);
}
