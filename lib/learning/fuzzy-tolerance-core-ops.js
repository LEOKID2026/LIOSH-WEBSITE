/**
 * Batch core-ops diagnostics: decimals, rounding, equations, percentages, word_problems.
 * Exact TEPs first; structural near-miss only after exact (0 FP on far wrongs).
 */

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

function exactEq(x, y) {
  if (x === y) return true;
  return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
}

export function isCoreOpsKind(kind) {
  const k = pickKind(kind);
  if (!k) return false;
  return (
    k.startsWith("dec_") ||
    k === "round" ||
    k.startsWith("eq_") ||
    k.startsWith("perc_") ||
    k.startsWith("wp_")
  );
}

// ─── Decimals ───────────────────────────────────────────────────────────────

/**
 * Place ×÷10 / trunc on dec_add|dec_sub (extends existing template #4).
 * @param {object} p
 */
export function proveDecimalPlaceShift(p) {
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
  else if (exactEq(user, trueOp * 100)) mode = "times_100";
  else if (exactEq(user, trueOp / 100)) mode = "div_100";
  else {
    const truncE = Math.trunc(expected);
    const roundE = Math.round(expected);
    if (exactEq(user, truncE) && !exactEq(truncE, expected)) mode = "trunc";
    else if (exactEq(user, roundE) && !exactEq(roundE, expected)) mode = "round";
  }
  if (!mode) return null;
  return {
    tag: "math_decimal_place_shift_error",
    details: { a, b, kind, trueOp, mode, selectedAnswer: user, correctAnswer: expected },
    ruleId: `math_numeric:math_decimal_place_shift_error:${mode}`,
    confidence: 0.92,
  };
}

/**
 * Integer-alignment slip: treat decimals as integers then shift wrong.
 * e.g. 1.2+3.4 → 46 (as 12+34) instead of 4.6
 * @param {object} p
 */
export function proveDecimalAlignmentError(p) {
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

  // Scale both to integers by shared factor 10/100
  for (const places of [1, 2]) {
    const f = 10 ** places;
    const ai = Math.round(a * f);
    const bi = Math.round(b * f);
    if (!exactEq(ai / f, a) || !exactEq(bi / f, b)) continue;
    const intOp = kind === "dec_add" ? ai + bi : ai - bi;
    // Forgot to scale back
    if (exactEq(user, intOp) && !exactEq(intOp, expected)) {
      return {
        tag: "math_decimal_place_shift_error",
        details: { kind, mode: "alignment_no_rescale", places, a, b, selectedAnswer: user },
        ruleId: "math_numeric:math_decimal_place_shift_error:alignment",
        confidence: 0.9,
      };
    }
  }
  return null;
}

/**
 * Decimal mul/div ×÷10 slip on result.
 * @param {object} p
 */
export function proveDecimalMulDivSlip(p) {
  const kind = pickKind(p?.kind);
  if (
    kind !== "dec_multiply" &&
    kind !== "dec_divide" &&
    kind !== "dec_multiply_10_100" &&
    kind !== "dec_divide_10_100"
  ) {
    return null;
  }
  const a = num(p?.a) ?? num(p?.x);
  const b = num(p?.b) ?? num(p?.y) ?? num(p?.n);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  let trueOp = null;
  if (kind.includes("multiply")) trueOp = a * b;
  else if (b !== 0) trueOp = a / b;
  if (trueOp == null || !exactEq(expected, trueOp)) {
    // For *10/100 kinds expected may be a*10 etc.
    if (kind === "dec_multiply_10_100") {
      const factor = num(p?.factor) ?? 10;
      trueOp = a * factor;
    } else if (kind === "dec_divide_10_100") {
      const factor = num(p?.factor) ?? 10;
      trueOp = a / factor;
    }
  }
  if (trueOp == null || !exactEq(expected, trueOp)) return null;

  if (exactEq(user, trueOp * 10) || exactEq(user, trueOp / 10)) {
    return {
      tag: "math_decimal_place_shift_error",
      details: {
        kind,
        mode: exactEq(user, trueOp * 10) ? "times_10" : "div_10",
        a,
        b,
        trueOp,
      },
      ruleId: "math_numeric:math_decimal_place_shift_error:muldiv",
      confidence: 0.9,
    };
  }
  return null;
}

// ─── Rounding ───────────────────────────────────────────────────────────────

/**
 * @param {object} p
 */
export function proveRoundingDirectionError(p) {
  const kind = pickKind(p?.kind);
  const isRound =
    kind === "round" ||
    kind === "dec_round" ||
    kind.includes("dec_round") ||
    (kind.includes("round") && !kind.includes("dec_add") && !kind.includes("dec_sub"));
  if (!isRound) return null;

  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  const n = num(p?.n) ?? num(p?.a);
  const toWhat = num(p?.toWhat);
  const places = num(p?.places);
  if (user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  // Integer rounding to tens/hundreds
  if (kind === "round" && n != null && toWhat != null && toWhat > 0) {
    const trueR = Math.round(n / toWhat) * toWhat;
    if (!exactEq(expected, trueR)) return null;
    const floorR = Math.floor(n / toWhat) * toWhat;
    const ceilR = Math.ceil(n / toWhat) * toWhat;
    if (exactEq(user, floorR) && !exactEq(floorR, trueR)) {
      return {
        tag: "rounding_direction_error",
        details: { kind, mode: "down", n, toWhat, user, expected },
        ruleId: "math_numeric:rounding_direction_error:down",
        confidence: 0.92,
      };
    }
    if (exactEq(user, ceilR) && !exactEq(ceilR, trueR)) {
      return {
        tag: "rounding_direction_error",
        details: { kind, mode: "up", n, toWhat, user, expected },
        ruleId: "math_numeric:rounding_direction_error:up",
        confidence: 0.92,
      };
    }
    // Midpoint / off-by-one step
    if (exactEq(user, trueR + toWhat) || exactEq(user, trueR - toWhat)) {
      return {
        tag: "calculation_off_by_one",
        details: { kind, mode: "round_step", n, toWhat, user, expected },
        ruleId: "math_numeric:calculation_off_by_one:round_step",
        confidence: 0.84,
      };
    }
    return null;
  }

  // Decimal place rounding (legacy)
  const pl = places ?? 1;
  const factor = 10 ** pl;
  const roundedUp = Math.ceil(expected * factor) / factor;
  const roundedDown = Math.floor(expected * factor) / factor;
  // When expected is already the correct round, compare against ceil/floor of `n` if present
  const source = n != null ? n : expected;
  const correctRound = Math.round(source * factor) / factor;
  if (exactEq(expected, correctRound) || places != null) {
    const up = Math.ceil(source * factor) / factor;
    const down = Math.floor(source * factor) / factor;
    if (exactEq(user, up) && !exactEq(up, expected)) {
      return {
        tag: "rounding_wrong_direction",
        details: { direction: "up", expected, user },
        ruleId: "math_numeric:rounding_wrong_direction",
        confidence: 0.9,
      };
    }
    if (exactEq(user, down) && !exactEq(down, expected)) {
      return {
        tag: "rounding_wrong_direction",
        details: { direction: "down", expected, user },
        ruleId: "math_numeric:rounding_wrong_direction",
        confidence: 0.9,
      };
    }
  }
  void roundedUp;
  void roundedDown;
  return null;
}

// ─── Equations ──────────────────────────────────────────────────────────────

/**
 * Inverse-op / sign errors on eq_* blank fill.
 * @param {object} p
 */
export function proveEquationInverseError(p) {
  const kind = pickKind(p?.kind);
  if (!kind.startsWith("eq_")) return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const c = num(p?.c);
  const form = p?.form != null ? String(p.form) : null;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  // eq_add_simple: a + b = c, blank is often b or a; params a,b,c with correct = missing
  if (kind === "eq_add_simple" || kind === "eq_add") {
    if (a == null || c == null) return null;
    // Wrong: add instead of subtract to isolate → c + a
    if (exactEq(user, c + a) && !exactEq(user, expected)) {
      return {
        tag: "math_equation_inverse_error",
        details: { kind, form, mode: "add_instead_of_sub", a, c, user, expected, alias: "inverse_operation_error" },
        ruleId: "math_numeric:math_equation_inverse_error",
        confidence: 0.92,
      };
    }
    // Sign / operand swap: answer = a when should be c-a
    if (form === "a_plus_x" && a != null && c != null) {
      const trueX = c - a;
      if (exactEq(expected, trueX) && exactEq(user, a) && !exactEq(a, trueX)) {
        return {
          tag: "equation_sign_error",
          details: { kind, form, mode: "returned_known_addend", a, c },
          ruleId: "math_numeric:equation_sign_error",
          confidence: 0.9,
        };
      }
    }
    if (form === "x_plus_b" && b != null && c != null) {
      const trueX = c - b;
      if (exactEq(expected, trueX) && exactEq(user, b) && !exactEq(b, trueX)) {
        return {
          tag: "equation_sign_error",
          details: { kind, form, mode: "returned_known_addend", b, c },
          ruleId: "math_numeric:equation_sign_error",
          confidence: 0.9,
        };
      }
    }
  }

  if (kind === "eq_sub_simple" || kind === "eq_sub") {
    if (a == null || c == null) return null;
    // a - x = c → x = a - c; wrong: a + c or c - a with wrong sign
    if (form === "a_minus_x") {
      const trueX = a - c;
      if (exactEq(expected, trueX)) {
        if (exactEq(user, a + c)) {
          return {
            tag: "math_equation_inverse_error",
            details: { kind, form, mode: "add_instead_of_sub", a, c, alias: "inverse_operation_error" },
            ruleId: "math_numeric:math_equation_inverse_error",
            confidence: 0.92,
          };
        }
        if (exactEq(user, c - a) || exactEq(user, -(a - c))) {
          return {
            tag: "equation_sign_error",
            details: { kind, form, mode: "sign_flip", a, c },
            ruleId: "math_numeric:equation_sign_error",
            confidence: 0.9,
          };
        }
      }
    }
    if (form === "x_minus_b" && b != null) {
      const trueX = c + b;
      if (exactEq(expected, trueX) && exactEq(user, c - b)) {
        return {
          tag: "math_equation_inverse_error",
          details: { kind, form, mode: "sub_instead_of_add", b, c, alias: "inverse_operation_error" },
          ruleId: "math_numeric:math_equation_inverse_error",
          confidence: 0.92,
        };
      }
    }
  }

  if ((kind === "eq_mul" || kind === "eq_div") && a != null && b != null && c != null) {
    // a * x = c → x = c/a; wrong: c*a or a
    if (exactEq(user, c * a) && !exactEq(user, expected)) {
      return {
        tag: "math_equation_inverse_error",
        details: { kind, mode: "mul_instead_of_div", a, c, alias: "inverse_operation_error" },
        ruleId: "math_numeric:math_equation_inverse_error",
        confidence: 0.9,
      };
    }
  }

  return null;
}

// ─── Percentages ────────────────────────────────────────────────────────────

/**
 * @param {object} p
 */
export function provePercentageBaseError(p) {
  const kind = pickKind(p?.kind);
  if (!kind.startsWith("perc_")) return null;
  const base = num(p?.base);
  const pct = num(p?.p);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (base == null || pct == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  const part = (base * pct) / 100;
  if (kind === "perc_part_of") {
    if (!exactEq(expected, part)) return null;
    // Return whole instead of part
    if (exactEq(user, base)) {
      return {
        tag: "math_percentage_base_error",
        details: { kind, mode: "return_whole", base, p: pct, alias: "percentage_base_error" },
        ruleId: "math_numeric:math_percentage_base_error",
        confidence: 0.92,
      };
    }
    // Treat percent as absolute add/sub
    if (exactEq(user, pct) && !exactEq(pct, part)) {
      return {
        tag: "math_percentage_base_error",
        details: { kind, mode: "return_percent_literal", base, p: pct, alias: "percentage_base_error" },
        ruleId: "math_numeric:math_percentage_base_error:literal",
        confidence: 0.9,
      };
    }
    // 100-p confusion / complement
    if (exactEq(user, (base * (100 - pct)) / 100) && !exactEq(user, expected)) {
      return {
        tag: "math_percentage_base_error",
        details: { kind, mode: "complement_percent", base, p: pct, alias: "percentage_base_error" },
        ruleId: "math_numeric:math_percentage_base_error:complement",
        confidence: 0.88,
      };
    }
  }

  if (kind === "perc_discount") {
    const discount = num(p?.discount) ?? part;
    const finalPrice = num(p?.finalPrice) ?? base - discount;
    const ask = p?.ask != null ? String(p.ask) : null;
    // Asking final price but returned discount or base
    if (exactEq(expected, finalPrice) || exactEq(expected, discount)) {
      if (exactEq(user, base) && !exactEq(base, expected)) {
        return {
          tag: "math_percentage_base_error",
          details: { kind, mode: "return_whole", base, p: pct, ask, alias: "percentage_base_error" },
          ruleId: "math_numeric:math_percentage_base_error",
          confidence: 0.92,
        };
      }
      if (
        exactEq(expected, finalPrice) &&
        exactEq(user, discount) &&
        !exactEq(discount, finalPrice)
      ) {
        return {
          tag: "math_percentage_base_error",
          details: {
            kind,
            mode: "discount_instead_of_final",
            base,
            p: pct,
            alias: "percentage_base_error",
          },
          ruleId: "math_numeric:math_percentage_base_error:discount_vs_final",
          confidence: 0.9,
        };
      }
      if (
        exactEq(expected, discount) &&
        exactEq(user, finalPrice) &&
        !exactEq(finalPrice, discount)
      ) {
        return {
          tag: "math_percentage_base_error",
          details: {
            kind,
            mode: "final_instead_of_discount",
            base,
            p: pct,
            alias: "percentage_base_error",
          },
          ruleId: "math_numeric:math_percentage_base_error:final_vs_discount",
          confidence: 0.9,
        };
      }
    }
  }
  return null;
}

// ─── Word problems ──────────────────────────────────────────────────────────

/**
 * @param {object} p
 */
export function proveWrongOperationWp(p) {
  const kind = pickKind(p?.kind);
  if (!kind.startsWith("wp_")) return null;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;

  const a = num(p?.a);
  const b = num(p?.b);
  const start = num(p?.start);
  const gain = num(p?.gain);
  const loss = num(p?.loss);
  const big = num(p?.big);
  const small = num(p?.small);
  const whole = num(p?.whole);
  const partA = num(p?.partA);
  const per = num(p?.per);
  const groups = num(p?.groups);
  const total = num(p?.total) ?? num(p?.money);
  const give = num(p?.give) ?? num(p?.toy) ?? num(p?.spent);

  // Change stack: correct = start+gain-loss; wrong ops
  if (start != null && gain != null && loss != null) {
    const trueV = start + gain - loss;
    if (exactEq(expected, trueV)) {
      if (exactEq(user, start + gain + loss)) {
        return {
          tag: "wrong_operation_wp",
          details: { kind, mode: "add_loss", start, gain, loss },
          ruleId: "math_numeric:wrong_operation_wp:change_stack",
          confidence: 0.92,
        };
      }
      if (exactEq(user, start + gain) || exactEq(user, start - loss)) {
        return {
          tag: "omitted_step",
          details: { kind, mode: "omit_change", start, gain, loss, user },
          ruleId: "math_numeric:omitted_step",
          confidence: 0.9,
        };
      }
      if (exactEq(user, start - gain + loss) || exactEq(user, start - gain - loss)) {
        return {
          tag: "wrong_operation_wp",
          details: { kind, mode: "swap_gain_loss", start, gain, loss },
          ruleId: "math_numeric:wrong_operation_wp:swap",
          confidence: 0.9,
        };
      }
    }
  }

  // Binary a,b: product when sum expected (or vice versa)
  if (a != null && b != null) {
    if (exactEq(expected, a + b) && exactEq(user, a * b)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "mul_instead_of_add", a, b },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
    if (exactEq(expected, a * b) && exactEq(user, a + b)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "add_instead_of_mul", a, b },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
    if (exactEq(expected, Math.abs(a - b)) && exactEq(user, a + b)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "add_instead_of_sub", a, b },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
  }

  if (big != null && small != null) {
    const diff = num(p?.diff) ?? big - small;
    if (exactEq(expected, diff) && exactEq(user, big + small)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "add_instead_of_diff", big, small },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
  }

  if (whole != null && partA != null) {
    const rest = whole - partA;
    if (exactEq(expected, rest) && (exactEq(user, whole + partA) || exactEq(user, partA))) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "part_whole_confusion", whole, partA },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.9,
      };
    }
  }

  if (per != null && groups != null) {
    if (exactEq(expected, per * groups) && exactEq(user, per + groups)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "add_instead_of_mul", per, groups },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
  }

  if (total != null && give != null) {
    if (exactEq(expected, total - give) && exactEq(user, total + give)) {
      return {
        tag: "wrong_operation_wp",
        details: { kind, mode: "add_instead_of_sub", total, give },
        ruleId: "math_numeric:wrong_operation_wp",
        confidence: 0.92,
      };
    }
  }

  return null;
}

/**
 * Unit conversion slips using cm/meters or g/kg style params.
 * @param {object} p
 */
export function proveUnitErrorWp(p) {
  const kind = pickKind(p?.kind);
  if (!kind.startsWith("wp_unit") && !kind.includes("unit")) return null;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;

  const a = num(p?.a) ?? num(p?.cm) ?? num(p?.g) ?? num(p?.meters) ?? num(p?.kg);
  const factor = num(p?.factor) ?? num(p?.conversionFactor) ?? 100;
  if (a == null) return null;

  if (
    exactEq(user, a) ||
    exactEq(user, a * factor) ||
    exactEq(user, a / factor) ||
    (factor === 100 && exactEq(user, a * 10))
  ) {
    if (!exactEq(user, expected)) {
      return {
        tag: "unit_error",
        details: { kind, a, factor, user, expected },
        ruleId: "math_numeric:unit_error",
        confidence: 0.9,
      };
    }
  }
  return null;
}

// ─── Structural (after exact) ───────────────────────────────────────────────

/**
 * ±1..9 near-miss when expected equals a proven trueOp for core kinds.
 * @param {object} p
 */
export function proveCoreOpsStructuralNearMiss(p) {
  const kind = pickKind(p?.kind);
  if (!isCoreOpsKind(kind)) return null;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;

  /** @type {number|null} */
  let trueOp = null;
  if (kind === "dec_add") {
    const a = num(p.a);
    const b = num(p.b);
    if (a != null && b != null) trueOp = a + b;
  } else if (kind === "dec_sub") {
    const a = num(p.a);
    const b = num(p.b);
    if (a != null && b != null) trueOp = a - b;
  } else if (kind === "perc_part_of") {
    const base = num(p.base);
    const pct = num(p.p);
    if (base != null && pct != null) trueOp = (base * pct) / 100;
  } else if (kind.startsWith("eq_") && num(p.c) != null && num(p.a) != null) {
    // only when expected already matches isolation result
    trueOp = expected;
  } else if (kind === "round" && num(p.n) != null && num(p.toWhat) != null) {
    trueOp = Math.round(/** @type {number} */ (num(p.n)) / /** @type {number} */ (num(p.toWhat))) *
      /** @type {number} */ (num(p.toWhat));
  } else if (kind.startsWith("wp_change_stack")) {
    const start = num(p.start);
    const gain = num(p.gain);
    const loss = num(p.loss);
    if (start != null && gain != null && loss != null) trueOp = start + gain - loss;
  }

  if (trueOp == null || !exactEq(expected, trueOp)) return null;
  const delta = user - trueOp;
  const abs = Math.abs(delta);
  if (abs < 1 || abs > 9) return null;
  // Prefer integer near-miss only
  if (!Number.isInteger(user) || !Number.isInteger(trueOp)) {
    if (abs > 1.0001) return null;
  }
  return {
    tag: abs === 1 ? "calculation_off_by_one" : "calculation_near_miss",
    details: { kind, mode: "core_ops_near_miss", k: abs, trueOp, user, expected, tier: "structural" },
    ruleId:
      abs === 1
        ? "math_numeric:calculation_off_by_one:core_ops"
        : "math_numeric:calculation_near_miss:core_ops",
    confidence: abs === 1 ? 0.84 : 0.78,
  };
}

/**
 * @param {object} p
 */
export function classifyCoreOpsAnswer(p) {
  const kind = pickKind(p?.kind);
  if (!isCoreOpsKind(kind)) return null;

  const exactFns = [
    proveDecimalPlaceShift,
    proveDecimalAlignmentError,
    proveDecimalMulDivSlip,
    proveRoundingDirectionError,
    proveEquationInverseError,
    provePercentageBaseError,
    proveWrongOperationWp,
    proveUnitErrorWp,
  ];
  for (const fn of exactFns) {
    const hit = fn(p);
    if (hit) return hit;
  }
  return proveCoreOpsStructuralNearMiss(p);
}
