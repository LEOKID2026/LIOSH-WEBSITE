/**
 * Deterministic math/geometry numeric answer classifier.
 * Only emits tags when numeric relation is provable from operands + userAnswer.
 */

import { EVIDENCE_TYPES } from "../answer-evidence-contract.js";
import { classifyStructuralAddSubError } from "../fuzzy-tolerance.js";
import {
  classifyStructuralMulDivError,
  resolveDivOperands,
  resolveMulOperands,
  TOPIC2_DIV_KINDS,
  TOPIC2_MUL_KINDS,
} from "../fuzzy-tolerance-muldiv.js";
import { classifyFractionAnswer } from "../fuzzy-tolerance-fractions.js";
import { classifyCoreOpsAnswer, isCoreOpsKind } from "../fuzzy-tolerance-core-ops.js";
import { classifyGeometryAnswer, isGeometryNumericKind } from "../fuzzy-tolerance-geometry.js";
import { isTopic3FracKind } from "../fraction-parse.js";

/** @param {unknown} v */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function pickKind(v) {
  return v != null ? String(v).trim() : "";
}

/** IEEE-safe equality for decimal identities (not loose proximity of arbitrary wrongs). */
function exactEq(x, y) {
  if (x === y) return true;
  return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
}

function hasFractionalPart(n) {
  return Math.abs(n - Math.trunc(n)) > 1e-9;
}

/** Compare-family kinds only — not frac_add_sub or general frac operations. */
function isFractionCompareKind(kind) {
  const k = pickKind(kind);
  if (!k) return false;
  return k.includes("compare");
}

/** Rounding tags only for actual rounding kinds — never dec_add / dec_sub. */
function isDecimalRoundingKind(kind) {
  const k = pickKind(kind);
  if (!k) return false;
  if (k === "dec_add" || k === "dec_sub" || k.includes("dec_add") || k.includes("dec_sub")) {
    return false;
  }
  return k.includes("round") || k === "dec_round" || k.includes("dec_round");
}

function isFractionAddSubKind(kind) {
  const k = pickKind(kind);
  return (
    k === "frac_add" ||
    k === "frac_add_sub" ||
    k === "frac_sub" ||
    k.includes("frac_add") ||
    k.includes("frac_same_den")
  );
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} details
 * @param {string} ruleId
 */
function hitWithRule(tag, details, ruleId, confidence = 0.92) {
  return {
    tag,
    evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
    details: { ...details, classifierRuleId: ruleId },
    confidence,
    ruleId,
  };
}

/**
 * W4 / TEP-A5 — omitted addend on three-term addition.
 * Kind: `add_three` only.
 * Proof: expected === a+b+c and selected ∈ {a+b, b+c, a+c} ≠ full sum.
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number|null} p.c
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveOmittedAddendOnAddThree(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "add_three") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const c = num(p?.c);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || c == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const full = a + b + c;
  if (expected !== full) return null;

  const candidates = [
    { omitted: "c", partialSum: a + b },
    { omitted: "a", partialSum: b + c },
    { omitted: "b", partialSum: a + c },
  ];
  const matches = candidates.filter((x) => user === x.partialSum && x.partialSum !== full);
  if (matches.length === 0) return null;
  const best = matches[0];
  return {
    tag: "omitted_addend",
    details: {
      a,
      b,
      c,
      kind,
      omitted: best.omitted,
      partialSum: best.partialSum,
      selectedAnswer: user,
      correctAnswer: expected,
      expectedSum: full,
      ambiguous: matches.length > 1,
    },
    ruleId: "math_numeric:omitted_addend",
  };
}

/**
 * W3 / TEP-S1 — subtraction op-confusion (add instead of sub).
 * Kinds: `sub_two` | `sub_vertical` only.
 * Proof: selectedAnswer === a + b (and not equal to correct a − b).
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveAddInsteadOfSubOnSubKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "sub_two" && kind !== "sub_vertical") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const sum = a + b;
  const difference = a - b;
  if (expected !== difference) return null;
  if (user !== sum) return null;
  if (user === difference) return null;
  return {
    tag: "add_instead_of_sub",
    details: { a, b, kind, selectedAnswer: user, correctAnswer: expected, provedSum: sum },
    ruleId: "math_numeric:add_instead_of_sub",
  };
}

/**
 * Backward-compatible alias — `sub_two` only (Phase-1 template name).
 * Prefer `proveAddInsteadOfSubOnSubKind` for new call sites.
 */
export function proveAddInsteadOfSubOnSubTwo(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "sub_two") return null;
  return proveAddInsteadOfSubOnSubKind(p);
}

/**
 * W3 / TEP-S3 — operand reversal on subtraction.
 * Kinds: `sub_two` | `sub_vertical` only.
 * Proof: selectedAnswer === b − a when b ≥ a, and ≠ a − b.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveOperandReversalOnSubKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "sub_two" && kind !== "sub_vertical") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const difference = a - b;
  if (expected !== difference) return null;
  if (!(b >= a && user === b - a && user !== difference)) return null;
  return {
    tag: "operand_reversal",
    details: { a, b, kind, selectedAnswer: user, correctAnswer: expected, provedReversal: b - a },
    ruleId: "math_numeric:operand_reversal",
  };
}

/**
 * W3 / TEP-A3 — operator confusion (sub instead of add).
 * Kinds: binary add only (not `add_three` — DEFER).
 * Proof: selectedAnswer === |a − b| ≠ a + b.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveSubInsteadOfAddOnAddKind(p) {
  const kind = pickKind(p?.kind);
  if (
    kind !== "add_two" &&
    kind !== "add_vertical" &&
    kind !== "add_second_decade" &&
    kind !== "add_tens_only"
  ) {
    return null;
  }
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const sum = a + b;
  if (expected !== sum) return null;
  const absDiff = Math.abs(a - b);
  if (user !== absDiff) return null;
  if (user === sum) return null;
  return {
    tag: "sub_instead_of_add",
    details: { a, b, kind, selectedAnswer: user, correctAnswer: expected, provedAbsDiff: absDiff },
    ruleId: "math_numeric:sub_instead_of_add",
  };
}

/**
 * W3 / TEP-A4 — operator confusion (mul instead of add).
 * Binary add: selected === a*b ≠ a+b.
 * `add_three`: selected === a*b*c ≠ a+b+c.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveMulInsteadOfAddOnAddKind(p) {
  const kind = pickKind(p?.kind);
  const a = num(p?.a);
  const b = num(p?.b);
  const c = num(p?.c);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;

  if (kind === "add_three") {
    if (c == null) return null;
    const full = a + b + c;
    if (expected !== full) return null;
    const product = a * b * c;
    if (user !== product) return null;
    if (user === full) return null;
    return {
      tag: "mul_instead_of_add",
      details: {
        a,
        b,
        c,
        kind,
        operands: [a, b, c],
        selectedAnswer: user,
        correctAnswer: expected,
        provedProduct: product,
      },
      ruleId: "math_numeric:mul_instead_of_add",
    };
  }

  if (
    kind !== "add_two" &&
    kind !== "add_vertical" &&
    kind !== "add_second_decade" &&
    kind !== "add_tens_only"
  ) {
    return null;
  }
  const sum = a + b;
  if (expected !== sum) return null;
  const product = a * b;
  if (user !== product) return null;
  if (user === sum) return null;
  return {
    tag: "mul_instead_of_add",
    details: { a, b, kind, selectedAnswer: user, correctAnswer: expected, provedProduct: product },
    ruleId: "math_numeric:mul_instead_of_add",
  };
}

/**
 * W3 / TEP-A2b — ones-only / tens-only collapse after addition.
 * Kinds: `add_two` | `add_vertical` | `add_second_decade`.
 * DEFER: add_three (unclear), add_tens_only (ones always 0).
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function provePlaceValueOnesTensCollapseOnAddKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "add_two" && kind !== "add_vertical" && kind !== "add_second_decade") {
    return null;
  }
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const sum = a + b;
  if (expected !== sum) return null;

  const onesA = Math.abs(a % 10);
  const onesB = Math.abs(b % 10);
  const onesSum = onesA + onesB;
  const tensA = Math.floor(Math.abs(a) / 10);
  const tensB = Math.floor(Math.abs(b) / 10);
  const tensOnly = tensA + tensB;

  if (user === onesSum && onesSum !== sum) {
    return {
      tag: "place_value_error",
      details: { a, b, kind, onesSum, expected: sum, selectedAnswer: user, mode: "ones_only" },
      ruleId: "math_numeric:place_value_error:ones_only",
    };
  }
  if (user === tensOnly && tensOnly > 0 && tensOnly !== sum) {
    return {
      tag: "place_value_error",
      details: { a, b, kind, tensOnly, expected: sum, selectedAnswer: user, mode: "tens_only" },
      ruleId: "math_numeric:place_value_error:tens_only",
    };
  }
  return null;
}

/**
 * W3 / TEP-A2 — place-value power-of-10 slip after addition.
 * Kinds: all Topic-1 add kinds; `add_three` uses full sum a+b+c.
 * Proof: selected === trueSum ± 10^k for k∈{1,2,3}, expected === trueSum.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function provePlaceValuePowerSlipOnAddKind(p) {
  const kind = pickKind(p?.kind);
  const a = num(p?.a);
  const b = num(p?.b);
  const c = num(p?.c);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;

  /** @type {number|null} */
  let trueSum = null;
  if (kind === "add_three") {
    if (c == null) return null;
    trueSum = a + b + c;
  } else if (
    kind === "add_two" ||
    kind === "add_vertical" ||
    kind === "add_second_decade" ||
    kind === "add_tens_only"
  ) {
    trueSum = a + b;
  } else {
    return null;
  }
  if (expected !== trueSum) return null;

  for (const kPow of [1, 2, 3]) {
    const delta = 10 ** kPow;
    if (user === trueSum + delta || user === trueSum - delta) {
      return {
        tag: "place_value_error",
        details: {
          a,
          b,
          c: kind === "add_three" ? c : undefined,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: trueSum,
          mode: "power10_slip",
          k: kPow,
          delta,
          signedDelta: user - trueSum,
        },
        ruleId: "math_numeric:place_value_error:power10_slip",
      };
    }
  }
  return null;
}

/**
 * W3 / TEP-S4 — place-value power-of-10 slip after subtraction.
 * Kinds: `sub_two` | `sub_vertical`.
 * Proof: selected === (a−b) ± 10^k for k∈{1,2,3}, expected === a−b.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function provePlaceValuePowerSlipOnSubKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "sub_two" && kind !== "sub_vertical") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const difference = a - b;
  if (expected !== difference) return null;

  for (const kPow of [1, 2, 3]) {
    const delta = 10 ** kPow;
    if (user === difference + delta || user === difference - delta) {
      return {
        tag: "place_value_error",
        details: {
          a,
          b,
          kind,
          selectedAnswer: user,
          correctAnswer: expected,
          trueOp: difference,
          mode: "power10_slip",
          k: kPow,
          delta,
          signedDelta: user - difference,
        },
        ruleId: "math_numeric:place_value_error:power10_slip",
      };
    }
  }
  return null;
}

/**
 * Generator template #2 — addition carry failure (digit-level).
 * Kinds: `add_two` | `add_vertical` | `add_second_decade` only.
 * Proof: ones digits sum ≥ 10, and
 *   selectedAnswer === tensA×10 + tensB×10 + (onesSum % 10)
 *   (wrote ones digit, forgot to carry 1 into tens) and ≠ a+b.
 * DEFER: add_three (multi-addend), add_tens_only (ones always 0).
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveCarryErrorOnAddKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "add_two" && kind !== "add_vertical" && kind !== "add_second_decade") {
    return null;
  }
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const sum = a + b;
  if (expected !== sum) return null; // only when expected is the true sum

  const onesA = Math.abs(a % 10);
  const onesB = Math.abs(b % 10);
  const onesSum = onesA + onesB;
  if (onesSum < 10) return null; // no carry required → cannot prove carry_error

  const tensA = Math.floor(Math.abs(a) / 10);
  const tensB = Math.floor(Math.abs(b) / 10);
  const noCarrySum = tensA * 10 + tensB * 10 + (onesSum % 10);
  if (user !== noCarrySum) return null;
  if (user === sum) return null;

  return {
    tag: "carry_error",
    details: {
      a,
      b,
      kind,
      selectedAnswer: user,
      correctAnswer: expected,
      onesA,
      onesB,
      onesSum,
      noCarrySum,
      expectedSum: sum,
    },
    ruleId: "math_numeric:carry_error",
  };
}

/**
 * Backward-compatible alias — `add_vertical` only (Phase-1 template name).
 * Prefer `proveCarryErrorOnAddKind` for new call sites.
 */
export function proveCarryErrorOnAddVertical(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "add_vertical") return null;
  return proveCarryErrorOnAddKind(p);
}

/**
 * Generator template — subtraction borrow failure.
 * Kinds: `sub_two` | `sub_vertical` only.
 * Exact identities when onesA < onesB (borrow required):
 *   1) forgot_tens_decrement: (tensA−tensB)×10 + (onesA+10−onesB)
 *   2) kept_minuend_tens: tensA×10 + (onesA+10−onesB)  (legacy shipped identity)
 *   3) digit_wise_abs: |onesA−onesB| + |tensA−tensB|×10
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveBorrowErrorOnSubKind(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "sub_two" && kind !== "sub_vertical") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (user === expected) return null;
  const difference = a - b;
  if (expected !== difference) return null;

  // Never claim borrow when the answer is exact operand reversal (b − a).
  // Precedence is also enforced in classifyMathNumericAnswer; this is defense-in-depth.
  if (b >= a && user === b - a) return null;

  const onesA = Math.abs(a % 10);
  const onesB = Math.abs(b % 10);
  if (onesA >= onesB) return null; // no ones-borrow required

  const tensA = Math.floor(Math.abs(a) / 10);
  const tensB = Math.floor(Math.abs(b) / 10);
  const onesWithBorrow = onesA + 10 - onesB;

  const forgotTensDecrement = (tensA - tensB) * 10 + onesWithBorrow;
  if (user === forgotTensDecrement && user !== difference) {
    return {
      tag: "borrow_error",
      details: {
        a,
        b,
        kind,
        selectedAnswer: user,
        correctAnswer: expected,
        mode: "forgot_tens_decrement",
        forgotBorrow: forgotTensDecrement,
        expected: difference,
      },
      ruleId: "math_numeric:borrow_error:forgot_tens_decrement",
    };
  }

  const keptMinuendTens = tensA * 10 + onesWithBorrow;
  if (user === keptMinuendTens && user !== difference) {
    return {
      tag: "borrow_error",
      details: {
        a,
        b,
        kind,
        selectedAnswer: user,
        correctAnswer: expected,
        mode: "kept_minuend_tens",
        forgotBorrow: keptMinuendTens,
        expected: difference,
      },
      ruleId: "math_numeric:borrow_error:forgot_tens_decrement",
    };
  }

  const digitWise = Math.abs(onesA - onesB) + Math.abs(tensA - tensB) * 10;
  if (user === digitWise && user !== difference) {
    return {
      tag: "borrow_error",
      details: {
        a,
        b,
        kind,
        selectedAnswer: user,
        correctAnswer: expected,
        mode: "digit_wise_abs",
        digitWise,
        expected: difference,
      },
      ruleId: "math_numeric:borrow_error:digit_wise_abs",
    };
  }

  return null;
}

/**
 * Parse Hebrew remainder answers: "מנה ושארית שארית".
 * @param {unknown} raw
 * @returns {{ quotient: number, remainder: number }|null}
 */
export function parseRemainderAnswer(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw) && "quotient" in raw && "remainder" in raw) {
    const q = num(/** @type {{ quotient: unknown }} */ (raw).quotient);
    const r = num(/** @type {{ remainder: unknown }} */ (raw).remainder);
    if (q == null || r == null) return null;
    return { quotient: q, remainder: r };
  }
  const s = String(raw).trim();
  const m = s.match(/(-?\d+)\s*ושארית\s*(-?\d+)/u);
  if (!m) return null;
  const quotient = num(m[1]);
  const remainder = num(m[2]);
  if (quotient == null || remainder == null) return null;
  return { quotient, remainder };
}

/**
 * Topic-2 remainder identity proves (MCQ string answers).
 * Kind: `div_with_remainder` | `div_with_remainder_long` only.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string, confidence?: number }|null}
 */
export function proveRemainderIdentityError(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "div_with_remainder" && kind !== "div_with_remainder_long") return null;
  const dividend = num(p?.dividend) ?? num(p?.a);
  const divisor = num(p?.divisor) ?? num(p?.b);
  if (dividend == null || divisor == null || divisor <= 1) return null;

  const user = parseRemainderAnswer(p?.userAnswer);
  const expected = parseRemainderAnswer(p?.expectedAnswer);
  if (!user || !expected) return null;
  if (user.quotient === expected.quotient && user.remainder === expected.remainder) return null;

  const expectedOk =
    expected.remainder >= 0 &&
    expected.remainder < divisor &&
    dividend === divisor * expected.quotient + expected.remainder;
  if (!expectedOk) return null;

  /** @type {string|null} */
  let mode = null;
  if (
    user.remainder === 0 &&
    expected.remainder > 0 &&
    user.quotient === Math.floor(dividend / divisor)
  ) {
    mode = "remainder_dropped";
  } else if (user.quotient === expected.quotient && user.remainder !== expected.remainder) {
    mode = "remainder_mismatch";
  } else if (
    user.remainder === expected.remainder &&
    Math.abs(user.quotient - expected.quotient) === 1
  ) {
    mode = "quotient_off_by_one";
  } else if (user.remainder === expected.remainder && user.quotient !== expected.quotient) {
    mode = "quotient_mismatch";
  } else if (
    user.remainder >= 0 &&
    user.remainder < divisor &&
    dividend !== divisor * user.quotient + user.remainder
  ) {
    mode = "identity_violation";
  }
  if (!mode) return null;

  return {
    tag: "math_remainder_error",
    details: {
      kind,
      dividend,
      divisor,
      selectedAnswer: p?.userAnswer,
      correctAnswer: p?.expectedAnswer,
      userQuotient: user.quotient,
      userRemainder: user.remainder,
      expectedQuotient: expected.quotient,
      expectedRemainder: expected.remainder,
      mode,
    },
    ruleId: `math_numeric:math_remainder_error:${mode}`,
    confidence: 0.9,
  };
}

/**
 * Generator template #3 — division op-confusion.
 * Kinds: Topic-2 typed div (`div`, `div_long`, `div_two_digit`). Never facts.
 * Proof: selectedAnswer === dividend * divisor (and not equal to correct quotient).
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveMulInsteadOfDivOnDiv(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC2_DIV_KINDS.includes(kind)) return null;
  const ops = resolveDivOperands(p);
  if (!ops) return null;
  const { dividend: a, divisor: b } = ops;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (user === expected) return null;
  const quotient = a / b;
  if (!exactEq(expected, quotient)) return null;
  const product = a * b;
  if (!exactEq(user, product)) return null;
  if (exactEq(user, quotient)) return null;
  return {
    tag: "mul_instead_of_div",
    details: {
      a,
      b,
      dividend: a,
      divisor: b,
      selectedAnswer: user,
      correctAnswer: expected,
      provedProduct: product,
      provedQuotient: quotient,
    },
    ruleId: "math_numeric:mul_instead_of_div",
  };
}

/**
 * Typed division — subtraction confusion: selected === dividend − divisor.
 * @param {object} p
 */
export function proveSubInsteadOfDivOnDiv(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC2_DIV_KINDS.includes(kind)) return null;
  const ops = resolveDivOperands(p);
  if (!ops) return null;
  const { dividend: a, divisor: b } = ops;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (user === expected) return null;
  const quotient = a / b;
  if (!Number.isInteger(quotient) || expected !== quotient) return null;
  const diff = a - b;
  if (user !== diff || diff === quotient) return null;
  return {
    tag: "sub_instead_of_div",
    details: {
      dividend: a,
      divisor: b,
      selectedAnswer: user,
      correctAnswer: expected,
      provedDiff: diff,
    },
    ruleId: "math_numeric:sub_instead_of_div",
  };
}

/**
 * Typed division — near-neighbor quotient fact: selected ∈ {q±1}.
 * Broader ±2..9 lives in structural tier.
 * @param {object} p
 */
export function proveDivisionFactErrorOnDiv(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC2_DIV_KINDS.includes(kind)) return null;
  const ops = resolveDivOperands(p);
  if (!ops) return null;
  const { dividend: a, divisor: b } = ops;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (user === expected) return null;
  const quotient = a / b;
  if (!Number.isInteger(quotient) || expected !== quotient) return null;
  if (Math.abs(user - quotient) !== 1) return null;
  return {
    tag: "division_fact_error",
    details: {
      dividend: a,
      divisor: b,
      selectedAnswer: user,
      correctAnswer: expected,
      expected: quotient,
      user,
      mode: "near_neighbor_quot",
    },
    ruleId: "math_numeric:division_fact_error:near_neighbor",
  };
}

/**
 * Generator template #4 — decimal place / truncation after add or sub.
 * Kind: `dec_add` | `dec_sub` only (never facts / topic-only / rounding kinds).
 * Proof (exact identity only):
 *   selected === (a±b)*10  OR  selected === (a±b)/10
 *   OR when correct is fractional: selected === trunc(correct) OR selected === round(correct)
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number|null} p.a
 * @param {number|null} p.b
 * @param {number} p.userAnswer
 * @param {number} p.expectedAnswer
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveDecimalPlaceShiftOnDecAddSub(p) {
  const kind = pickKind(p?.kind);
  if (kind !== "dec_add" && kind !== "dec_sub") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  const trueOp = kind === "dec_add" ? a + b : a - b;
  if (!exactEq(expected, trueOp)) return null;

  /** @type {string|null} */
  let mode = null;
  if (exactEq(user, trueOp * 10)) mode = "times_10";
  else if (exactEq(user, trueOp / 10)) mode = "div_10";
  else if (hasFractionalPart(expected)) {
    const truncE = Math.trunc(expected);
    const roundE = Math.round(expected);
    if (exactEq(user, truncE) && !exactEq(truncE, expected)) mode = "trunc";
    else if (exactEq(user, roundE) && !exactEq(roundE, expected)) mode = "round";
  }
  if (!mode) return null;

  return {
    tag: "math_decimal_place_shift_error",
    details: {
      a,
      b,
      kind,
      selectedAnswer: user,
      correctAnswer: expected,
      trueOp,
      mode,
    },
    ruleId: "math_numeric:math_decimal_place_shift_error",
  };
}

/**
 * Generator template #5a — multiplication op-confusion.
 * Kinds: Topic-2 mul kinds. Never facts / topic-only.
 * Proof: selectedAnswer === mx + my (and not equal to correct mx × my).
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveAddInsteadOfMulOnMul(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC2_MUL_KINDS.includes(kind)) return null;
  const ops = resolveMulOperands(kind, p);
  if (!ops) return null;
  const { mx: a, my: b } = ops;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (user === expected) return null;
  const product = a * b;
  if (expected !== product) return null;
  const sum = a + b;
  if (user !== sum) return null;
  if (user === product) return null;
  return {
    tag: "add_instead_of_mul",
    details: {
      a,
      b,
      mx: a,
      my: b,
      selectedAnswer: user,
      correctAnswer: expected,
      provedSum: sum,
    },
    ruleId: "math_numeric:add_instead_of_mul",
  };
}

/**
 * Generator template #5b — single wrong multiplication fact (near-neighbor only).
 * Kinds: Topic-2 mul kinds. Never facts / topic-only.
 * Proof: selected ∈ { mx*(my±1), (mx±1)*my } and ≠ mx*my.
 *
 * @param {object} p
 * @returns {{ tag: string, details: Record<string, unknown>, ruleId: string }|null}
 */
export function proveMultiplicationFactErrorOnMul(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC2_MUL_KINDS.includes(kind)) return null;
  const ops = resolveMulOperands(kind, p);
  if (!ops) return null;
  const { mx: a, my: b } = ops;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (user === expected) return null;
  const product = a * b;
  if (expected !== product) return null;
  const nearFacts = [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b].filter(
    (v) => Number.isFinite(v) && v !== product,
  );
  if (!nearFacts.includes(user)) return null;
  return {
    tag: "multiplication_fact_error",
    details: {
      a,
      b,
      mx: a,
      my: b,
      selectedAnswer: user,
      correctAnswer: expected,
      expected: product,
      user,
      nearFacts,
    },
    ruleId: "math_numeric:multiplication_fact_error:near_neighbor",
  };
}

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 * @param {string|null|undefined} kind
 * @returns {{ tag: string|null, evidenceType: string, details: Record<string, unknown>, confidence: number }|null}
 */
export function classifyMathNumericAnswer(userAnswer, expectedAnswer, params, kind) {
  if (userAnswer == null || expectedAnswer == null) return null;

  const p = params && typeof params === "object" ? params : {};
  const k = pickKind(kind) || pickKind(p.kind);

  // Topic-3 fractions — exact TEPs + structural (string or numeric answers).
  if (isTopic3FracKind(k) || k.includes("frac")) {
    const fracHit = classifyFractionAnswer({
      kind: k,
      ...p,
      userAnswer,
      expectedAnswer,
    });
    if (fracHit) {
      return hitWithRule(
        fracHit.tag,
        { ...fracHit.details, kind: k },
        fracHit.ruleId,
        fracHit.confidence ?? 0.92,
      );
    }
    // Legacy early compare/add paths already covered by classifyFractionAnswer.
    // Fall through only for non-fraction-shaped answers (e.g. integer half-of-N).
  }

  const n = num(userAnswer);
  const expected = num(expectedAnswer);

  // Topic-2 remainder MCQ answers are Hebrew strings — handle before numeric early-exit.
  if (n == null || expected == null) {
    const remHit = proveRemainderIdentityError({
      kind: k,
      dividend: num(p.dividend) ?? num(p.a),
      divisor: num(p.divisor) ?? num(p.b),
      a: num(p.a),
      b: num(p.b),
      userAnswer,
      expectedAnswer,
    });
    if (remHit) {
      return hitWithRule(remHit.tag, remHit.details, remHit.ruleId, remHit.confidence ?? 0.9);
    }
    return null;
  }
  if (n === expected) return null;
  const a = num(p.a);
  const b = num(p.b);
  const c = num(p.c);

  // Batch core-ops: decimals / rounding / equations / percentages / word_problems
  // Exact TEPs + structural; early return avoids legacy WP FP paths.
  if (isCoreOpsKind(k)) {
    const coreHit = classifyCoreOpsAnswer({
      kind: k,
      ...p,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (coreHit) {
      return hitWithRule(
        coreHit.tag,
        { ...coreHit.details, kind: k, userAnswer: n, expectedAnswer: expected },
        coreHit.ruleId,
        coreHit.confidence ?? 0.9,
      );
    }
    return null;
  }

  // Geometry numeric TEPs (area / perimeter / volume / angles / pythagoras)
  if (isGeometryNumericKind(k) || String(k).startsWith("heights_")) {
    const geoHit = classifyGeometryAnswer({
      kind: k,
      ...p,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (geoHit) {
      return hitWithRule(
        geoHit.tag,
        { ...geoHit.details, kind: k, userAnswer: n, expectedAnswer: expected },
        geoHit.ruleId,
        geoHit.confidence ?? 0.9,
      );
    }
    return null;
  }

/** @type {{ tag: string, details: Record<string, unknown>, ruleId: string }|null} */
  let hit = null;

  // W4 / TEP-A5: omitted_addend on add_three (before mul — partial sum is the clearer claim)
  if (!hit) {
    const omitted = proveOmittedAddendOnAddThree({
      kind: k,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (omitted) hit = omitted;
  }

  // W3 / TEP-A4: mul_instead_of_add (before sub-instead; product is more specific when both rare-overlap)
  if (!hit) {
    const mulInsteadAdd = proveMulInsteadOfAddOnAddKind({
      kind: k,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (mulInsteadAdd) hit = mulInsteadAdd;
  }

  // W3 / TEP-A3: sub_instead_of_add (before place slips — |a−b| can equal sum−10)
  if (!hit) {
    const subInsteadAdd = proveSubInsteadOfAddOnAddKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (subInsteadAdd) hit = subInsteadAdd;
  }

  // W3 / TEP-S1: add_instead_of_sub on sub_two | sub_vertical
  if (!hit) {
    const addInstead = proveAddInsteadOfSubOnSubKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (addInstead) hit = addInstead;
  }

  // W3 / TEP-S3: operand_reversal BEFORE borrow (W2 regression fix)
  if (!hit) {
    const reversal = proveOperandReversalOnSubKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (reversal) hit = reversal;
  }

  // W2: borrow_error on sub_two | sub_vertical (after operand_reversal)
  if (!hit) {
    const borrowHit = proveBorrowErrorOnSubKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (borrowHit) hit = borrowHit;
  }

  // W2: carry_error on add_two | add_vertical | add_second_decade (before ±10ᵏ — carry is more specific)
  if (!hit) {
    const carryHit = proveCarryErrorOnAddKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (carryHit) hit = carryHit;
    else if (
      (k === "add_two" || k === "add_vertical" || k === "add_second_decade") &&
      a != null &&
      b != null
    ) {
      // Alias tag for M-02 when same no-carry identity holds via a+b−10
      const onesSum = Math.abs(a % 10) + Math.abs(b % 10);
      const sum = a + b;
      if (onesSum >= 10 && n === a + b - 10 && n !== sum && expected === sum) {
        hit = {
          tag: "column_carry_error",
          details: { a, b, expected: sum, droppedCarry: 10 },
          ruleId: "math_numeric:column_carry_error",
        };
      }
    }
  }

  // W3 / TEP-A2b: ones/tens collapse before ±10ᵏ (same tag; more specific ruleId)
  if (!hit) {
    const collapse = provePlaceValueOnesTensCollapseOnAddKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (collapse) hit = collapse;
  }

  // W3 / TEP-A2 + TEP-S4: place-value ±10ᵏ slips
  if (!hit) {
    const placeAdd = provePlaceValuePowerSlipOnAddKind({
      kind: k,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (placeAdd) hit = placeAdd;
  }
  if (!hit) {
    const placeSub = provePlaceValuePowerSlipOnSubKind({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (placeSub) hit = placeSub;
  }

  // Template #3: typed div — mul_instead_of_div (selected === dividend*divisor)
  if (!hit) {
    const mulInsteadDiv = proveMulInsteadOfDivOnDiv({
      kind: k,
      a,
      b,
      dividend: num(p.dividend),
      divisor: num(p.divisor),
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (mulInsteadDiv) hit = mulInsteadDiv;
  }

  // Topic-2: typed div — sub_instead_of_div / division_fact_error
  if (!hit) {
    const subInsteadDiv = proveSubInsteadOfDivOnDiv({
      kind: k,
      a,
      b,
      dividend: num(p.dividend),
      divisor: num(p.divisor),
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (subInsteadDiv) hit = subInsteadDiv;
  }
  if (!hit) {
    const divFact = proveDivisionFactErrorOnDiv({
      kind: k,
      a,
      b,
      dividend: num(p.dividend),
      divisor: num(p.divisor),
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (divFact) hit = divFact;
  }

  // Template #4: dec_add|dec_sub — math_decimal_place_shift_error
  if (!hit) {
    const decShift = proveDecimalPlaceShiftOnDecAddSub({
      kind: k,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (decShift) hit = decShift;
  }

  // Template #5a: mul kinds — add_instead_of_mul (selected === mx+my)
  if (!hit) {
    const addInsteadMul = proveAddInsteadOfMulOnMul({
      kind: k,
      a,
      b,
      tens: num(p.tens),
      hundreds: num(p.hundreds),
      multiplier: num(p.multiplier),
      twoDigit: num(p.twoDigit),
      oneDigit: num(p.oneDigit),
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (addInsteadMul) hit = addInsteadMul;
  }

  if (k.startsWith("wp_") && a != null && b != null && n === a * b) {
    hit = { tag: "wrong_operation_wp", details: { a, b }, ruleId: "math_numeric:wrong_operation_wp" };
  }

  if (isDecimalRoundingKind(k)) {
    const places = num(p.places) ?? 1;
    const factor = 10 ** places;
    const roundedUp = Math.ceil(expected * factor) / factor;
    const roundedDown = Math.floor(expected * factor) / factor;
    if (Math.abs(n - roundedUp) < 1e-9 && Math.abs(n - expected) > 1e-9) {
      hit = {
        tag: "rounding_wrong_direction",
        details: { direction: "up", expected, user: n },
        ruleId: "math_numeric:rounding_wrong_direction",
      };
    } else if (Math.abs(n - roundedDown) < 1e-9 && Math.abs(n - expected) > 1e-9) {
      hit = {
        tag: "rounding_wrong_direction",
        details: { direction: "down", expected, user: n },
        ruleId: "math_numeric:rounding_wrong_direction",
      };
    }
  }

  if (k.includes("place") || k.includes("digit")) {
    const strE = String(expected);
    const strU = String(n);
    if (strE.length === strU.length && strE !== strU) {
      const diff = [...strE].filter((ch, i) => strU[i] !== ch).length;
      if (diff === 1) {
        hit = { tag: "place_value_error", details: { expected, user: n }, ruleId: "math_numeric:place_value_error" };
      }
    }
  }

  // Template #5b: mul kinds — multiplication_fact_error (near-neighbor only)
  if (!hit) {
    const mulFact = proveMultiplicationFactErrorOnMul({
      kind: k,
      a,
      b,
      tens: num(p.tens),
      hundreds: num(p.hundreds),
      multiplier: num(p.multiplier),
      twoDigit: num(p.twoDigit),
      oneDigit: num(p.oneDigit),
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (mulFact) hit = mulFact;
  }

  if (isFractionAddSubKind(k) && !hit) {
    // Numeric-only fallthrough (integer mistaken for fraction result)
    const n1 = num(p.n1);
    const d1 = num(p.den1 ?? p.d1);
    const n2 = num(p.n2);
    const d2 = num(p.den2 ?? p.d2);
    if (n1 != null && d1 != null && n2 != null && d2 != null && n === n1 + n2) {
      hit = {
        tag: "common_denominator_error",
        details: { n1, d1, n2, d2, mode: "numerator_sum_as_integer" },
        ruleId: "math_numeric:common_denominator_error:integer_num_sum",
      };
    }
  }

  if (k.startsWith("wp_unit") && !hit) {
    const factor = num(p.factor) ?? num(p.conversionFactor) ?? 100;
    if (a != null && expected != null) {
      if (
        n === a * factor ||
        n === a / factor ||
        (n === a && expected !== a) ||
        (factor > 1 && n === a * 10 && expected === a * factor)
      ) {
        hit = {
          tag: "unit_error",
          details: { kind: k, a, expected, user: n, factor },
          ruleId: "math_numeric:unit_error",
        };
      }
    }
  }

  if (k.startsWith("wp_") && a != null && b != null && n === a + b && expected !== a + b) {
    hit = {
      tag: "wrong_operation_wp",
      details: { a, b, user: n },
      ruleId: "math_numeric:wrong_operation_wp",
    };
  }

  // High-recall structural tier (after all exact Topic-1 prove helpers).
  // Exact identities only: single-column digit slip, local column override, ±1..9 near-miss.
  if (!hit) {
    const structural = classifyStructuralAddSubError({
      kind: k,
      a,
      b,
      c,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (structural) hit = structural;
  }

  // Topic-2 structural tier (mul/div) — after Topic-1 structural.
  if (!hit) {
    const structuralMulDiv = classifyStructuralMulDivError({
      kind: k,
      params: p,
      a,
      b,
      userAnswer: n,
      expectedAnswer: expected,
    });
    if (structuralMulDiv) hit = structuralMulDiv;
  }

  if (!hit) return null;

  const conf = typeof hit.confidence === "number" ? hit.confidence : 0.92;
  return hitWithRule(
    hit.tag,
    { ...hit.details, kind: k, userAnswer: n, expectedAnswer: expected },
    hit.ruleId,
    conf,
  );
}
