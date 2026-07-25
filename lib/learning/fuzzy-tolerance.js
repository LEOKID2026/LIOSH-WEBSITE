/**
 * Structural tolerance matchers for Topic-1 integer add/sub.
 *
 * These are NOT proximity heuristics on arbitrary wrongs:
 * each matcher requires an exact identity (trueOp consistency + selected identity).
 * Random far-from-correct answers return null → zero false positives.
 */

import { proveSingleColumnDigitSlip, compareDigitColumns, traceAdditionColumns } from "./column-trace.js";

/** Confidence tiers (exact prove helpers remain ~0.92). */
export const STRUCTURAL_CONFIDENCE = Object.freeze({
  column_digit_slip: 0.86,
  calculation_off_by_one: 0.84,
  calculation_near_miss: 0.78,
  column_carry_local: 0.82,
});

/**
 * selected === trueOp ± k for k∈{1..maxK}, expected === trueOp.
 * @param {object} p
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @param {number} p.trueOp
 * @param {number} [p.maxK]
 */
export function proveCalculationNearMiss(p) {
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  const trueOp = Number(p.trueOp);
  const maxK = Number(p.maxK ?? 9);
  if (![user, expected, trueOp].every(Number.isFinite)) return null;
  if (!Number.isFinite(maxK) || maxK < 1) return null;
  if (user === expected) return null;
  if (expected !== trueOp) return null;
  const delta = user - trueOp;
  const abs = Math.abs(delta);
  if (abs < 1 || abs > maxK) return null;
  return {
    tag: abs === 1 ? "calculation_off_by_one" : "calculation_near_miss",
    mode: abs === 1 ? "off_by_one" : "near_miss",
    k: abs,
    signedDelta: delta,
    confidence: abs === 1 ? STRUCTURAL_CONFIDENCE.calculation_off_by_one : STRUCTURAL_CONFIDENCE.calculation_near_miss,
    ruleId:
      abs === 1
        ? "math_numeric:calculation_off_by_one"
        : "math_numeric:calculation_near_miss",
  };
}

/**
 * Same written length, exactly one digit column differs from the true result.
 * @param {object} p
 */
export function proveColumnDigitSlipError(p) {
  const slip = proveSingleColumnDigitSlip(p);
  if (!slip) return null;
  return {
    tag: "place_value_error",
    mode: slip.mode,
    column: slip.column,
    confidence: STRUCTURAL_CONFIDENCE.column_digit_slip,
    ruleId: "math_numeric:place_value_error:column_digit_slip",
    details: slip,
  };
}

/**
 * Local carry slip: reconstructing addition with a forced wrong write digit in exactly
 * one column (and continuing carries from that wrong write) equals selected.
 * Strict: only when that reconstruction ≠ true sum.
 *
 * @param {object} p
 * @param {number} p.a
 * @param {number} p.b
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 */
export function proveLocalCarryColumnError(p) {
  const a = Number(p.a);
  const b = Number(p.b);
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  if (![a, b, user, expected].every(Number.isFinite)) return null;
  if (user === expected) return null;
  const sum = a + b;
  if (expected !== sum) return null;

  const { steps } = traceAdditionColumns(a, b);
  // For each column that required a carry (raw >= 10), try writing ones digit without
  // producing carryOut (classic forgot-carry) already covered by carry_error.
  // Here: try writing each alternate digit 0-9 in exactly one column and propagate.
  for (let col = 0; col < steps.length; col += 1) {
    const correctWrite = steps[col].write;
    for (let wrongDigit = 0; wrongDigit <= 9; wrongDigit += 1) {
      if (wrongDigit === correctWrite) continue;
      const rebuilt = rebuildAddWithColumnOverride(a, b, col, wrongDigit);
      if (rebuilt === user && rebuilt !== sum) {
        return {
          tag: "column_arithmetic_error",
          mode: "local_column_override",
          column: col,
          wrongDigit,
          correctWrite,
          confidence: STRUCTURAL_CONFIDENCE.column_carry_local,
          ruleId: "math_numeric:column_arithmetic_error",
        };
      }
    }
  }
  return null;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} overrideCol
 * @param {number} overrideDigit
 */
function rebuildAddWithColumnOverride(a, b, overrideCol, overrideDigit) {
  const aCols = [];
  const bCols = [];
  let aa = Math.trunc(Math.abs(a));
  let bb = Math.trunc(Math.abs(b));
  const len = Math.max(String(aa).length, String(bb).length, overrideCol + 1);
  for (let i = 0; i < len; i += 1) {
    aCols.push(aa % 10);
    bCols.push(bb % 10);
    aa = Math.floor(aa / 10);
    bb = Math.floor(bb / 10);
  }
  const out = [];
  let carry = 0;
  for (let i = 0; i < len; i += 1) {
    const raw = aCols[i] + bCols[i] + carry;
    if (i === overrideCol) {
      out.push(overrideDigit);
      // carry out as if the true raw happened (student wrote wrong digit but may still carry)
      carry = Math.floor(raw / 10);
    } else {
      out.push(raw % 10);
      carry = Math.floor(raw / 10);
    }
  }
  if (carry > 0) out.push(carry);
  let n = 0;
  for (let i = out.length - 1; i >= 0; i -= 1) n = n * 10 + out[i];
  return n;
}

/**
 * Run structural tier after exact prove helpers failed.
 * Kind-gated to Topic-1 add/sub kinds only.
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number|null} [p.c]
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 */
export function classifyStructuralAddSubError(p) {
  const kind = p?.kind != null ? String(p.kind).trim() : "";
  const isAdd =
    kind === "add_two" ||
    kind === "add_vertical" ||
    kind === "add_second_decade" ||
    kind === "add_tens_only" ||
    kind === "add_three";
  const isSub = kind === "sub_two" || kind === "sub_vertical";
  if (!isAdd && !isSub) return null;

  const a = Number(p.a);
  const b = Number(p.b);
  const c = p.c == null || p.c === "" ? null : Number(p.c);
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  if (![a, b, user, expected].every(Number.isFinite)) return null;
  if (isAdd && kind === "add_three" && !Number.isFinite(c)) return null;

  const trueOp = isSub ? a - b : kind === "add_three" ? a + b + /** @type {number} */ (c) : a + b;
  if (expected !== trueOp) return null;
  if (user === expected) return null;

  // Prefer single-column digit slip (maps to place_value_error) over generic near-miss.
  const digitSlip = proveColumnDigitSlipError({ userAnswer: user, expectedAnswer: expected, trueOp });
  if (digitSlip) {
    return {
      tag: digitSlip.tag,
      details: {
        a,
        b,
        c: kind === "add_three" ? c : undefined,
        kind,
        selectedAnswer: user,
        correctAnswer: expected,
        trueOp,
        mode: digitSlip.mode,
        column: digitSlip.column,
        tier: "structural",
      },
      ruleId: digitSlip.ruleId,
      confidence: digitSlip.confidence,
    };
  }

  // Local column override on binary add (after digit-slip).
  if (isAdd && kind !== "add_three") {
    const local = proveLocalCarryColumnError({ a, b, userAnswer: user, expectedAnswer: expected });
    if (local) {
      return {
        tag: local.tag,
        details: {
          a,
          b,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp,
          mode: local.mode,
          column: local.column,
          wrongDigit: local.wrongDigit,
          tier: "structural",
        },
        ruleId: local.ruleId,
        confidence: local.confidence,
      };
    }
  }

  const near = proveCalculationNearMiss({
    userAnswer: user,
    expectedAnswer: expected,
    trueOp,
    maxK: 9,
  });
  if (near) {
    return {
      tag: near.tag,
      details: {
        a,
        b,
        c: kind === "add_three" ? c : undefined,
        kind,
        selectedAnswer: user,
        correctAnswer: expected,
        trueOp,
        mode: near.mode,
        k: near.k,
        signedDelta: near.signedDelta,
        tier: "structural",
      },
      ruleId: near.ruleId,
      confidence: near.confidence,
    };
  }

  return null;
}

/** @deprecated name alias — kept for the plan's fuzzy-tolerance wording */
export const classifyFuzzyToleranceAddSubError = classifyStructuralAddSubError;

export { compareDigitColumns };
