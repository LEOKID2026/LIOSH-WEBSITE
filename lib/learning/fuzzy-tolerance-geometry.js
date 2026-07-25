/**
 * Geometry diagnostics — exact TEPs for area/perimeter/volume/angles/pythagoras.
 * Kind-gated; expected must equal trueOp; far wrongs → null (0 FP).
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

/** Strip story_ prefix for matching. */
function baseKind(kind) {
  const k = pickKind(kind);
  return k.startsWith("story_") ? k.slice("story_".length) : k;
}

/**
 * @param {string} kind
 */
export function isGeometryNumericKind(kind) {
  const k = baseKind(kind);
  if (!k) return false;
  return (
    k.includes("area") ||
    k.includes("perimeter") ||
    k.includes("volume") ||
    k.includes("pythagoras") ||
    k.includes("triangle_angles") ||
    k.includes("heights_") ||
    k === "tri_area" ||
    k === "rect_area" ||
    k === "rect_perimeter"
  );
}

function hit(tag, details, ruleId, confidence = 0.92) {
  return { tag, details, ruleId, confidence };
}

// ─── Area / perimeter ───────────────────────────────────────────────────────

/**
 * Triangle area: forgot ÷2 → base×height.
 * @param {object} p
 */
export function proveForgotDivideBy2OnTriangleArea(p) {
  const k = baseKind(p?.kind);
  if (k !== "triangle_area" && k !== "tri_area") return null;
  const base = num(p?.base) ?? num(p?.a);
  const height = num(p?.height) ?? num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (base == null || height == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;
  const product = base * height;
  const trueArea = product / 2;
  if (!exactEq(expected, trueArea)) return null;
  if (!exactEq(user, product)) return null;
  return hit(
    "forgot_divide_by_2",
    { kind: k, base, height, mode: "triangle_no_half", selectedAnswer: user, correctAnswer: expected },
    "geometry_numeric:forgot_divide_by_2:triangle",
  );
}

/**
 * Trapezoid: forgot ÷2 → (b1+b2)*h.
 * @param {object} p
 */
export function proveForgotDivideBy2OnTrapezoidArea(p) {
  const k = baseKind(p?.kind);
  if (k !== "trapezoid_area") return null;
  const b1 = num(p?.base1);
  const b2 = num(p?.base2);
  const h = num(p?.height);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (b1 == null || b2 == null || h == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;
  const sumH = (b1 + b2) * h;
  const trueArea = sumH / 2;
  if (!exactEq(expected, trueArea)) return null;
  if (!exactEq(user, sumH)) return null;
  return hit(
    "forgot_divide_by_2",
    { kind: k, base1: b1, base2: b2, height: h, mode: "trapezoid_no_half" },
    "geometry_numeric:forgot_divide_by_2:trapezoid",
  );
}

/**
 * Parallelogram: used triangle formula (÷2).
 * @param {object} p
 */
export function proveParallelogramAreaHalfError(p) {
  const k = baseKind(p?.kind);
  if (k !== "parallelogram_area") return null;
  const base = num(p?.base);
  const height = num(p?.height);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (base == null || height == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;
  const trueArea = base * height;
  if (!exactEq(expected, trueArea)) return null;
  if (exactEq(user, trueArea / 2)) {
    return hit(
      "parallelogram_area_error",
      { kind: k, base, height, mode: "used_triangle_half", alias: "area_formula_error" },
      "geometry_numeric:parallelogram_area_error:half",
    );
  }
  // Used side sum / perimeter-ish
  if (exactEq(user, base + height) && !exactEq(base + height, trueArea)) {
    return hit(
      "area_formula_error",
      { kind: k, base, height, mode: "add_dims" },
      "geometry_numeric:area_formula_error:add_dims",
    );
  }
  return null;
}

/**
 * Heights probe: solved for height but returned area/base confusion.
 * height = 2*area/base (triangle) or area/base (parallelogram).
 * @param {object} p
 */
export function proveHeightBaseConfusion(p) {
  const k = baseKind(p?.kind);
  if (!k.startsWith("heights_")) return null;
  const base = num(p?.base) ?? num(p?.base1);
  const area = num(p?.area);
  const height = num(p?.height);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;
  if (height != null && exactEq(expected, height)) {
    // Returned base or area instead of height
    if (base != null && exactEq(user, base)) {
      return hit(
        "height_base_confusion",
        { kind: k, mode: "returned_base", base, height },
        "geometry_numeric:height_base_confusion",
      );
    }
    if (area != null && exactEq(user, area)) {
      return hit(
        "height_base_confusion",
        { kind: k, mode: "returned_area", area, height },
        "geometry_numeric:height_base_confusion:area",
      );
    }
  }
  return null;
}

/**
 * Rectangle / square perimeter ↔ area swap.
 * @param {object} p
 */
export function provePerimeterAreaConfusion(p) {
  const k = baseKind(p?.kind);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;

  // Legacy synthetic
  if (k === "rect_area" || k === "rectangle_area") {
    const L = num(p?.length) ?? num(p?.a);
    const W = num(p?.width) ?? num(p?.b);
    if (L == null || W == null) return null;
    const area = L * W;
    const perim = 2 * (L + W);
    if (exactEq(expected, area) && exactEq(user, perim) && !exactEq(area, perim)) {
      return hit(
        "perimeter_area_confusion",
        { kind: k, length: L, width: W, mode: "perim_for_area" },
        "geometry_numeric:perimeter_area_confusion:rect_area",
      );
    }
  }
  if (k === "rect_perimeter" || k === "rectangle_perimeter") {
    const L = num(p?.length) ?? num(p?.a);
    const W = num(p?.width) ?? num(p?.b);
    if (L == null || W == null) return null;
    const area = L * W;
    const perim = 2 * (L + W);
    if (exactEq(expected, perim) && exactEq(user, area) && !exactEq(area, perim)) {
      return hit(
        "perimeter_area_confusion",
        { kind: k, length: L, width: W, mode: "area_for_perim" },
        "geometry_numeric:perimeter_area_confusion:rect_perim",
      );
    }
  }
  if (k === "square_area") {
    const side = num(p?.side) ?? num(p?.a);
    if (side == null) return null;
    const area = side * side;
    const perim = 4 * side;
    if (exactEq(expected, area) && exactEq(user, perim) && !exactEq(area, perim)) {
      return hit(
        "perimeter_area_confusion",
        { kind: k, side, mode: "perim_for_area" },
        "geometry_numeric:perimeter_area_confusion:square_area",
      );
    }
  }
  if (k === "square_perimeter") {
    const side = num(p?.side) ?? num(p?.a);
    if (side == null) return null;
    const area = side * side;
    const perim = 4 * side;
    if (exactEq(expected, perim) && exactEq(user, area) && !exactEq(area, perim)) {
      return hit(
        "perimeter_area_confusion",
        { kind: k, side, mode: "area_for_perim" },
        "geometry_numeric:perimeter_area_confusion:square_perim",
      );
    }
  }

  // Triangle area asked but returned base+height (formula selection)
  if (k === "triangle_area" || k === "tri_area") {
    const base = num(p?.base) ?? num(p?.a);
    const height = num(p?.height) ?? num(p?.b);
    if (base == null || height == null) return null;
    const trueArea = (base * height) / 2;
    if (exactEq(expected, trueArea) && exactEq(user, base + height)) {
      return hit(
        "formula_selection_error",
        { kind: k, base, height, mode: "add_dims" },
        "geometry_numeric:formula_selection_error:tri_add",
      );
    }
  }
  return null;
}

/**
 * Incomplete perimeter: L+W instead of 2(L+W), or 2L+W.
 * @param {object} p
 */
export function provePerimeterFormulaError(p) {
  const k = baseKind(p?.kind);
  if (k !== "rectangle_perimeter" && k !== "rect_perimeter") return null;
  const L = num(p?.length) ?? num(p?.a);
  const W = num(p?.width) ?? num(p?.b);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (L == null || W == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;
  const perim = 2 * (L + W);
  if (!exactEq(expected, perim)) return null;
  if (exactEq(user, L + W) || exactEq(user, 2 * L + W) || exactEq(user, L + 2 * W)) {
    return hit(
      "perimeter_formula_error",
      { kind: k, length: L, width: W, mode: exactEq(user, L + W) ? "half_perim" : "missing_side" },
      "geometry_numeric:perimeter_formula_error",
    );
  }
  return null;
}

// ─── Volume ─────────────────────────────────────────────────────────────────

/**
 * @param {object} p
 */
export function proveVolumeDimensionSlip(p) {
  const k = baseKind(p?.kind);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;

  if (k === "rectangular_prism_volume" || k === "box_volume") {
    const L = num(p?.length);
    const W = num(p?.width);
    const H = num(p?.height);
    if (L == null || W == null || H == null) return null;
    const vol = L * W * H;
    if (!exactEq(expected, vol)) return null;
    // Forgot depth (one face area)
    if (exactEq(user, L * W) || exactEq(user, L * H) || exactEq(user, W * H)) {
      return hit(
        "volume_formula_error",
        {
          kind: k,
          length: L,
          width: W,
          height: H,
          mode: "forgot_depth",
          alias: "volume_perimeter_confusion",
        },
        "geometry_numeric:volume_formula_error:forgot_depth",
      );
    }
    if (exactEq(user, L + W + H)) {
      return hit(
        "volume_formula_error",
        { kind: k, mode: "sum_dims", length: L, width: W, height: H },
        "geometry_numeric:volume_formula_error:sum",
      );
    }
  }

  if (k === "cube_volume") {
    const side = num(p?.side);
    if (side == null) return null;
    const vol = side * side * side;
    if (!exactEq(expected, vol)) return null;
    if (exactEq(user, side * side)) {
      return hit(
        "volume_formula_error",
        { kind: k, side, mode: "area_instead_of_volume" },
        "geometry_numeric:volume_formula_error:cube_face",
      );
    }
    if (exactEq(user, 6 * side * side)) {
      return hit(
        "volume_formula_error",
        { kind: k, side, mode: "surface_instead_of_volume" },
        "geometry_numeric:volume_formula_error:cube_surface",
      );
    }
  }
  return null;
}

// ─── Angles ─────────────────────────────────────────────────────────────────

/**
 * Triangle angle sum: third = 180 − a − b; common slips.
 * @param {object} p
 */
export function proveTriangleAngleSumError(p) {
  const k = baseKind(p?.kind);
  if (k !== "triangle_angles") return null;
  const a1 = num(p?.angle1);
  const a2 = num(p?.angle2);
  const a3 = num(p?.angle3);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a1 == null || a2 == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;
  const trueThird = a3 != null ? a3 : 180 - a1 - a2;
  if (!exactEq(expected, trueThird)) return null;

  if (exactEq(user, a1) || exactEq(user, a2)) {
    return hit(
      "triangle_angle_sum_error",
      { kind: k, mode: "returned_known_angle", angle1: a1, angle2: a2, alias: "angle_range_error" },
      "geometry_numeric:triangle_angle_sum_error:known",
    );
  }
  if (exactEq(user, a1 + a2)) {
    return hit(
      "triangle_angle_sum_error",
      { kind: k, mode: "sum_instead_of_complement", angle1: a1, angle2: a2 },
      "geometry_numeric:triangle_angle_sum_error:sum",
    );
  }
  if (exactEq(user, 180 - a1) || exactEq(user, 180 - a2)) {
    return hit(
      "triangle_angle_sum_error",
      { kind: k, mode: "used_one_angle_only", angle1: a1, angle2: a2 },
      "geometry_numeric:triangle_angle_sum_error:one",
    );
  }
  // 360° confusion (quadrilateral sum)
  if (exactEq(user, 360 - a1 - a2)) {
    return hit(
      "triangle_angle_sum_error",
      { kind: k, mode: "used_360", angle1: a1, angle2: a2 },
      "geometry_numeric:triangle_angle_sum_error:360",
    );
  }
  return null;
}

// ─── Pythagoras ─────────────────────────────────────────────────────────────

/**
 * @param {object} p
 */
export function provePythagoreanRelationError(p) {
  const k = baseKind(p?.kind);
  if (k !== "pythagoras_hyp" && k !== "pythagoras_leg") return null;
  const a = num(p?.a);
  const b = num(p?.b);
  const c = num(p?.c);
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (a == null || b == null || user == null || expected == null) return null;
  if (exactEq(user, expected)) return null;

  if (k === "pythagoras_hyp") {
    const hyp = c != null ? c : Math.sqrt(a * a + b * b);
    if (!exactEq(expected, hyp)) return null;
    if (exactEq(user, a + b)) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "add_legs", a, b, c: hyp },
        "geometry_numeric:pythagorean_relation_error:add",
      );
    }
    if (exactEq(user, Math.abs(a - b))) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "sub_legs", a, b, c: hyp },
        "geometry_numeric:pythagorean_relation_error:sub",
      );
    }
    if (exactEq(user, a * a) || exactEq(user, b * b)) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "returned_square", a, b },
        "geometry_numeric:pythagorean_relation_error:square",
      );
    }
    // Forgot sqrt: returned a²+b²
    if (exactEq(user, a * a + b * b) && !exactEq(a * a + b * b, hyp)) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "forgot_sqrt", a, b },
        "geometry_numeric:pythagorean_relation_error:no_sqrt",
      );
    }
  }

  if (k === "pythagoras_leg" && c != null) {
    // which leg unknown — expected is the missing leg
    const legA = Math.sqrt(Math.max(0, c * c - b * b));
    const legB = Math.sqrt(Math.max(0, c * c - a * a));
    const trueLeg = exactEq(expected, legA) ? legA : exactEq(expected, legB) ? legB : null;
    if (trueLeg == null) return null;
    if (exactEq(user, c - a) || exactEq(user, c - b)) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "sub_instead_of_sqrt", a, b, c },
        "geometry_numeric:pythagorean_relation_error:leg_sub",
      );
    }
    if (exactEq(user, a + b) || exactEq(user, c)) {
      return hit(
        "pythagorean_relation_error",
        { kind: k, mode: "wrong_relation", a, b, c },
        "geometry_numeric:pythagorean_relation_error:leg_wrong",
      );
    }
  }
  return null;
}

// ─── Structural ─────────────────────────────────────────────────────────────

/**
 * ±1 near-miss when expected equals proven trueOp (integer geometry only).
 * @param {object} p
 */
export function proveGeometryStructuralNearMiss(p) {
  const k = baseKind(p?.kind);
  if (!isGeometryNumericKind(k)) return null;
  const user = num(p?.userAnswer);
  const expected = num(p?.expectedAnswer);
  if (user == null || expected == null || exactEq(user, expected)) return null;
  if (!Number.isInteger(user) || !Number.isInteger(expected)) return null;

  /** @type {number|null} */
  let trueOp = null;
  if (k === "triangle_area" || k === "tri_area") {
    const base = num(p.base) ?? num(p.a);
    const height = num(p.height) ?? num(p.b);
    if (base != null && height != null) trueOp = (base * height) / 2;
  } else if (k === "rectangle_area" || k === "rect_area") {
    const L = num(p.length) ?? num(p.a);
    const W = num(p.width) ?? num(p.b);
    if (L != null && W != null) trueOp = L * W;
  } else if (k === "rectangle_perimeter" || k === "rect_perimeter") {
    const L = num(p.length) ?? num(p.a);
    const W = num(p.width) ?? num(p.b);
    if (L != null && W != null) trueOp = 2 * (L + W);
  } else if (k === "parallelogram_area") {
    const base = num(p.base);
    const height = num(p.height);
    if (base != null && height != null) trueOp = base * height;
  } else if (k === "rectangular_prism_volume" || k === "box_volume") {
    const L = num(p.length);
    const W = num(p.width);
    const H = num(p.height);
    if (L != null && W != null && H != null) trueOp = L * W * H;
  } else if (k === "cube_volume") {
    const side = num(p.side);
    if (side != null) trueOp = side * side * side;
  } else if (k === "triangle_angles") {
    const a1 = num(p.angle1);
    const a2 = num(p.angle2);
    if (a1 != null && a2 != null) trueOp = 180 - a1 - a2;
  } else if (k === "pythagoras_hyp") {
    const a = num(p.a);
    const b = num(p.b);
    const c = num(p.c);
    if (c != null) trueOp = c;
    else if (a != null && b != null) trueOp = Math.sqrt(a * a + b * b);
  }

  if (trueOp == null || !exactEq(expected, trueOp)) return null;
  if (!Number.isInteger(trueOp)) return null;
  const abs = Math.abs(user - trueOp);
  if (abs < 1 || abs > 9) return null;
  return hit(
    abs === 1 ? "calculation_off_by_one" : "calculation_near_miss",
    { kind: k, mode: "geometry_near_miss", k: abs, trueOp, tier: "structural" },
    abs === 1
      ? "geometry_numeric:calculation_off_by_one"
      : "geometry_numeric:calculation_near_miss",
    abs === 1 ? 0.84 : 0.78,
  );
}

/**
 * @param {object} p
 */
export function classifyGeometryAnswer(p) {
  const kind = pickKind(p?.kind);
  if (!isGeometryNumericKind(kind) && !baseKind(kind).startsWith("heights_")) {
    // heights_ covered by isGeometryNumericKind via includes — already true
    if (!baseKind(kind).startsWith("heights_")) return null;
  }

  const exactFns = [
    proveForgotDivideBy2OnTriangleArea,
    proveForgotDivideBy2OnTrapezoidArea,
    proveParallelogramAreaHalfError,
    proveHeightBaseConfusion,
    provePerimeterAreaConfusion,
    provePerimeterFormulaError,
    proveVolumeDimensionSlip,
    proveTriangleAngleSumError,
    provePythagoreanRelationError,
  ];
  for (const fn of exactFns) {
    const r = fn(p);
    if (r) return r;
  }
  return proveGeometryStructuralNearMiss(p);
}
