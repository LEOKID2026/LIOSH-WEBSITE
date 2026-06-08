/** Comparison-sign MCQ (`params.kind === "cmp"`): exactly {>, =, <}. */

export const COMPARISON_SIGN_OPTIONS = [">", "=", "<"];

/** Student-visible order: less, equal, greater — rendered inside `dir="ltr"`. */
export const COMPARISON_SIGN_DISPLAY_ORDER = ["<", "=", ">"];

const COMPARISON_SIGN_SET = new Set(COMPARISON_SIGN_OPTIONS);

/** @param {unknown} q */
export function isComparisonSignMcq(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  return params.kind === "cmp";
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
 * Canonical comparison sign for `left __ right` (numeric only — never RTL-flipped).
 * @param {unknown} left
 * @param {unknown} right
 * @returns {">"|"="|"<"|null}
 */
export function computeComparisonSign(left, right) {
  const { a, b } = coerceComparisonOperands(left, right);
  if (a == null || b == null) return null;
  if (a > b) return ">";
  if (a < b) return "<";
  return "=";
}

/** @alias computeComparisonSign */
export const getComparisonSign = computeComparisonSign;

/**
 * Operand-based canonical answer for cmp rows (ignores stale / RTL-corrupted correctAnswer).
 * @param {unknown} q
 * @returns {">"|"="|"<"|null}
 */
export function resolveCanonicalComparisonSignAnswer(q) {
  if (!isComparisonSignMcq(q)) return null;
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  return computeComparisonSign(params.a ?? q?.a, params.b ?? q?.b);
}

/** LTR-isolate a sign for embedding in RTL Hebrew prose (display only). */
export function isolateComparisonSignForDisplay(sign) {
  const s = String(sign ?? "").trim();
  if (!isComparisonSignToken(s)) return s;
  return `\u2066${s}\u2069`;
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
  const coerced = coerceComparisonOperands(params.a ?? q.a, params.b ?? q.b);
  const sign = computeComparisonSign(coerced.a, coerced.b);
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
