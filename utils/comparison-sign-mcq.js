/** Comparison-sign MCQ (`params.kind === "cmp"` / `operation === "compare"`): exactly {>, =, <}. */

import {
  buildComparisonConclusionRuns,
  proseRun,
} from "../lib/learning-book/learning-math-line-templates.js";

export const COMPARISON_SIGN_OPTIONS = [">", "=", "<"];

/** Student-visible order: less, equal, greater — rendered inside `dir="ltr"`. */
export const COMPARISON_SIGN_DISPLAY_ORDER = ["<", "=", ">"];

const COMPARISON_SIGN_SET = new Set(COMPARISON_SIGN_OPTIONS);

/** Left-to-right mark — prevents bidi mirroring of < > in RTL prose (display only). */
export const COMPARISON_SIGN_LRM = "\u200E";

/** @param {unknown} q */
export function isComparisonSignMcq(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  if (params.kind === "cmp") return true;
  if (String(q?.operation || "") === "compare") {
    const { a, b } = coerceComparisonOperands(params.a ?? q?.a, params.b ?? q?.b);
    return a != null && b != null;
  }
  return false;
}

/** @param {unknown} token */
export function isComparisonSignToken(token) {
  return COMPARISON_SIGN_SET.has(String(token ?? "").trim());
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {{ a: number|null, b: number|null }}
 */
export function coerceComparisonOperands(left, right) {
  const a = Number(left);
  const b = Number(right);
  return {
    a: Number.isFinite(a) ? a : null,
    b: Number.isFinite(b) ? b : null,
  };
}

/**
 * Single canonical comparison sign for `left __ right`.
 * @param {unknown} left
 * @param {unknown} right
 * @returns {">"|"="|"<"|null}
 */
export function getCanonicalComparisonSign(left, right) {
  const { a, b } = coerceComparisonOperands(left, right);
  if (a == null || b == null) return null;
  if (a > b) return ">";
  if (a < b) return "<";
  return "=";
}

/** @alias getCanonicalComparisonSign */
export const computeComparisonSign = getCanonicalComparisonSign;

/** @alias getCanonicalComparisonSign */
export const getComparisonSign = getCanonicalComparisonSign;

/**
 * Operand-based canonical answer (ignores stale correctAnswer strings).
 * @param {unknown} q
 * @returns {">"|"="|"<"|null}
 */
export function resolveCanonicalComparisonSignAnswer(q) {
  if (!isComparisonSignMcq(q)) return null;
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  return getCanonicalComparisonSign(params.a ?? q?.a, params.b ?? q?.b);
}

/**
 * Embed sign in RTL Hebrew prose without bidi mirroring (display only — not stored value).
 * Uses LRM, not LRI/PDI (those break the mixed Hebrew/math text splitter).
 */
export function embedComparisonSignInRtlProse(sign) {
  const s = String(sign ?? "").trim();
  if (!isComparisonSignToken(s)) return s;
  return `${COMPARISON_SIGN_LRM}${s}${COMPARISON_SIGN_LRM}`;
}

/** @deprecated use embedComparisonSignInRtlProse */
export const isolateComparisonSignForDisplay = embedComparisonSignInRtlProse;

/** Plain LTR math fragment for mixed-text splitter (no bidi isolate chars). */
export function formatCompareMathExpression(left, right, sign) {
  return `${left} ${sign} ${right}`;
}

/**
 * Structured wrong-answer explanation runs for comparison-sign questions.
 * @param {unknown} q
 * @returns {import("../lib/learning-book/learning-math-line-templates.js").TemplateRun[]}
 */
export function buildComparisonSignWrongAnswerRuns(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  const { a: left, b: right } = coerceComparisonOperands(params.a ?? q?.a, params.b ?? q?.b);
  const sign = getCanonicalComparisonSign(left, right);
  if (left == null || right == null || !sign) {
    return [proseRun("בדקו איזה מספר גדול יותר ואיזה סימן מתאים ביניהם.")];
  }

  const relation = sign === ">" ? "gt" : sign === "<" ? "lt" : "eq";
  const signInProse = embedComparisonSignInRtlProse(sign);
  return [
    ...buildComparisonConclusionRuns({ left, right, relation }),
    proseRun(` הסימן הנכון הוא ${signInProse}.`),
  ];
}

/**
 * Wrong-answer feedback for comparison-sign questions (legacy string flatten).
 * @param {unknown} q
 */
export function buildComparisonSignWrongAnswerExplanation(q) {
  const runs = buildComparisonSignWrongAnswerRuns(q);
  return runs.map((r) => r.value).join("");
}

/**
 * Structured wrong-answer line object for React renderers.
 * @param {unknown} q
 */
export function buildComparisonSignWrongAnswerLine(q) {
  const runs = buildComparisonSignWrongAnswerRuns(q);
  return { __learningRuns: runs };
}

/**
 * @param {unknown} q
 * @param {unknown} [operation]
 */
export function shouldUseComparisonSignErrorExplanation(q, operation) {
  if (isComparisonSignMcq(q)) return true;
  if (String(operation || "") === "compare") return true;
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  if (String(params.kind || "") === "cmp") return true;
  const { a, b } = coerceComparisonOperands(params.a ?? q?.a, params.b ?? q?.b);
  if (a != null && b != null && isComparisonSignToken(q?.correctAnswer)) return true;
  return false;
}

/** @param {unknown[]} answers */
export function isExactComparisonSignOptionSet(answers) {
  if (!Array.isArray(answers) || answers.length !== 3) return false;
  const normalized = answers.map((a) => String(a ?? "").trim());
  if (new Set(normalized).size !== 3) return false;
  return normalized.every((opt) => COMPARISON_SIGN_SET.has(opt));
}

/**
 * Normalize cmp payload: numeric operands, canonical sign, fixed 3-choice set.
 * @param {Record<string, unknown>} q
 */
export function finalizeComparisonSignMcq(q) {
  if (!q || typeof q !== "object" || !isComparisonSignMcq(q)) return q;

  const params =
    q.params && typeof q.params === "object"
      ? { .../** @type {Record<string, unknown>} */ (q.params) }
      : {};
  if (!params.kind) params.kind = "cmp";

  const coerced = coerceComparisonOperands(params.a ?? q.a, params.b ?? q.b);
  const sign = getCanonicalComparisonSign(coerced.a, coerced.b);
  if (!sign) return q;

  const out = {
    ...q,
    params: { ...params, a: coerced.a, b: coerced.b, comparisonSign: sign },
    correctAnswer: sign,
    answers: [...COMPARISON_SIGN_DISPLAY_ORDER],
  };
  if (coerced.a != null) out.a = coerced.a;
  if (coerced.b != null) out.b = coerced.b;
  return out;
}

/**
 * Full trace object for QA — every answer-related field for one comparison row.
 * @param {Record<string, unknown>} q
 * @param {unknown} [selected]
 */
export function traceComparisonSignFields(q, selected = null) {
  const finalized = finalizeComparisonSignMcq(q);
  const params =
    finalized.params && typeof finalized.params === "object" ? finalized.params : {};
  const left = params.a ?? finalized.a;
  const right = params.b ?? finalized.b;
  const canonicalSign = getCanonicalComparisonSign(left, right);
  const normalizedSelected =
    selected != null ? String(selected).trim() : null;
  const normalizedCorrect = String(finalized.correctAnswer ?? "").trim();
  return {
    left,
    right,
    canonicalSign,
    choices: finalized.answers,
    buttonLabel: normalizedSelected,
    buttonValue: normalizedSelected,
    selectedAnswer: normalizedSelected,
    normalizedSelectedAnswer: normalizedSelected,
    correctAnswer: normalizedCorrect,
    normalizedCorrectAnswer: normalizedCorrect,
    isCorrect:
      normalizedSelected != null &&
      canonicalSign != null &&
      normalizedSelected === canonicalSign,
    feedbackCorrectAnswer: canonicalSign,
    bannerCorrectAnswer: canonicalSign,
    explanationSign: canonicalSign,
    stepByStepSign: canonicalSign,
    previousExerciseSign: canonicalSign,
  };
}
