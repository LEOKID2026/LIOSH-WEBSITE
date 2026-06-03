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
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
  if (!match) {
    const divMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (!divMatch) return null;
    const aDiv = Number(divMatch[1]);
    const bDiv = Number(divMatch[2]);
    if (!Number.isFinite(aDiv) || !Number.isFinite(bDiv)) return null;
    return { a: aDiv, b: bDiv };
  }
  const a = Number(match[1]);
  const b = Number(match[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

/**
 * @param {number|null|undefined} n
 * @returns {boolean}
 */
function isPosInt(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * @param {number} n
 * @param {number} d
 * @returns {{ num: number, den: number, missingDen?: boolean }|null}
 */
function fracPart(n, d, opts = {}) {
  if (!isPosInt(n) || !isPosInt(d) || d === 0) {
    if (opts.missingDen && isPosInt(n)) {
      return { num: Math.round(n), den: 0, missingDen: true };
    }
    return null;
  }
  return { num: Math.round(n), den: Math.round(d) };
}

/**
 * Extract read-only fraction operands for scratchpad display.
 * Never returns result numerators/denominators from params.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {{ fractionOperands: { num: number, den: number, missingDen?: boolean }[], fractionOperator: string|null }}
 */
export function extractScratchpadFractionLayout(question) {
  const empty = { fractionOperands: [], fractionOperator: null };
  if (!question) return empty;

  const params =
    question.params && typeof question.params === "object" ? question.params : {};
  const kind = String(params.kind || "");

  const pair = (n1, d1, n2, d2, op) => {
    const f1 = fracPart(n1, d1);
    const f2 = fracPart(n2, d2);
    if (!f1 || !f2) return empty;
    return { fractionOperands: [f1, f2], fractionOperator: op };
  };

  const single = (n, d) => {
    const f = fracPart(n, d);
    if (!f) return empty;
    return { fractionOperands: [f], fractionOperator: null };
  };

  if (kind === "frac_add_sub" || kind.includes("frac_same_den")) {
    const den1 = params.den1 ?? params.den;
    const den2 = params.den2 ?? params.den;
    const op = params.op === "sub" ? "−" : "+";
    return pair(params.n1, den1, params.n2, den2, op);
  }

  if (kind === "frac_multiply") {
    return pair(params.n1, params.den1, params.n2, params.den2, "×");
  }

  if (kind === "frac_divide") {
    return pair(params.n1, params.den1, params.n2, params.den2, "÷");
  }

  if (kind.includes("frac_compare")) {
    const den = params.den;
    const f1 = fracPart(params.n1, den);
    const f2 = fracPart(params.n2, den);
    if (!f1 || !f2) return empty;
    return { fractionOperands: [f1, f2], fractionOperator: null };
  }

  if (kind.includes("frac_simplify") || kind === "frac_as_division") {
    const n = params.num ?? params.n1 ?? params.improperNum;
    const d = params.den ?? params.den1;
    return single(n, d);
  }

  if (kind === "frac_to_mixed" || kind === "mixed_to_frac") {
    const n =
      params.improperNum ??
      (isPosInt(params.whole) && isPosInt(params.num) && isPosInt(params.den)
        ? params.whole * params.den + params.num
        : null);
    return single(n, params.den);
  }

  if (kind === "frac_half" || kind === "frac_half_reverse") {
    return single(1, 2);
  }

  if (kind === "frac_quarter" || kind === "frac_quarter_reverse") {
    return single(1, 4);
  }

  if (kind.includes("frac_equiv_missing_den")) {
    const f1 = fracPart(params.numBig, params.bigDen);
    const f2 = fracPart(params.numSmall, 0, { missingDen: true });
    if (!f1 || !f2) return empty;
    return { fractionOperands: [f1, f2], fractionOperator: "=" };
  }

  if (kind.includes("frac_reduce") || kind.includes("frac_expand")) {
    const n = params.num ?? params.expandedNum;
    const d = params.den ?? params.expandedDen;
    return single(n, d);
  }

  const text = [question.exerciseText, question.question]
    .filter((t) => typeof t === "string" && t.trim())
    .join(" ")
    .replace(/\u2066|\u2069/g, "");

  const binary = text.match(
    /(\d+)\s*\/\s*(\d+)\s*([+\-−×x*÷=])\s*(\d+)\s*\/\s*(\d+)/
  );
  if (binary) {
    const opMap = {
      "+": "+",
      "-": "−",
      "−": "−",
      "×": "×",
      x: "×",
      "*": "×",
      "÷": "÷",
      "=": "=",
    };
    return pair(
      Number(binary[1]),
      Number(binary[2]),
      Number(binary[4]),
      Number(binary[5]),
      opMap[binary[3]] || binary[3]
    );
  }

  const singles = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (singles.length >= 2) {
    const f1 = fracPart(Number(singles[0][1]), Number(singles[0][2]));
    const f2 = fracPart(Number(singles[1][1]), Number(singles[1][2]));
    if (!f1 || !f2) return empty;
    let op = null;
    if (text.includes("+")) op = "+";
    else if (text.includes("−") || text.includes("-")) op = "−";
    else if (text.includes("×")) op = "×";
    else if (text.includes("÷")) op = "÷";
    return { fractionOperands: [f1, f2], fractionOperator: op };
  }

  if (singles.length === 1) {
    return single(Number(singles[0][1]), Number(singles[0][2]));
  }

  return empty;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {{ a: number|null, b: number|null, operation: string|null, fractionOperands: { num: number, den: number, missingDen?: boolean }[], fractionOperator: string|null }}
 */
export function extractScratchpadOperands(question) {
  if (!question) {
    return {
      a: null,
      b: null,
      operation: null,
      fractionOperands: [],
      fractionOperator: null,
    };
  }

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
  if (a == null && typeof params.dividend === "number" && Number.isFinite(params.dividend)) {
    a = params.dividend;
  }
  if (b == null && typeof params.divisor === "number" && Number.isFinite(params.divisor)) {
    b = params.divisor;
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

  const { fractionOperands, fractionOperator } = extractScratchpadFractionLayout(question);

  return { a, b, operation, fractionOperands, fractionOperator };
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
