/**
 * Topic-3 fraction exact TEPs + structural high-recall.
 * Exact identities only → 0 FP on far-wrong answers.
 */

import {
  formatFraction,
  fractionsEqual,
  fractionsSameWritten,
  isTopic3FracKind,
  parseFraction,
  reduceFraction,
  TOPIC3_FRAC_ADD_SUB_KINDS,
  TOPIC3_FRAC_COMPARE_KINDS,
  TOPIC3_FRAC_DIV_KINDS,
  TOPIC3_FRAC_MUL_KINDS,
  TOPIC3_FRAC_SIMPLIFY_KINDS,
} from "./fraction-parse.js";

/** @param {unknown} v */
function pickKind(v) {
  return v != null ? String(v).trim() : "";
}

/** @param {unknown} v */
function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} p
 */
function readOperands(p) {
  return {
    n1: num(p.n1),
    d1: num(p.den1 ?? p.d1),
    n2: num(p.n2),
    d2: num(p.den2 ?? p.d2),
    den: num(p.den),
    num: num(p.num),
    reducedNum: num(p.reducedNum ?? p.finalNum),
    reducedDen: num(p.reducedDen ?? p.finalDen),
    op: p.op != null ? String(p.op) : null,
  };
}

/**
 * Mirror / add-denominators error on add/sub.
 * @param {object} p
 */
export function proveCommonDenominatorError(p) {
  const kind = pickKind(p?.kind);
  const isAddSub =
    TOPIC3_FRAC_ADD_SUB_KINDS.includes(kind) ||
    kind.includes("frac_add") ||
    kind.includes("frac_sub");
  if (!isAddSub) return null;

  const { n1, d1, n2, d2, op } = readOperands(p);
  if (n1 == null || d1 == null || n2 == null || d2 == null) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  // Prefer explicit op; never treat kind "frac_add_sub" as subtraction by substring.
  const isSub =
    op === "sub" ||
    kind === "frac_sub" ||
    kind.includes("same_den_sub") ||
    (kind.includes("sub") && !kind.includes("add_sub"));
  const mirrorN = isSub ? n1 - n2 : n1 + n2;
  const mirrorD = d1 + d2;
  if (mirrorD === 0) return null;
  if (user.n === mirrorN && user.d === mirrorD) {
    return {
      tag: "common_denominator_error",
      details: {
        kind,
        n1,
        d1,
        n2,
        d2,
        mode: "mirror_sum_dens",
        mirror: formatFraction(mirrorN, mirrorD, { reduce: false }),
      },
      ruleId: "math_numeric:common_denominator_error:mirror_sum",
      confidence: 0.92,
    };
  }
  return null;
}

/**
 * Add/sub numerators while keeping one operand's denominator (unlike dens)
 * or inventing a den without common-den procedure.
 * @param {object} p
 */
export function proveNumeratorOnlyOperation(p) {
  const kind = pickKind(p?.kind);
  const isAddSub =
    TOPIC3_FRAC_ADD_SUB_KINDS.includes(kind) ||
    kind.includes("frac_add") ||
    kind.includes("frac_sub");
  if (!isAddSub) return null;

  const { n1, d1, n2, d2, op } = readOperands(p);
  if (n1 == null || d1 == null || n2 == null || d2 == null) return null;
  // Requires unlike denominators — same-den is ordinary num arithmetic.
  if (d1 === d2) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  const isSub =
    op === "sub" ||
    kind === "frac_sub" ||
    kind.includes("same_den_sub") ||
    (kind.includes("sub") && !kind.includes("add_sub"));
  const sumN = isSub ? n1 - n2 : n1 + n2;
  const candidates = [
    { n: sumN, d: d1 },
    { n: sumN, d: d2 },
    { n: sumN, d: Math.max(d1, d2) },
  ];
  for (const c of candidates) {
    if (c.d === 0) continue;
    if (user.n === c.n && user.d === c.d && !fractionsEqual(c, expected)) {
      return {
        tag: "numerator_only_operation",
        details: {
          kind,
          n1,
          d1,
          n2,
          d2,
          mode: "add_nums_keep_one_den",
          selected: formatFraction(c.n, c.d, { reduce: false }),
        },
        ruleId: "math_numeric:numerator_only_operation",
        confidence: 0.9,
      };
    }
  }
  return null;
}

/**
 * Compare same-denominator: pick wrong numerator or wrong den.
 * @param {object} p
 */
export function proveFractionCompareError(p) {
  const kind = pickKind(p?.kind);
  const isCompare =
    TOPIC3_FRAC_COMPARE_KINDS.includes(kind) || kind.includes("compare");
  if (!isCompare || !kind.includes("frac")) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  if (user.n === expected.n && user.d !== expected.d) {
    return {
      tag: "denominator_only_compare",
      details: { kind, user, expected, mode: "den_only" },
      ruleId: "math_numeric:denominator_only_compare",
      confidence: 0.92,
    };
  }
  if (user.d === expected.d && user.n !== expected.n) {
    return {
      tag: "numerator_only_compare",
      details: { kind, user, expected, mode: "num_only" },
      ruleId: "math_numeric:numerator_only_compare",
      confidence: 0.92,
    };
  }
  return null;
}

/**
 * Division: multiply without taking reciprocal of divisor.
 * @param {object} p
 */
export function proveFractionReciprocalError(p) {
  const kind = pickKind(p?.kind);
  if (!TOPIC3_FRAC_DIV_KINDS.includes(kind) && kind !== "frac_divide") return null;

  const { n1, d1, n2, d2 } = readOperands(p);
  if (n1 == null || d1 == null || n2 == null || d2 == null || n2 === 0) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  // True: (n1/d1)÷(n2/d2) = (n1*d2)/(d1*n2)
  const trueProd = reduceFraction(n1 * d2, d1 * n2);
  if (!fractionsEqual(expected, trueProd)) return null;

  // Wrong: multiply without reciprocal (n1*n2)/(d1*d2)
  const noFlip = { n: n1 * n2, d: d1 * d2 };
  if (fractionsEqual(user, noFlip) || fractionsSameWritten(user, noFlip)) {
    return {
      tag: "fraction_reciprocal_error",
      details: {
        kind,
        n1,
        d1,
        n2,
        d2,
        mode: "multiply_without_reciprocal",
        wrong: formatFraction(noFlip.n, noFlip.d),
      },
      ruleId: "math_numeric:fraction_reciprocal_error",
      confidence: 0.92,
    };
  }

  // Wrong: reciprocal of dividend instead of divisor
  if (n1 !== 0) {
    const flipWrong = { n: d1 * n2, d: n1 * d2 };
    if (fractionsEqual(user, flipWrong) || fractionsSameWritten(user, flipWrong)) {
      return {
        tag: "fraction_reciprocal_error",
        details: {
          kind,
          n1,
          d1,
          n2,
          d2,
          mode: "reciprocal_wrong_operand",
          wrong: formatFraction(flipWrong.n, flipWrong.d),
        },
        ruleId: "math_numeric:fraction_reciprocal_error:wrong_operand",
        confidence: 0.9,
      };
    }
  }
  return null;
}

/**
 * Simplification: cancelled only one part, or used wrong factor.
 * @param {object} p
 */
export function proveFractionSimplificationError(p) {
  const kind = pickKind(p?.kind);
  const isSimplify =
    TOPIC3_FRAC_SIMPLIFY_KINDS.includes(kind) ||
    kind === "frac_reduce" ||
    kind.includes("simplify");
  if (!isSimplify) return null;

  const ops = readOperands(p);
  const srcN = ops.num ?? ops.n1;
  const srcD = ops.den ?? ops.d1;
  if (srcN == null || srcD == null || srcD === 0) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  const fully = reduceFraction(srcN, srcD);
  if (!fractionsEqual(expected, fully)) return null;

  // Cancelled numerator only / denominator only (left other unchanged)
  if (user.n === fully.n && user.d === srcD && user.d !== fully.d) {
    return {
      tag: "fraction_simplification_error",
      details: { kind, mode: "num_only_reduce", srcN, srcD, user, expected },
      ruleId: "math_numeric:fraction_simplification_error:num_only",
      confidence: 0.9,
    };
  }
  if (user.d === fully.d && user.n === srcN && user.n !== fully.n) {
    return {
      tag: "fraction_simplification_error",
      details: { kind, mode: "den_only_reduce", srcN, srcD, user, expected },
      ruleId: "math_numeric:fraction_simplification_error:den_only",
      confidence: 0.9,
    };
  }

  // Divided both by wrong factor (partial cancel) — e.g. 4/8 → 2/8 or 4/4
  const g = Math.abs(fully.n) > 0 ? srcN / fully.n : 0;
  if (g > 1) {
    for (const bad of [2, 3, 4, 5]) {
      if (bad === g) continue;
      if (srcN % bad !== 0 || srcD % bad !== 0) continue;
      const partial = { n: srcN / bad, d: srcD / bad };
      if (fractionsSameWritten(user, partial) && !fractionsEqual(partial, expected)) {
        return {
          tag: "fraction_simplification_error",
          details: { kind, mode: "wrong_factor", factor: bad, srcN, srcD },
          ruleId: "math_numeric:fraction_simplification_error:wrong_factor",
          confidence: 0.88,
        };
      }
    }
  }
  return null;
}

/**
 * Multiply cross / add instead patterns are out of scope; keep mul identity light.
 * Structural near-miss after exact TEPs.
 * @param {object} p
 */
export function proveFractionStructuralNearMiss(p) {
  const kind = pickKind(p?.kind);
  if (!isTopic3FracKind(kind)) return null;
  // Skip unit-fraction word kinds with integer answers
  if (kind.startsWith("frac_half") || kind.startsWith("frac_quarter")) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  // Same denominator, numerator ±1
  if (user.d === expected.d && Math.abs(user.n - expected.n) === 1) {
    return {
      tag: "calculation_off_by_one",
      details: {
        kind,
        mode: "numerator_off_by_one",
        user,
        expected,
        tier: "structural",
      },
      ruleId: "math_numeric:calculation_off_by_one:frac_num",
      confidence: 0.84,
    };
  }
  // Same numerator, denominator ±1 (not zero)
  if (
    user.n === expected.n &&
    Math.abs(user.d - expected.d) === 1 &&
    user.d > 0 &&
    expected.d > 0
  ) {
    return {
      tag: "calculation_off_by_one",
      details: {
        kind,
        mode: "denominator_off_by_one",
        user,
        expected,
        tier: "structural",
      },
      ruleId: "math_numeric:calculation_off_by_one:frac_den",
      confidence: 0.82,
    };
  }

  // Near-miss k∈{2..3} on numerator, same den
  if (user.d === expected.d) {
    const kAbs = Math.abs(user.n - expected.n);
    if (kAbs >= 2 && kAbs <= 3) {
      return {
        tag: "calculation_near_miss",
        details: {
          kind,
          mode: "numerator_near_miss",
          k: kAbs,
          user,
          expected,
          tier: "structural",
        },
        ruleId: "math_numeric:calculation_near_miss:frac_num",
        confidence: 0.78,
      };
    }
  }
  return null;
}

/**
 * Run all exact Topic-3 proves then structural.
 * @param {object} p
 */
export function classifyFractionAnswer(p) {
  const kind = pickKind(p?.kind);
  if (!isTopic3FracKind(kind)) return null;

  const user = parseFraction(p.userAnswer);
  const expected = parseFraction(p.expectedAnswer);
  if (!user || !expected) return null;
  if (fractionsEqual(user, expected)) return null;

  /** @type {Array<(x: object) => object|null>} */
  const exact = [
    proveCommonDenominatorError,
    proveNumeratorOnlyOperation,
    proveFractionCompareError,
    proveFractionReciprocalError,
    proveFractionSimplificationError,
  ];
  for (const fn of exact) {
    const hit = fn(p);
    if (hit) return hit;
  }

  // Mul: accidental add of nums/dens (light exact)
  if (TOPIC3_FRAC_MUL_KINDS.includes(kind) || kind === "frac_multiply") {
    const { n1, d1, n2, d2 } = readOperands(p);
    if (n1 != null && d1 != null && n2 != null && d2 != null) {
      const trueP = reduceFraction(n1 * n2, d1 * d2);
      if (fractionsEqual(expected, trueP)) {
        const addLike = { n: n1 + n2, d: d1 + d2 };
        if (fractionsSameWritten(user, addLike) || fractionsEqual(user, addLike)) {
          return {
            tag: "common_denominator_error",
            details: { kind, mode: "mul_as_add_mirror", n1, d1, n2, d2 },
            ruleId: "math_numeric:common_denominator_error:mul_as_add",
            confidence: 0.88,
          };
        }
      }
    }
  }

  return proveFractionStructuralNearMiss(p);
}
