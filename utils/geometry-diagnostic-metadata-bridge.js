/**
 * Procedural Geometry diagnostic metadata bridge (P0).
 * Enriches generator `params` only - no stem/answer changes.
 */
import { mergeDiagnosticContractIntoParams } from "./diagnostic-question-contract.js";
import { defaultErrorTagsForSubjectTopic } from "../lib/learning/mcq-subject-default-error-tags.js";
import { normalizeExpectedErrorTags } from "../lib/learning/taxonomy-tag-normalizer.js";
import {
  isTriangleAreaFormulaGradeAllowed,
  isTriangleAreaFormulaKind,
  isRectangleAreaDiagnosticKind,
  isRectangleAreaSpineRegistered,
} from "./geometry-curriculum-gates.js";

/** @typedef {{ diagnosticSkillId: string, conceptTag: string, expectedErrorTags: string[], probePower?: string }} DiagnosticContract */

/** @type {Record<string, DiagnosticContract>} */
const BY_KIND = {
  square_area: {
    diagnosticSkillId: "geo_area_square_formula",
    conceptTag: "square_area_compute",
    expectedErrorTags: ["square_area_compute", "formula_selection_error", "measurement_error"],
  },
  story_square_area: {
    diagnosticSkillId: "geo_area_square_formula",
    conceptTag: "square_area_story",
    expectedErrorTags: ["square_area_story", "formula_selection_error", "measurement_error"],
  },
  rectangle_area: {
    diagnosticSkillId: "geo_rect_area_plan",
    conceptTag: "rectangle_area_compute",
    expectedErrorTags: ["rectangle_area_compute", "formula_selection_error", "measurement_error"],
  },
  story_rectangle_area: {
    diagnosticSkillId: "geo_rect_area_plan",
    conceptTag: "rectangle_area_story",
    expectedErrorTags: ["rectangle_area_story", "formula_selection_error", "measurement_error"],
  },
  triangle_area: {
    diagnosticSkillId: "geo_area_triangle_formula",
    conceptTag: "triangle_area_compute",
    expectedErrorTags: ["triangle_area_compute", "formula_selection_error", "measurement_error"],
  },
  story_triangle_area: {
    diagnosticSkillId: "geo_area_triangle_formula",
    conceptTag: "triangle_area_story",
    expectedErrorTags: ["triangle_area_story", "formula_selection_error", "measurement_error"],
  },
  parallelogram_area: {
    diagnosticSkillId: "geo_area_parallelogram_formula",
    conceptTag: "parallelogram_area_compute",
    expectedErrorTags: ["parallelogram_area_compute", "formula_selection_error", "measurement_error"],
  },
  trapezoid_area: {
    diagnosticSkillId: "geo_area_trapezoid_formula",
    conceptTag: "trapezoid_area_compute",
    expectedErrorTags: ["trapezoid_area_compute", "formula_selection_error", "measurement_error"],
  },
  circle_area: {
    diagnosticSkillId: "geo_area_circle_formula",
    conceptTag: "circle_area_compute",
    expectedErrorTags: ["circle_area_compute", "formula_selection_error", "measurement_error"],
  },
  story_circle_area: {
    diagnosticSkillId: "geo_area_circle_formula",
    conceptTag: "circle_area_story",
    expectedErrorTags: ["circle_area_story", "formula_selection_error", "measurement_error"],
  },
  square_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "square_perimeter_compute",
    expectedErrorTags: ["square_perimeter_compute", "formula_selection_error", "measurement_error"],
  },
  story_square_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "square_perimeter_story",
    expectedErrorTags: ["square_perimeter_story", "formula_selection_error", "measurement_error"],
  },
  rectangle_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "rectangle_perimeter_compute",
    expectedErrorTags: ["rectangle_perimeter_compute", "formula_selection_error", "measurement_error"],
  },
  story_rectangle_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "rectangle_perimeter_story",
    expectedErrorTags: ["rectangle_perimeter_story", "formula_selection_error", "measurement_error"],
  },
  triangle_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "triangle_perimeter_compute",
    expectedErrorTags: ["triangle_perimeter_compute", "formula_selection_error", "measurement_error"],
  },
  circle_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "circle_perimeter_compute",
    expectedErrorTags: ["circle_perimeter_compute", "formula_selection_error", "measurement_error"],
  },
  story_circle_perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "circle_perimeter_story",
    expectedErrorTags: ["circle_perimeter_story", "formula_selection_error", "measurement_error"],
  },
  cube_volume: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "cube_volume_compute",
    expectedErrorTags: ["cube_volume_compute", "formula_selection_error", "measurement_error"],
  },
  story_cube_volume: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "cube_volume_story",
    expectedErrorTags: ["cube_volume_story", "formula_selection_error", "measurement_error"],
  },
  rectangular_prism_volume: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "rect_prism_volume_compute",
    expectedErrorTags: ["rect_prism_volume_compute", "formula_selection_error", "measurement_error"],
  },
  story_box_volume: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "box_volume_story",
    expectedErrorTags: ["box_volume_story", "formula_selection_error", "measurement_error"],
  },
  cylinder_volume: {
    diagnosticSkillId: "geo_volume_cylinder_formula",
    conceptTag: "cylinder_volume_compute",
    expectedErrorTags: ["cylinder_volume_compute", "formula_selection_error", "measurement_error"],
  },
  sphere_volume: {
    diagnosticSkillId: "geo_volume_sphere_formula",
    conceptTag: "sphere_volume_compute",
    expectedErrorTags: ["sphere_volume_compute", "formula_selection_error", "measurement_error"],
  },
  pyramid_volume_square: {
    diagnosticSkillId: "geo_volume_pyramid_formula",
    conceptTag: "pyramid_volume_square_base",
    expectedErrorTags: ["pyramid_volume_square_base", "formula_selection_error", "measurement_error"],
  },
  pyramid_volume_rectangular: {
    diagnosticSkillId: "geo_volume_pyramid_formula",
    conceptTag: "pyramid_volume_rect_base",
    expectedErrorTags: ["pyramid_volume_rect_base", "formula_selection_error", "measurement_error"],
  },
  cone_volume: {
    diagnosticSkillId: "geo_volume_cone_formula",
    conceptTag: "cone_volume_compute",
    expectedErrorTags: ["cone_volume_compute", "formula_selection_error", "measurement_error"],
  },
  prism_volume_triangle: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "triangular_prism_volume",
    expectedErrorTags: ["triangular_prism_volume", "formula_selection_error", "measurement_error"],
  },
  prism_volume_rectangular: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "rectangular_prism_volume",
    expectedErrorTags: ["rectangular_prism_volume", "formula_selection_error", "measurement_error"],
  },
  triangle_angles: {
    diagnosticSkillId: "geo_angle_measure",
    conceptTag: "triangle_angle_sum",
    expectedErrorTags: ["triangle_angle_sum", "visual_reasoning_error", "measurement_error"],
  },
  pythagoras_hyp: {
    diagnosticSkillId: "geo_pythagoras_apply",
    conceptTag: "pythagoras_hypotenuse",
    expectedErrorTags: ["pythagoras_hypotenuse", "formula_selection_error", "geometry_calculation_slip"],
  },
  pythagoras_leg: {
    diagnosticSkillId: "geo_pythagoras_apply",
    conceptTag: "pythagoras_leg",
    expectedErrorTags: ["pythagoras_leg", "formula_selection_error", "geometry_calculation_slip"],
  },
  shapes_basic_square: {
    diagnosticSkillId: "geo_shape_classification",
    conceptTag: "identify_square",
    expectedErrorTags: ["identify_square", "visual_reasoning_error", "measurement_error"],
  },
  shapes_basic_rectangle: {
    diagnosticSkillId: "geo_shape_classification",
    conceptTag: "identify_rectangle",
    expectedErrorTags: ["identify_rectangle", "visual_reasoning_error", "measurement_error"],
  },
  shapes_basic_properties_square: {
    diagnosticSkillId: "geo_shape_properties",
    conceptTag: "square_properties",
    expectedErrorTags: ["square_properties", "visual_reasoning_error", "measurement_error"],
  },
  shapes_basic_properties_rectangle: {
    diagnosticSkillId: "geo_shape_properties",
    conceptTag: "rectangle_properties",
    expectedErrorTags: ["rectangle_properties", "visual_reasoning_error", "measurement_error"],
  },
  shapes_basic_properties_angles: {
    diagnosticSkillId: "geo_shape_properties",
    conceptTag: "shape_angle_properties",
    expectedErrorTags: ["shape_angle_properties", "visual_reasoning_error", "measurement_error"],
  },
  parallel_perpendicular: {
    diagnosticSkillId: "geo_angle_parallel_perpendicular",
    conceptTag: "parallel_perpendicular_lines",
    expectedErrorTags: ["parallel_perpendicular_lines", "visual_reasoning_error", "measurement_error"],
  },
  triangles: {
    diagnosticSkillId: "geo_triangle_classify",
    conceptTag: "triangle_classification",
    expectedErrorTags: ["triangle_classification", "visual_reasoning_error", "measurement_error"],
  },
  quadrilaterals: {
    diagnosticSkillId: "geo_quad_classification",
    conceptTag: "quadrilateral_classification",
    expectedErrorTags: ["quadrilateral_classification", "visual_reasoning_error", "measurement_error"],
  },
  transformations: {
    diagnosticSkillId: "geo_symmetry_reflection",
    conceptTag: "translation_reflection",
    expectedErrorTags: ["translation_reflection", "visual_reasoning_error", "measurement_error"],
  },
  rotation: {
    diagnosticSkillId: "geo_symmetry_rotation",
    conceptTag: "rotation_transform",
    expectedErrorTags: ["rotation_transform", "visual_reasoning_error", "measurement_error"],
  },
  symmetry: {
    diagnosticSkillId: "geo_symmetry_reflection",
    conceptTag: "reflection_symmetry",
    expectedErrorTags: ["reflection_symmetry", "visual_reasoning_error", "measurement_error"],
  },
  diagonal_square: {
    diagnosticSkillId: "geo_shape_diagonal",
    conceptTag: "square_diagonal",
    expectedErrorTags: ["square_diagonal", "formula_selection_error", "measurement_error"],
  },
  diagonal_rectangle: {
    diagnosticSkillId: "geo_shape_diagonal",
    conceptTag: "rectangle_diagonal",
    expectedErrorTags: ["rectangle_diagonal", "formula_selection_error", "measurement_error"],
  },
  diagonal_parallelogram: {
    diagnosticSkillId: "geo_shape_diagonal",
    conceptTag: "parallelogram_diagonal",
    expectedErrorTags: ["parallelogram_diagonal", "formula_selection_error", "measurement_error"],
  },
  heights_triangle: {
    diagnosticSkillId: "geo_triangle_properties",
    conceptTag: "triangle_height",
    expectedErrorTags: ["triangle_height", "formula_selection_error", "measurement_error"],
  },
  heights_parallelogram: {
    diagnosticSkillId: "geo_quad_properties",
    conceptTag: "parallelogram_height",
    expectedErrorTags: ["parallelogram_height", "formula_selection_error", "measurement_error"],
  },
  heights_trapezoid: {
    diagnosticSkillId: "geo_quad_properties",
    conceptTag: "trapezoid_height",
    expectedErrorTags: ["trapezoid_height", "formula_selection_error", "measurement_error"],
  },
  tiling: {
    diagnosticSkillId: "geo_angle_measure",
    conceptTag: "tiling_angle",
    expectedErrorTags: ["tiling_angle", "visual_reasoning_error", "measurement_error"],
  },
  solids: {
    diagnosticSkillId: "geo_shape_classification",
    conceptTag: "solid_identification",
    expectedErrorTags: ["solid_identification", "visual_reasoning_error", "measurement_error"],
  },
};

/** @type {Record<string, DiagnosticContract>} */
const BY_TOPIC_FALLBACK = {
  area: {
    diagnosticSkillId: "geo_rect_area_plan",
    conceptTag: "area_general",
    expectedErrorTags: ["area_general", "formula_selection_error", "measurement_error"],
  },
  perimeter: {
    diagnosticSkillId: "geo_perimeter_formula",
    conceptTag: "perimeter_general",
    expectedErrorTags: ["perimeter_general", "formula_selection_error", "measurement_error"],
  },
  volume: {
    diagnosticSkillId: "geo_volume_prism_formula",
    conceptTag: "volume_general",
    expectedErrorTags: ["volume_general", "formula_selection_error", "measurement_error"],
  },
  shapes_basic: {
    diagnosticSkillId: "geo_shape_properties",
    conceptTag: "shapes_basic_general",
    expectedErrorTags: ["shapes_basic_general", "visual_reasoning_error", "measurement_error"],
  },
  angles: {
    diagnosticSkillId: "geo_angle_measure",
    conceptTag: "angle_general",
    expectedErrorTags: ["angle_general", "visual_reasoning_error", "measurement_error"],
  },
  triangles: {
    diagnosticSkillId: "geo_triangle_classify",
    conceptTag: "triangle_general",
    expectedErrorTags: ["triangle_general", "visual_reasoning_error", "measurement_error"],
  },
  quadrilaterals: {
    diagnosticSkillId: "geo_quad_classification",
    conceptTag: "quadrilateral_general",
    expectedErrorTags: ["quadrilateral_general", "visual_reasoning_error", "measurement_error"],
  },
  symmetry: {
    diagnosticSkillId: "geo_symmetry_reflection",
    conceptTag: "symmetry_general",
    expectedErrorTags: ["symmetry_general", "visual_reasoning_error", "measurement_error"],
  },
  rotation: {
    diagnosticSkillId: "geo_symmetry_rotation",
    conceptTag: "rotation_general",
    expectedErrorTags: ["rotation_general", "visual_reasoning_error", "measurement_error"],
  },
  transformations: {
    diagnosticSkillId: "geo_symmetry_reflection",
    conceptTag: "transform_general",
    expectedErrorTags: ["transform_general", "visual_reasoning_error", "measurement_error"],
  },
  pythagoras: {
    diagnosticSkillId: "geo_pythagoras_apply",
    conceptTag: "pythagoras_general",
    expectedErrorTags: ["pythagoras_general", "formula_selection_error", "geometry_calculation_slip"],
  },
  diagonal: {
    diagnosticSkillId: "geo_shape_diagonal",
    conceptTag: "diagonal_general",
    expectedErrorTags: ["diagonal_general", "formula_selection_error", "measurement_error"],
  },
  heights: {
    diagnosticSkillId: "geo_triangle_properties",
    conceptTag: "height_general",
    expectedErrorTags: ["height_general", "formula_selection_error", "measurement_error"],
  },
  tiling: {
    diagnosticSkillId: "geo_angle_measure",
    conceptTag: "tiling_general",
    expectedErrorTags: ["tiling_general", "visual_reasoning_error", "measurement_error"],
  },
  circles: {
    diagnosticSkillId: "geo_area_circle_formula",
    conceptTag: "circle_general",
    expectedErrorTags: ["circle_general", "formula_selection_error", "measurement_error"],
  },
  solids: {
    diagnosticSkillId: "geo_shape_classification",
    conceptTag: "solid_general",
    expectedErrorTags: ["solid_general", "visual_reasoning_error", "measurement_error"],
  },
  parallel_perpendicular: {
    diagnosticSkillId: "geo_angle_parallel_perpendicular",
    conceptTag: "parallel_perpendicular_general",
    expectedErrorTags: ["parallel_perpendicular_general", "visual_reasoning_error", "measurement_error"],
  },
  mixed: {
    diagnosticSkillId: "geo_shape_properties",
    conceptTag: "mixed_geometry",
    expectedErrorTags: ["mixed_geometry", "formula_selection_error", "measurement_error"],
  },
};

/** Generic area diagnostic when rectangle-specific spine skill is not registered. */
const GENERIC_AREA_PROCEDURAL = {
  diagnosticSkillId: "geo_area_procedural",
  conceptTag: "area_procedural",
  expectedErrorTags: ["area_procedural", "formula_selection_error", "measurement_error"],
};

/**
 * @param {DiagnosticContract | null} contract
 * @param {{ kind?: string, patternFamily?: string }} ctx
 * @returns {DiagnosticContract | null}
 */
function suppressUnspinedRectangleAreaSkill(contract, ctx = {}) {
  if (!contract || isRectangleAreaSpineRegistered()) return contract;
  if (contract.diagnosticSkillId !== "geo_rect_area_plan") return contract;
  const kind = String(ctx.kind || "");
  const pf = String(ctx.patternFamily || "");
  if (isRectangleAreaDiagnosticKind(kind) || pf.startsWith("area_rectangle")) {
    return {
      ...GENERIC_AREA_PROCEDURAL,
      conceptTag: kind ? `${kind.replace(/^story_/, "")}_procedural` : "area_procedural",
    };
  }
  return contract;
}

/**
 * @param {string} patternFamily
 * @param {string} kind
 * @returns {DiagnosticContract | null}
 */
function resolveByPatternFamily(patternFamily, kind) {
  const pf = String(patternFamily || "");
  if (!pf) return null;

  if (pf.startsWith("area_square_story") || pf.startsWith("area_square_")) {
    return BY_KIND.story_square_area || BY_KIND.square_area;
  }
  if (pf.startsWith("area_rectangle_story") || pf.startsWith("area_rectangle_")) {
    return suppressUnspinedRectangleAreaSkill(
      BY_KIND.story_rectangle_area || BY_KIND.rectangle_area,
      { kind, patternFamily: pf }
    );
  }
  if (pf.startsWith("area_")) {
    return BY_TOPIC_FALLBACK.area;
  }
  if (pf.startsWith("prism_volume_") || pf.includes("volume")) {
    return BY_KIND.prism_volume_rectangular || BY_TOPIC_FALLBACK.volume;
  }
  if (pf.startsWith("symmetry_")) {
    return BY_KIND.symmetry;
  }
  if (pf.startsWith("rotation_")) {
    return BY_KIND.rotation;
  }
  if (pf.startsWith("triangles_classify_")) {
    return BY_KIND.triangles;
  }
  if (pf.startsWith("triangle_angles_")) {
    return BY_KIND.triangle_angles;
  }
  if (pf.startsWith("quadrilaterals_")) {
    return BY_KIND.quadrilaterals;
  }
  if (pf.startsWith("parallel_perpendicular_")) {
    return BY_KIND.parallel_perpendicular;
  }
  if (pf.startsWith("shapes_basic_square") || pf.startsWith("shapes_basic_rect")) {
    return BY_KIND.shapes_basic_square;
  }
  if (pf.startsWith("shapes_basic_")) {
    return BY_TOPIC_FALLBACK.shapes_basic;
  }
  if (pf.startsWith("diagonal_")) {
    return BY_KIND.diagonal_rectangle;
  }

  if (kind && BY_KIND[kind]) return BY_KIND[kind];
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {{ topic?: string, gradeKey?: string, levelKey?: string }} ctx
 * @returns {Record<string, unknown>}
 */
export function enrichGeometryProceduralParams(params, ctx = {}) {
  const base = params && typeof params === "object" ? params : {};
  if (base.kind === "no_question") return base;
  if (base.diagnosticSkillId) return base;

  const kind = String(base.kind || "");
  const topic = String(ctx.topic || "");
  const patternFamily = String(base.patternFamily || "");

  let contract =
    (kind && BY_KIND[kind]) ||
    resolveByPatternFamily(patternFamily, kind) ||
    BY_TOPIC_FALLBACK[topic] ||
    null;

  const gradeKey = ctx.gradeKey ?? null;
  if (
    contract &&
    isTriangleAreaFormulaKind(kind) &&
    !isTriangleAreaFormulaGradeAllowed(gradeKey)
  ) {
    contract = BY_TOPIC_FALLBACK[topic] || {
      diagnosticSkillId: `geo_${topic || "general"}_procedural`,
      conceptTag: kind || `${topic}_procedural`,
      expectedErrorTags: [
        kind || `${topic}_procedural`,
        "formula_selection_error",
        "measurement_error",
      ],
    };
  }

  contract = suppressUnspinedRectangleAreaSkill(contract, { kind, patternFamily });

  if (!contract) {
    contract = {
      diagnosticSkillId: `geo_${topic || "general"}_procedural`,
      conceptTag: kind || `${topic}_procedural`,
      expectedErrorTags: [
        kind || `${topic}_procedural`,
        "formula_selection_error",
        "measurement_error",
      ],
    };
  }

  const resolvedPatternFamily =
    patternFamily ||
    (kind
      ? `${topic || "geometry"}_${kind}`
      : `${topic || "geometry"}_procedural_${ctx.gradeKey || "g3"}_${ctx.levelKey || "easy"}`);

  const expectedErrorTypes = normalizeExpectedErrorTags([
    ...defaultErrorTagsForSubjectTopic("geometry", topic, resolvedPatternFamily),
    ...contract.expectedErrorTags,
  ]);

  return mergeDiagnosticContractIntoParams(base, {
    patternFamily: resolvedPatternFamily,
    conceptTag: contract.conceptTag,
    diagnosticSkillId: contract.diagnosticSkillId,
    expectedErrorTags: expectedErrorTypes,
    expectedErrorTypes,
    probePower: contract.probePower || "medium",
  });
}

/** Verify hook: rectangle_area enrich must not emit geo_rect_area_plan without spine. */
export function rectangleAreaBridgeUsesSafeFallbackForVerify() {
  const p = enrichGeometryProceduralParams(
    { kind: "rectangle_area", length: 4, width: 3 },
    { topic: "area", gradeKey: "g3", levelKey: "easy" }
  );
  return p.diagnosticSkillId === "geo_area_procedural";
}
