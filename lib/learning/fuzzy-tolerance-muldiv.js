/**
 * Structural tolerance matchers for Topic-2 integer mul/div.
 *
 * Exact identities only (trueOp consistency). Far-from-correct answers → null.
 * Runs after exact prove helpers in classifyMathNumericAnswer.
 */

import {
  proveCalculationNearMiss,
  proveColumnDigitSlipError,
  STRUCTURAL_CONFIDENCE,
} from "./fuzzy-tolerance.js";

export const TOPIC2_MUL_KINDS = Object.freeze([
  "mul",
  "mul_vertical",
  "mul_tens",
  "mul_hundreds",
]);

export const TOPIC2_DIV_KINDS = Object.freeze([
  "div",
  "div_long",
  "div_two_digit",
]);

/**
 * @param {string} kind
 * @param {Record<string, unknown>} p
 * @returns {{ mx: number, my: number }|null}
 */
export function resolveMulOperands(kind, p) {
  const k = kind != null ? String(kind).trim() : "";
  /** @param {unknown} v */
  const n = (v) => {
    if (v == null || v === "") return null; // Number(null)===0 would poison ?? fallbacks
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  let mx = n(p?.a);
  let my = n(p?.b);
  if (k === "mul_tens") {
    mx = n(p?.tens) ?? mx;
    my = n(p?.multiplier) ?? my;
  } else if (k === "mul_hundreds") {
    mx = n(p?.hundreds) ?? mx;
    my = n(p?.multiplier) ?? my;
  } else if (k === "mul_vertical") {
    mx = n(p?.twoDigit) ?? mx;
    my = n(p?.oneDigit) ?? my;
  }
  if (mx == null || my == null) return null;
  return { mx, my };
}

/**
 * @param {Record<string, unknown>} p
 * @returns {{ dividend: number, divisor: number }|null}
 */
export function resolveDivOperands(p) {
  /** @param {unknown} v */
  const n = (v) => {
    if (v == null || v === "") return null; // Number(null)===0 would poison ?? fallbacks
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  const dividend = n(p?.dividend) ?? n(p?.a);
  const divisor = n(p?.divisor) ?? n(p?.b);
  if (dividend == null || divisor == null || divisor === 0) return null;
  return { dividend, divisor };
}

/**
 * Place-value slip on a product: selected === product×10 or product/10 (integer).
 * @param {object} p
 */
export function proveMulPlaceShiftError(p) {
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  const product = Number(p.trueOp);
  if (![user, expected, product].every(Number.isFinite)) return null;
  if (user === expected || expected !== product) return null;
  /** @type {string|null} */
  let mode = null;
  if (user === product * 10) mode = "times_10";
  else if (product % 10 === 0 && user === product / 10) mode = "div_10";
  if (!mode) return null;
  return {
    tag: "place_value_error",
    mode,
    confidence: 0.88,
    ruleId: "math_numeric:place_value_error:mul_place_shift",
  };
}

/**
 * Ones-digit-only partial product (2+ digit × factor).
 * @param {object} p
 */
export function provePartialProductOnesOnly(p) {
  const mx = Number(p.mx);
  const my = Number(p.my);
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  if (![mx, my, user, expected].every(Number.isFinite)) return null;
  if (Math.abs(mx) < 10) return null;
  const product = mx * my;
  if (expected !== product || user === expected) return null;
  const onesOnly = (Math.abs(mx) % 10) * my;
  if (user !== onesOnly || onesOnly === product) return null;
  return {
    tag: "partial_product_error",
    mode: "ones_only",
    confidence: 0.9,
    ruleId: "math_numeric:partial_product_error:ones_only",
  };
}

/**
 * @param {object} p
 * @param {string} p.kind
 * @param {Record<string, unknown>} [p.params]
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 */
export function classifyStructuralMulDivError(p) {
  const kind = p?.kind != null ? String(p.kind).trim() : "";
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  if (![user, expected].every(Number.isFinite)) return null;
  if (user === expected) return null;

  const params = p.params && typeof p.params === "object" ? p.params : p;

  if (TOPIC2_MUL_KINDS.includes(kind)) {
    const ops = resolveMulOperands(kind, params);
    if (!ops) return null;
    const { mx, my } = ops;
    const product = mx * my;
    if (expected !== product) return null;

    const partial = provePartialProductOnesOnly({
      mx,
      my,
      userAnswer: user,
      expectedAnswer: expected,
    });
    if (partial) {
      return {
        tag: partial.tag,
        details: {
          mx,
          my,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: product,
          mode: partial.mode,
          tier: "structural",
        },
        ruleId: partial.ruleId,
        confidence: partial.confidence,
      };
    }

    const place = proveMulPlaceShiftError({
      userAnswer: user,
      expectedAnswer: expected,
      trueOp: product,
    });
    if (place) {
      return {
        tag: place.tag,
        details: {
          mx,
          my,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: product,
          mode: place.mode,
          tier: "structural",
        },
        ruleId: place.ruleId,
        confidence: place.confidence,
      };
    }

    const digitSlip = proveColumnDigitSlipError({
      userAnswer: user,
      expectedAnswer: expected,
      trueOp: product,
    });
    if (digitSlip) {
      return {
        tag: digitSlip.tag,
        details: {
          mx,
          my,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: product,
          mode: digitSlip.mode,
          column: digitSlip.column,
          tier: "structural",
        },
        ruleId: digitSlip.ruleId,
        confidence: digitSlip.confidence,
      };
    }

    const near = proveCalculationNearMiss({
      userAnswer: user,
      expectedAnswer: expected,
      trueOp: product,
      maxK: 9,
    });
    if (near) {
      return {
        tag: near.tag,
        details: {
          mx,
          my,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: product,
          mode: near.mode,
          k: near.k,
          tier: "structural",
        },
        ruleId: near.ruleId,
        confidence: near.confidence ?? STRUCTURAL_CONFIDENCE.calculation_near_miss,
      };
    }
    return null;
  }

  if (TOPIC2_DIV_KINDS.includes(kind)) {
    const ops = resolveDivOperands(params);
    if (!ops) return null;
    const { dividend, divisor } = ops;
    const quot = dividend / divisor;
    if (!Number.isInteger(quot) || expected !== quot) return null;

    const digitSlip = proveColumnDigitSlipError({
      userAnswer: user,
      expectedAnswer: expected,
      trueOp: quot,
    });
    if (digitSlip) {
      return {
        tag: digitSlip.tag,
        details: {
          dividend,
          divisor,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: quot,
          mode: digitSlip.mode,
          column: digitSlip.column,
          tier: "structural",
        },
        ruleId: digitSlip.ruleId,
        confidence: digitSlip.confidence,
      };
    }

    const near = proveCalculationNearMiss({
      userAnswer: user,
      expectedAnswer: expected,
      trueOp: quot,
      maxK: 9,
    });
    if (near) {
      return {
        tag: near.tag,
        details: {
          dividend,
          divisor,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: quot,
          mode: near.mode,
          k: near.k,
          tier: "structural",
        },
        ruleId: near.ruleId,
        confidence: near.confidence ?? STRUCTURAL_CONFIDENCE.calculation_near_miss,
      };
    }
  }

  return null;
}
