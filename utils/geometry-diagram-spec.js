/**
 * Geometry-only: diagram metadata + per-step emphasis for the explanation modal.
 * No Math/Science imports.
 */

import {
  resolveQuadrilateralTemplate,
  resolveTriangleClassTemplate,
} from "./geometry-diagram-layout.js";
import { getDiagramEmphasisFromMetadata } from "./geometry-animations.js";

/**
 * @param {object} question
 * @param {{ hideUnknownValues?: boolean }} [options]
 */
export function getGeometryDiagramSpec(question, options = {}) {
  if (!question?.params || !question.topic) return null;
  const hideUnknownValues = options.hideUnknownValues === true;
  const { topic, shape, params: p } = question;
  const stem = String(question.question || question.exerciseText || "").trim();
  const asksForAreaGrid =
    topic === "area" &&
    /(משבצות|רשת|לוח ריבועים|ריבועים קטנים|תאים)/u.test(stem);

  if (topic === "area") {
    const areaShape =
      shape ||
      (String(p.kind || "").includes("square")
        ? "square"
        : String(p.kind || "").includes("rectangle")
          ? "rectangle"
          : String(p.kind || "").includes("triangle")
            ? "triangle"
            : String(p.kind || "").includes("parallelogram")
              ? "parallelogram"
              : String(p.kind || "").includes("trapezoid")
                ? "trapezoid"
                : String(p.kind || "").includes("circle")
                  ? "circle"
                  : null);
    switch (areaShape) {
      case "square":
        if (typeof p.side !== "number") return null;
        return asksForAreaGrid
          ? {
              kind: "square",
              mode: "area",
              side: p.side,
              grid: true,
              gridCols: p.side,
              gridRows: p.side,
            }
          : { kind: "square", mode: "area", side: p.side };
      case "rectangle":
        if (typeof p.length !== "number" || typeof p.width !== "number") return null;
        return asksForAreaGrid
          ? {
              kind: "rectangle",
              mode: "area",
              length: p.length,
              width: p.width,
              grid: true,
              gridCols: p.length,
              gridRows: p.width,
            }
          : { kind: "rectangle", mode: "area", length: p.length, width: p.width };
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
    const periShape =
      shape ||
      (String(p.kind || "").includes("square")
        ? "square"
        : String(p.kind || "").includes("rectangle")
          ? "rectangle"
          : String(p.kind || "").includes("triangle")
            ? "triangle"
            : String(p.kind || "").includes("circle")
              ? "circle"
              : null);
    switch (periShape) {
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

  if (topic === "volume") {
    // Cube and rectangular prism both use isometric solid_box — never a 2D square.
    if (shape === "rectangular_prism" || shape === "cube" || p.kind === "cube_volume") {
      const l = p.length ?? p.side;
      const w = p.width ?? p.side;
      const h = p.height ?? p.side;
      if (typeof l !== "number" || typeof w !== "number" || typeof h !== "number") return null;
      return { kind: "solid_box", mode: "volume", length: l, width: w, height: h };
    }
    if (shape === "cylinder" && typeof p.radius === "number" && typeof p.height === "number") {
      return { kind: "solid_cylinder", mode: "volume", radius: p.radius, height: p.height };
    }
    if (shape === "sphere" && typeof p.radius === "number") {
      return { kind: "solid_sphere", mode: "volume", radius: p.radius };
    }
    if (shape === "pyramid") {
      const side = typeof p.side === "number" ? p.side : p.baseSide;
      const height = p.height;
      if (typeof side !== "number" || typeof height !== "number") return null;
      /** @type {Record<string, unknown>} */
      const out = { kind: "solid_pyramid", mode: "volume", side, height, solidShape: "pyramid" };
      if (typeof p.baseWidth === "number") out.width = p.baseWidth;
      if (typeof p.baseSide === "number") out.baseSide = p.baseSide;
      return out;
    }
    if (shape === "cone" && typeof p.radius === "number" && typeof p.height === "number") {
      return { kind: "solid_cone", mode: "volume", radius: p.radius, height: p.height };
    }
    if (shape === "prism") {
      const height = p.height;
      if (typeof height !== "number") return null;
      if (p.kind === "prism_volume_triangle" || (typeof p.base === "number" && typeof p.baseHeight === "number")) {
        if (typeof p.base !== "number" || typeof p.baseHeight !== "number") return null;
        return {
          kind: "solid_prism",
          mode: "volume",
          solidShape: "prism",
          base: p.base,
          baseHeight: p.baseHeight,
          height,
        };
      }
      const baseLength = p.baseLength ?? p.length;
      const baseWidth = p.baseWidth ?? p.width;
      if (typeof baseLength !== "number" || typeof baseWidth !== "number") return null;
      return {
        kind: "solid_prism",
        mode: "volume",
        solidShape: "prism",
        baseLength,
        baseWidth,
        base: baseLength,
        height,
      };
    }
  }

  if (topic === "transformations" || p.kind === "concept_transform") {
    const type = String(p.type || "הזזה");
    if (type === "שיקוף") {
      return { kind: "transformation_reflect", mode: "reflect", template: "square" };
    }
    if (type === "סיבוב") {
      return { kind: "rotation_step", angle: 90, template: "square" };
    }
    if (type === "ללא תנועה") {
      return {
        kind: "transformation_translate",
        mode: "translate",
        template: "square",
        dx: 0,
        dy: 0,
      };
    }
    return { kind: "transformation_translate", mode: "translate", template: "square" };
  }

  if (topic === "rotation" || p.kind === "concept_rotation") {
    const angle = typeof p.angle === "number" ? p.angle : 90;
    return { kind: "rotation_step", angle, template: "square" };
  }

  if (topic === "solids" || p.kind === "solids_identify" || p.kind === "solids_faces" || p.kind === "solids_vertices" || p.kind === "solids_edges") {
    // Hebrew name → English solidShape fallback for older questions without solidShape in params
    const hebrewToSolidKey = {
      "קובייה": "cube",
      "תיבה": "rectangular_prism",
      "גליל": "cylinder",
      "פירמידה": "pyramid",
      "חרוט": "cone",
      "כדור": "sphere",
    };
    const solidShape = p.solidShape || (p.solid && hebrewToSolidKey[p.solid]) || shape || null;
    if (!solidShape) return null;
    return { kind: "solid_identify", solidShape, mode: "identify" };
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
      /** @type {Record<string, unknown>} */
      const out = { kind: "square", mode: "identify" };
      if (typeof p.side === "number") out.side = p.side;
      return out;
    }
    if (kind === "shapes_basic_rectangle" || kind === "shapes_basic_properties_rectangle") {
      /** @type {Record<string, unknown>} */
      const out = { kind: "rectangle", mode: "identify" };
      if (typeof p.length === "number") out.length = p.length;
      if (typeof p.width === "number") out.width = p.width;
      return out;
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

  if (
    topic === "parallel_perpendicular" ||
    p.kind === "parallel_perpendicular" ||
    p.kind === "concept_lines"
  ) {
    const isParallel =
      p.isParallel === true ||
      p.isParallel === "true" ||
      String(p.type || "") === "מקבילות" ||
      String(p.conceptTag || "").includes("parallel") ||
      (String(p.subtype || "").includes("parallel") && !String(p.subtype || "").includes("perp"));
    const isPerp =
      String(p.type || "") === "מאונכות" ||
      String(p.conceptTag || "").includes("perp");
    return {
      kind: "parallel_lines",
      mode: isPerp && !isParallel ? "perpendicular" : "parallel",
    };
  }

  if (topic === "symmetry" || p.kind === "symmetry" || p.kind === "concept_symmetry") {
    const shapeHe = String(p.shape || shape || "");
    let template = "square";
    // Stem nouns win over mismatched params.shape.
    if (/משולש/.test(stem)) {
      template = "equilateral_triangle";
    } else if (/מלבן/.test(stem)) {
      template = "rectangle";
    } else if (/ריבוע/.test(stem)) {
      template = "square";
    } else if (shapeHe.includes("מלבן") || shapeHe === "rectangle") {
      template = "rectangle";
    } else if (shapeHe.includes("משולש") || /triangle/i.test(shapeHe)) {
      template = "equilateral_triangle";
    } else if (shapeHe.includes("ריבוע") || shapeHe === "square") {
      template = "square";
    }
    /** @type {Record<string, unknown>} */
    const out = { kind: "symmetry", template };
    if (typeof p.axes === "number") out.axes = p.axes;
    return out;
  }

  if (topic === "diagonal" || String(p.kind || "").startsWith("diagonal_")) {
    const shapeHe = String(p.shape || shape || "");
    let diagShape = "square";
    if (
      p.kind === "diagonal_rectangle" ||
      shapeHe === "מלבן" ||
      shapeHe === "rectangle"
    ) {
      diagShape = "rectangle";
    } else if (
      p.kind === "diagonal_parallelogram" ||
      shapeHe === "מקבילית" ||
      shapeHe === "parallelogram"
    ) {
      diagShape = "parallelogram";
    } else if (p.kind === "diagonal_square" || shapeHe === "ריבוע" || shapeHe === "square") {
      diagShape = "square";
    }
    /** @type {Record<string, unknown>} */
    const out = {
      kind: "diagonal",
      shape: diagShape,
      hideDiagonal: hideUnknownValues,
    };
    if (typeof p.side === "number") out.side = p.side;
    if (typeof p.width === "number") out.width = p.width;
    if (typeof p.diagonal === "number") out.diagonal = p.diagonal;
    return out;
  }

  if (topic === "heights" || String(p.kind || "").startsWith("heights_")) {
    const hideHeight = hideUnknownValues;
    const kindKey = String(p.kind || "");
    // Trust kind over mismatched params.shape (generator sometimes reuses wrong shape tags).
    if (kindKey === "heights_triangle" || (!kindKey.startsWith("heights_") && p.shape === "triangle")) {
      if (typeof p.base !== "number" || typeof p.height !== "number") return null;
      return {
        kind: "triangle",
        mode: "height",
        base: p.base,
        height: p.height,
        hideHeight,
        shape: "triangle",
      };
    }
    if (
      kindKey === "heights_parallelogram" ||
      (!kindKey.startsWith("heights_") && p.shape === "parallelogram")
    ) {
      if (typeof p.base !== "number" || typeof p.height !== "number") return null;
      return {
        kind: "parallelogram",
        mode: "height",
        base: p.base,
        height: p.height,
        hideHeight,
        shape: "parallelogram",
      };
    }
    if (
      kindKey === "heights_trapezoid" ||
      (!kindKey.startsWith("heights_") && p.shape === "trapezoid")
    ) {
      if (
        typeof p.base1 !== "number" ||
        typeof p.base2 !== "number" ||
        typeof p.height !== "number"
      ) {
        return null;
      }
      return {
        kind: "trapezoid",
        mode: "height",
        base1: p.base1,
        base2: p.base2,
        height: p.height,
        hideHeight,
        shape: "trapezoid",
      };
    }
    return null;
  }

  if (p.kind === "tiling_count") {
    if (
      typeof p.floorL !== "number" ||
      typeof p.floorW !== "number" ||
      typeof p.tileSide !== "number"
    ) {
      return null;
    }
    return {
      kind: "tiling",
      mode: "count",
      tile: "square",
      floorL: p.floorL,
      floorW: p.floorW,
      tileSide: p.tileSide,
      count: typeof p.count === "number" ? p.count : undefined,
    };
  }

  if (topic === "tiling" || p.kind === "tiling" || p.kind === "concept_tiling") {
    const shapeHe = String(p.shape || "");
    let tile = "square";
    if (shapeHe.includes("משושה")) tile = "hexagon";
    else if (shapeHe.includes("משולש")) tile = "triangle";
    else if (shapeHe.includes("מלבן")) tile = "rectangle";
    const out = { kind: "tiling", tile, hideAngle: hideUnknownValues };
    if (typeof p.angle === "number") out.angle = p.angle;
    return out;
  }

  return null;
}

/**
 * Emphasis drives stroke/fill highlight on the diagram for the current step index.
 * Aligns with typical 4-step flow: נוסחה → הצבה → חישוב → תוצאה.
 */
export function getDiagramEmphasisForStep(question, stepIndex, totalSteps) {
  return getDiagramEmphasisFromMetadata(question, stepIndex, totalSteps);
}

/** @deprecated inline mapping — kept for reference tests only */
export function getDiagramEmphasisForStepLegacy(question, stepIndex, totalSteps) {
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

  if (spec.kind === "triangle" && spec.mode === "height" && spec.hideHeight) {
    return spec.height != null ? [String(spec.height)] : [];
  }

  if (spec.kind === "parallelogram" && spec.mode === "height" && spec.hideHeight) {
    return [String(spec.height)];
  }

  if (spec.kind === "trapezoid" && spec.mode === "height" && spec.hideHeight) {
    return [String(spec.height)];
  }

  if (spec.kind === "diagonal" && spec.hideDiagonal) {
    if (spec.diagonal != null) return [String(spec.diagonal)];
  }

  if (spec.kind === "tiling" && spec.hideAngle && typeof spec.angle === "number") {
    return [String(spec.angle), `${spec.angle}°`];
  }

  if (spec.kind === "symmetry" && typeof spec.axes === "number") {
    return [String(spec.axes)];
  }

  return [];
}
