/**
 * Deterministic math/geometry numeric answer classifier.
 * Only emits tags when numeric relation is provable from operands + userAnswer.
 */

import { EVIDENCE_TYPES } from "../answer-evidence-contract.js";

/** @param {unknown} v */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function pickKind(v) {
  return v != null ? String(v).trim() : "";
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

  if (k.includes("frac")) {
    const userStr = String(userAnswer).trim();
    const expectedStr = String(expectedAnswer).trim();
    if (userStr && expectedStr && userStr !== expectedStr) {
      if ((k === "frac_add" || k === "frac_add_sub" || k.includes("frac_add")) && userStr.includes("/")) {
        const n1 = num(p.n1);
        const d1 = num(p.den1 ?? p.d1);
        const n2 = num(p.n2);
        const d2 = num(p.den2 ?? p.d2);
        if (n1 != null && d1 != null && n2 != null && d2 != null) {
          const mirrorSum = `${n1 + n2}/${d1 + d2}`;
          if (userStr === mirrorSum) {
            return {
              tag: "common_denominator_error",
              evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
              details: { n1, d1, n2, d2, mirrorSum, kind: k },
              confidence: 0.92,
            };
          }
        }
      }
      if (k.includes("compare") || k.includes("frac")) {
        const [en, ed] = expectedStr.split("/").map(num);
        const [un, ud] = userStr.split("/").map(num);
        if (en != null && ed != null && un != null && ud != null) {
          if (un === en && ud !== ed) {
            return {
              tag: "denominator_only_compare",
              evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
              details: { un, ud, en, ed, kind: k },
              confidence: 0.92,
            };
          }
          if (ud === ed && un !== en) {
            return {
              tag: "numerator_only_compare",
              evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
              details: { un, ud, en, ed, kind: k },
              confidence: 0.92,
            };
          }
        }
      }
    }
  }

  const n = num(userAnswer);
  const expected = num(expectedAnswer);
  if (n == null || expected == null) return null;
  if (n === expected) return null;
  const a = num(p.a);
  const b = num(p.b);
  const c = num(p.c);

  /** @type {{ tag: string, details: Record<string, unknown> }|null} */
  let hit = null;

  if (k === "add_three" && a != null && b != null && c != null) {
    const full = a + b + c;
    if (n === a + b) hit = { tag: "omitted_addend", details: { omitted: "c", partialSum: a + b } };
    else if (n === b + c) hit = { tag: "omitted_addend", details: { omitted: "a", partialSum: b + c } };
    else if (n === a + c) hit = { tag: "omitted_addend", details: { omitted: "b", partialSum: a + c } };
    else if (n === a * b * c) hit = { tag: "mul_instead_of_add", details: { operands: [a, b, c] } };
    void full;
  }

  if (
    (k === "add_two" || k === "add_vertical" || k === "add_second_decade" || k === "add_tens_only") &&
    a != null &&
    b != null
  ) {
    if (n === a * b) hit = { tag: "mul_instead_of_add", details: { a, b } };
    else if (n === Math.abs(a - b)) hit = { tag: "sub_instead_of_add", details: { a, b } };
  }

  if ((k === "sub_two" || k === "sub_vertical") && a != null && b != null) {
    if (n === a + b) hit = { tag: "add_instead_of_sub", details: { a, b, expected: a - b } };
    else if (n === b - a && b >= a) hit = { tag: "operand_reversal", details: { a, b } };
  }

  if (
    k === "mul" ||
    k === "mul_vertical" ||
    k === "mul_tens" ||
    k === "mul_hundreds"
  ) {
    let mx = a;
    let my = b;
    if (k === "mul_tens") {
      mx = num(p.tens);
      my = num(p.multiplier);
    } else if (k === "mul_hundreds") {
      mx = num(p.hundreds);
      my = num(p.multiplier);
    } else if (k === "mul_vertical") {
      mx = num(p.twoDigit);
      my = num(p.oneDigit);
    }
    if (mx != null && my != null && n === mx + my) {
      hit = { tag: "add_instead_of_mul", details: { mx, my } };
    }
  }

  if (k.startsWith("wp_") && a != null && b != null && n === a * b) {
    hit = { tag: "wrong_operation_wp", details: { a, b } };
  }

  if (k.startsWith("dec_") || k.includes("round")) {
    const places = num(p.places) ?? 1;
    const factor = 10 ** places;
    const roundedUp = Math.ceil(expected * factor) / factor;
    const roundedDown = Math.floor(expected * factor) / factor;
    if (Math.abs(n - roundedUp) < 1e-9 && Math.abs(n - expected) > 1e-9) {
      hit = { tag: "rounding_wrong_direction", details: { direction: "up", expected, user: n } };
    } else if (Math.abs(n - roundedDown) < 1e-9 && Math.abs(n - expected) > 1e-9) {
      hit = { tag: "rounding_wrong_direction", details: { direction: "down", expected, user: n } };
    }
  }

  if (k.includes("place") || k.includes("digit")) {
    const strE = String(expected);
    const strU = String(n);
    if (strE.length === strU.length && strE !== strU) {
      const diff = [...strE].filter((ch, i) => strU[i] !== ch).length;
      if (diff === 1) hit = { tag: "place_value_error", details: { expected, user: n } };
    }
  }

  if (k.includes("frac") && typeof expectedAnswer === "string" && String(expectedAnswer).includes("/")) {
    const [en, ed] = String(expectedAnswer).split("/").map(num);
    const [un, ud] = String(userAnswer).split("/").map(num);
    if (en != null && ed != null && un != null && ud != null) {
      if (un === en && ud !== ed) hit = { tag: "denominator_only_compare", details: { un, ud, en, ed } };
      else if (ud === ed && un !== en) hit = { tag: "numerator_only_compare", details: { un, ud, en, ed } };
    }
  }

  if (k.includes("tri") && k.includes("area") && a != null && b != null) {
    const half = (a * b) / 2;
    if (n === a * b) hit = { tag: "forgot_divide_by_2", details: { base: a, height: b } };
    void half;
  }

  if ((k.includes("perimeter") || k.includes("area")) && a != null && b != null) {
    const area = a * b;
    const perim = 2 * (a + b);
    if (k.includes("area") && n === perim) hit = { tag: "perimeter_area_confusion", details: { a, b } };
    if (k.includes("perimeter") && n === area) hit = { tag: "perimeter_area_confusion", details: { a, b } };
  }

  if (
    (k === "add_two" || k === "add_vertical" || k === "add_three") &&
    a != null &&
    b != null
  ) {
    const sum = a + b + (c != null && k === "add_three" ? c : 0);
    const onesA = Math.abs(a % 10);
    const onesB = Math.abs(b % 10);
    const onesSum = onesA + onesB;
    if (onesSum >= 10 && k !== "add_three") {
      const noCarryTens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10 + (onesSum % 10);
      if (n === noCarryTens && n !== sum) {
        hit = { tag: "carry_error", details: { a, b, expected: sum, noCarrySum: noCarryTens } };
      }
    }
    if (c != null && k === "add_three") {
      const partial = a + b;
      const onesAB = (partial % 10) + (c % 10);
      if (onesAB >= 10) {
        const noCarry = Math.floor(partial / 10) * 10 + Math.floor(c / 10) * 10 + (onesAB % 10);
        if (n === noCarry && n !== sum) {
          hit = { tag: "carry_error", details: { partial, c, expected: sum } };
        }
      }
    }
  }

  if (
    (k === "mul" || k === "mul_vertical" || k === "mul_tens" || k === "mul_hundreds") &&
    !hit
  ) {
    let mx = a;
    let my = b;
    if (k === "mul_tens") {
      mx = num(p.tens);
      my = num(p.multiplier);
    } else if (k === "mul_hundreds") {
      mx = num(p.hundreds);
      my = num(p.multiplier);
    } else if (k === "mul_vertical") {
      mx = num(p.twoDigit);
      my = num(p.oneDigit);
    }
    if (mx != null && my != null) {
      const product = mx * my;
      const nearFacts = [
        mx * (my - 1),
        mx * (my + 1),
        (mx - 1) * my,
        (mx + 1) * my,
      ].filter((v) => Number.isFinite(v) && v !== product);
      if (nearFacts.includes(n)) {
        hit = { tag: "multiplication_fact_error", details: { mx, my, expected: product, user: n } };
      }
    }
  }

  if ((k === "frac_add" || k === "frac_add_sub" || k.includes("frac_add")) && !hit) {
    const n1 = num(p.n1);
    const d1 = num(p.den1 ?? p.d1);
    const n2 = num(p.n2);
    const d2 = num(p.den2 ?? p.d2);
    if (n1 != null && d1 != null && n2 != null && d2 != null) {
      const mirrorSum = `${n1 + n2}/${d1 + d2}`;
      const userFrac = String(userAnswer);
      if (userFrac === mirrorSum || n === n1 + n2) {
        hit = { tag: "common_denominator_error", details: { n1, d1, n2, d2, mirrorSum } };
      }
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
        hit = { tag: "unit_error", details: { kind: k, a, expected, user: n, factor } };
      }
    }
  }

  if (k.startsWith("wp_") && a != null && b != null && n === a + b && expected !== a + b) {
    hit = { tag: "wrong_operation_wp", details: { a, b, user: n } };
  }

  if (!hit) return null;

  return {
    tag: hit.tag,
    evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
    details: { ...hit.details, kind: k, userAnswer: n, expectedAnswer: expected },
    confidence: 0.92,
  };
}
