/** Comparison-sign MCQ (`params.kind === "cmp"`): exactly {>, =, <}. */

export const COMPARISON_SIGN_OPTIONS = [">", "=", "<"];

const COMPARISON_SIGN_SET = new Set(COMPARISON_SIGN_OPTIONS);

/** @param {unknown} q */
export function isComparisonSignMcq(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  return params.kind === "cmp";
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
 * @param {unknown} left
 * @param {unknown} right
 * @returns {">"|"="|"<"|null}
 */
export function computeComparisonSign(left, right) {
  const { a, b } = coerceComparisonOperands(left, right);
  if (a == null || b == null) return null;
  if (a < b) return "<";
  if (a > b) return ">";
  return "=";
}

/** @param {unknown[]} answers */
export function isExactComparisonSignOptionSet(answers) {
  if (!Array.isArray(answers) || answers.length !== 3) return false;
  const normalized = answers.map((a) => String(a ?? "").trim());
  if (new Set(normalized).size !== 3) return false;
  return normalized.every((opt) => COMPARISON_SIGN_SET.has(opt));
}
