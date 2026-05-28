/**
 * Geometry-only: diagram metadata + per-step emphasis for the explanation modal.
 * No Math/Science imports.
 */

import {
  resolveQuadrilateralTemplate,
  resolveTriangleClassTemplate,
} from "./geometry-diagram-layout.js";

/**
 * @param {object} question
 * @param {{ hideUnknownValues?: boolean }} [options]
 */
export function getGeometryDiagramSpec(question, options = {}) {
  if (!question?.params || !question.topic) return null;
  const hideUnknownValues = options.hideUnknownValues === true;
  const { topic, shape, params: p } = question;

  if (topic === "area") {
    switch (shape) {
      case "square":
        if (typeof p.side !== "number") return null;
        return { kind: "square", mode: "area", side: p.side };
      case "rectangle":
        if (typeof p.length !== "number" || typeof p.width !== "number") return null;
        return { kind: "rectangle", mode: "area", length: p.length, width: p.width };
      case "triangle":
        if (typeof p.base !== "number" || typeof p.height !== "number") return null;
        return { kind: "triangle", mode: "area", base: p.base, height: p.height };
      case "parallelogram":
        if (typeof p.base !== "number" || typeof p.height !== "number") return null;
        return { kind: "parallelogram", mode: "area", base: p.base, height: p.height };
      case "trapezoid":
        if (
          typeof p.base1 !== "number" ||
          typeof p.base2 !== "number" ||
          typeof p.height !== "number"
        )
          return null;
        return {
          kind: "trapezoid",
          mode: "area",
          base1: p.base1,
          base2: p.base2,
          height: p.height,
        };
      case "circle":
        if (typeof p.radius !== "number") return null;
        return { kind: "circle", mode: "area", radius: p.radius };
      default:
        return null;
    }
  }

  if (topic === "perimeter") {
    switch (shape) {
      case "square":
        if (typeof p.side !== "number") return null;
        return { kind: "square", mode: "perimeter", side: p.side };
      case "rectangle":
        if (typeof p.length !== "number" || typeof p.width !== "number") return null;
        return { kind: "rectangle", mode: "perimeter", length: p.length, width: p.width };
      case "triangle":
        if (
          typeof p.side1 !== "number" ||
          typeof p.side2 !== "number" ||
          typeof p.side3 !== "number"
        )
          return null;
        return {
          kind: "triangle_perimeter",
          mode: "perimeter",
          side1: p.side1,
          side2: p.side2,
          side3: p.side3,
        };
      case "circle":
        if (typeof p.radius !== "number") return null;
        return { kind: "circle", mode: "perimeter", radius: p.radius };
      default:
        return null;
    }
  }

  if (topic === "volume" && shape === "cube") {
    if (typeof p.side !== "number") return null;
    return { kind: "square", mode: "volume", side: p.side };
  }

  if (topic === "angles" && p.kind === "triangle_angles") {
    if (typeof p.angle1 !== "number" || typeof p.angle2 !== "number") return null;
    const a3 =
      typeof p.angle3 === "number" ? p.angle3 : 180 - p.angle1 - p.angle2;
    return {
      kind: "triangle_angles",
      angle1: p.angle1,
      angle2: p.angle2,
      angle3: a3,
      hideAngle3: hideUnknownValues,
    };
  }

  if (
    topic === "pythagoras" &&
    (p.kind === "pythagoras_hyp" || p.kind === "pythagoras_leg") &&
    typeof p.a === "number" &&
    typeof p.b === "number" &&
    typeof p.c === "number"
  ) {
    /** @type {"a"|"b"|"c"|null} */
    let hideSide = null;
    if (hideUnknownValues) {
      if (p.kind === "pythagoras_hyp") hideSide = "c";
      else if (p.which === "leg_a") hideSide = "a";
      else if (p.which === "leg_b") hideSide = "b";
    }
    return {
      kind: "pythagoras",
      mode: p.kind === "pythagoras_hyp" ? "hyp" : "leg",
      which:
        p.kind === "pythagoras_leg" && (p.which === "leg_a" || p.which === "leg_b")
          ? p.which
          : null,
      a: p.a,
      b: p.b,
      c: p.c,
      hideSide,
    };
  }

  if (topic === "circles") {
    const kind = p?.kind || "";
    if ((kind === "circle_area" || kind === "story_circle_area") && typeof p.radius === "number") {
      return { kind: "circle", mode: "area", radius: p.radius };
    }
    if (
      (kind === "circle_perimeter" || kind === "story_circle_perimeter") &&
      typeof p.radius === "number"
    ) {
      return { kind: "circle", mode: "perimeter", radius: p.radius };
    }
    return null;
  }

  if (topic === "shapes_basic") {
    const kind = p?.kind || "";
    if (kind === "shapes_basic_square" || kind === "shapes_basic_properties_square") {
      return { kind: "square", mode: "identify" };
    }
    if (kind === "shapes_basic_rectangle" || kind === "shapes_basic_properties_rectangle") {
      return { kind: "rectangle", mode: "identify" };
    }
    if (kind === "shapes_basic_properties_angles") {
      const template = p.shape === "מלבן" ? "rectangle" : "square";
      return { kind: "shape_template", template, mode: "identify" };
    }
    return null;
  }

  if (topic === "quadrilaterals" && p.kind === "quadrilaterals") {
    return {
      kind: "shape_template",
      template: resolveQuadrilateralTemplate(p.type),
      mode: "identify",
    };
  }

  if (topic === "triangles" && p.kind === "triangles") {
    return {
      kind: "shape_template",
      template: resolveTriangleClassTemplate(p.type),
      mode: "identify",
    };
  }

  return null;
}

/**
 * Emphasis drives stroke/fill highlight on the diagram for the current step index.
 * Aligns with typical 4-step flow: נוסחה → הצבה → חישוב → תוצאה.
 */
export function getDiagramEmphasisForStep(question, stepIndex, totalSteps) {
  const spec = getGeometryDiagramSpec(question);
  if (!spec || typeof stepIndex !== "number" || stepIndex < 0) return "neutral";

  const i = stepIndex;
  const last = totalSteps > 0 ? totalSteps - 1 : 3;

  switch (spec.kind) {
    case "square":
      if (spec.mode === "volume") {
        if (i <= 1) return "formula";
        if (i === 2 || i === 3) return "side";
        if (i >= last) return "result";
        return "neutral";
      }
      if (i === 0) return "formula";
      if (i === 1 || i === 2) return "side";
      if (i >= last) return "result";
      return "neutral";
    case "rectangle":
      if (i <= 1) return "formula";
      if (i === 2) return "length_width";
      if (i >= last) return "result";
      return "neutral";
    case "triangle":
      if (i <= 1) return "formula";
      if (i === 2 || i === 3) return "base_height";
      if (i >= last) return "result";
      return "neutral";
    case "parallelogram":
      if (i <= 1) return "formula";
      if (i === 2 || i === 3) return "base_height";
      if (i >= last) return "result";
      return "neutral";
    case "trapezoid":
      if (i <= 1) return "formula";
      if (i === 2 || i === 3) return "bases_height";
      if (i >= last) return "result";
      return "neutral";
    case "circle":
      if (spec.mode === "perimeter") {
        if (i === 0) return "formula";
        if (i === 1 || i === 2) return "radius";
        if (i >= last) return "rim";
        return "neutral";
      }
      if (i <= 1) return "formula";
      if (i === 2 || i === 3) return "radius";
      if (i >= last) return "result";
      return "neutral";
    case "triangle_perimeter":
      if (i === 0) return "formula";
      if (i === 1 || i === 2) return "all_sides";
      if (i >= last) return "result";
      return "neutral";
    case "triangle_angles":
      if (i === 0) return "angles_sum";
      if (i === 1) return "given_two";
      if (i === 2) return "angles_compute";
      if (i >= last) return "third_angle";
      return "neutral";
    case "pythagoras":
      if (spec.mode === "hyp") {
        if (i === 0) return "formula";
        if (i === 1) return "legs";
        if (i === 2) return "squares_legs";
        if (i === 3) return "sum";
        if (i >= last) return "hyp";
        return "neutral";
      }
      if (i === 0) return "formula";
      if (i === 1) return "rearrange";
      if (i === 2) return "squares_legs";
      if (i === 3) return "diff";
      if (i >= last) return "missing_leg";
      return "neutral";
    default:
      return "neutral";
  }
}

/**
 * Text values that would appear on an assessment diagram (before submit).
 * Used by tests to ensure the correct answer is not leaked in the drawing.
 * @param {ReturnType<typeof getGeometryDiagramSpec>} spec
 */
export function getAssessmentDiagramVisibleValues(spec) {
  if (!spec?.kind) return [];

  if (spec.kind === "triangle_angles") {
    const labels = [`${spec.angle1}°`, `${spec.angle2}°`];
    labels.push(spec.hideAngle3 ? "?" : `${spec.angle3}°`);
    if (!spec.hideAngle3) {
      labels.push("סכום זוויות במשולש = 180°");
    }
    return labels;
  }

  if (spec.kind === "pythagoras") {
    const sideVal = (key) => {
      const raw = spec[key];
      if (spec.hideSide === key) return "?";
      return raw != null ? String(raw) : "";
    };
    return [`a = ${sideVal("a")}`, `b = ${sideVal("b")}`, `c = ${sideVal("c")}`].filter(Boolean);
  }

  return [];
}

/**
 * Numeric/string values that must not appear literally on assessment diagrams.
 * @param {ReturnType<typeof getGeometryDiagramSpec>} spec
 */
export function getAssessmentDiagramHiddenAnswerValues(spec) {
  if (!spec?.kind) return [];

  if (spec.kind === "triangle_angles" && spec.hideAngle3) {
    return [String(spec.angle3), `${spec.angle3}°`];
  }

  if (spec.kind === "pythagoras" && spec.hideSide) {
    const val = spec[spec.hideSide];
    return val != null ? [String(val)] : [];
  }

  return [];
}
