/**
 * Extract operand numbers from a generated math question for scratchpad setup.
 * Never computes or returns the answer.
 */

/**
 * @param {string} text
 * @returns {{ a: number, b: number }|null}
 */
function parseSimpleExercise(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(\d+)\s*([+\-*/])\s*(\d+)/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {{ a: number|null, b: number|null, operation: string|null }}
 */
export function extractScratchpadOperands(question) {
  if (!question) return { a: null, b: null, operation: null };

  const operation =
    typeof question.operation === "string" ? question.operation : null;

  let a =
    typeof question.a === "number" && Number.isFinite(question.a)
      ? question.a
      : null;
  let b =
    typeof question.b === "number" && Number.isFinite(question.b)
      ? question.b
      : null;

  const params = question.params && typeof question.params === "object" ? question.params : {};

  if (a == null && typeof params.a === "number" && Number.isFinite(params.a)) {
    a = params.a;
  }
  if (b == null && typeof params.b === "number" && Number.isFinite(params.b)) {
    b = params.b;
  }

  if (a == null || b == null) {
    const exercise =
      typeof question.exerciseText === "string"
        ? question.exerciseText
        : typeof question.question === "string"
          ? question.question
          : "";
    const parsed = parseSimpleExercise(exercise);
    if (parsed) {
      if (a == null) a = parsed.a;
      if (b == null) b = parsed.b;
    }
  }

  if (a != null) a = Math.max(0, Math.round(a));
  if (b != null) b = Math.max(0, Math.round(b));

  return { a, b, operation };
}

/**
 * @param {number} n
 * @returns {number}
 */
export function digitCount(n) {
  if (!Number.isFinite(n) || n === 0) return 1;
  return String(Math.abs(Math.round(n))).length;
}

/**
 * Right-align a number into digit cells for place-value / vertical layouts.
 * Never includes the answer — operands only.
 *
 * @param {number|null|undefined} n
 * @param {number} cols
 * @returns {string[]}
 */
export function numberToDigitCells(n, cols) {
  const count = Math.max(1, cols);
  if (n == null || !Number.isFinite(n)) {
    return Array(count).fill("");
  }
  const s = String(Math.abs(Math.round(n)));
  const padded = s.padStart(count, " ");
  return padded.split("").map((c) => (c === " " ? "" : c));
}

/**
 * @param {number|null|undefined} n
 * @returns {{ tens: number, ones: number }}
 */
export function decomposeBaseTen(n) {
  const v = n == null || !Number.isFinite(n) ? 0 : Math.max(0, Math.round(n));
  return { tens: Math.floor(v / 10), ones: v % 10 };
}
