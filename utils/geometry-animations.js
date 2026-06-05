/**
 * Geometry step-by-step metadata builder — source of truth for diagram emphasis,
 * reveal layers, animation presets, and text highlights.
 */

import { getGeometryDiagramSpec } from "./geometry-diagram-spec.js";
import {
  GEOMETRY_ANIMATION_PRESETS,
  GEOMETRY_STEP_KINDS,
  TEXT_HIGHLIGHT_KINDS,
  resolveGeometryStepKind,
} from "./geometry-step-types.js";

function lastIndex(totalSteps) {
  return totalSteps > 0 ? totalSteps - 1 : 0;
}

function emphasisForMeasurementKind(specKind, stepKind, spec, stepIndex, totalSteps) {
  const last = lastIndex(totalSteps);
  switch (specKind) {
    case "square":
      if (spec?.mode === "volume") {
        if (stepKind === GEOMETRY_STEP_KINDS.identify || stepKind === GEOMETRY_STEP_KINDS.formula) return "formula";
        if (stepKind === GEOMETRY_STEP_KINDS.substitute || stepKind === GEOMETRY_STEP_KINDS.compute) return "side";
        if (stepIndex >= last) return "result";
        return "side";
      }
      if (spec?.mode === "perimeter") {
        if (stepKind === GEOMETRY_STEP_KINDS.formula || stepKind === GEOMETRY_STEP_KINDS.identify) return "formula";
        if (stepKind === GEOMETRY_STEP_KINDS.result) return "result";
        return "all_sides";
      }
      if (stepKind === GEOMETRY_STEP_KINDS.formula || stepKind === GEOMETRY_STEP_KINDS.identify) return "formula";
      if (stepKind === GEOMETRY_STEP_KINDS.substitute || stepKind === GEOMETRY_STEP_KINDS.compute) return "side";
      if (stepIndex >= last) return "result";
      return "length_width";
    case "rectangle":
      if (stepKind === GEOMETRY_STEP_KINDS.formula || stepKind === GEOMETRY_STEP_KINDS.identify) return "formula";
      if (stepKind === GEOMETRY_STEP_KINDS.substitute || stepKind === GEOMETRY_STEP_KINDS.compute) return "length_width";
      if (stepIndex >= last) return "result";
      return "length_width";
    case "triangle":
    case "parallelogram":
    case "trapezoid":
      if (stepKind === GEOMETRY_STEP_KINDS.formula || stepKind === GEOMETRY_STEP_KINDS.identify) return "formula";
      if (stepKind === GEOMETRY_STEP_KINDS.substitute) return "base";
      if (stepKind === GEOMETRY_STEP_KINDS.compute) {
        return specKind === "trapezoid" ? "bases_height" : "base_height";
      }
      if (stepIndex >= last) return "result";
      return "base_height";
    case "circle":
      if (spec?.mode === "perimeter") {
        if (stepKind === GEOMETRY_STEP_KINDS.formula) return "formula";
        if (stepKind === GEOMETRY_STEP_KINDS.result) return "rim";
        return "radius";
      }
      if (stepKind === GEOMETRY_STEP_KINDS.formula || stepKind === GEOMETRY_STEP_KINDS.identify) return "formula";
      if (stepKind === GEOMETRY_STEP_KINDS.result) return "result";
      return "radius";
    case "triangle_perimeter":
      if (stepKind === GEOMETRY_STEP_KINDS.formula) return "formula";
      if (stepKind === GEOMETRY_STEP_KINDS.result) return "result";
      return "all_sides";
    case "triangle_angles":
      if (stepIndex === 0) return "angles_sum";
      if (stepIndex === 1) return "given_two";
      if (stepIndex === 2) return "angles_compute";
      return "third_angle";
    case "pythagoras":
      if (spec?.mode === "hyp") {
        if (stepIndex === 0) return "formula";
        if (stepIndex === 1) return "legs";
        if (stepIndex === 2) return "squares_legs";
        if (stepIndex === 3) return "sum";
        return "hyp";
      }
      if (stepIndex === 0) return "formula";
      if (stepIndex === 1) return "rearrange";
      if (stepIndex === 2) return "squares_legs";
      if (stepIndex === 3) return "diff";
      return "missing_leg";
    default:
      return "neutral";
  }
}

function animationForSpec(spec, emphasis, stepKind, topic) {
  if (!spec?.kind) return GEOMETRY_ANIMATION_PRESETS.none;

  if (emphasis === "rim" || (spec.kind !== "circle" && topic === "perimeter")) {
    return GEOMETRY_ANIMATION_PRESETS.tracePerimeter;
  }
  if (emphasis === "squares_legs" || emphasis === "sum" || emphasis === "diff") {
    return GEOMETRY_ANIMATION_PRESETS.pythagorasSquares;
  }
  if (emphasis === "base_height" || emphasis === "bases_height" || emphasis === "base") {
    return GEOMETRY_ANIMATION_PRESETS.drawHeight;
  }
  if (spec.kind === "square" && spec.mode === "area" && stepKind !== GEOMETRY_STEP_KINDS.identify) {
    return GEOMETRY_ANIMATION_PRESETS.gridFill;
  }
  if (spec.kind === "rectangle" && spec.mode === "area" && stepKind === GEOMETRY_STEP_KINDS.compute) {
    return GEOMETRY_ANIMATION_PRESETS.gridFill;
  }
  if (spec.kind === "circle" && emphasis === "radius") {
    return GEOMETRY_ANIMATION_PRESETS.pulseRadius;
  }
  if (spec.kind === "triangle_angles") {
    return GEOMETRY_ANIMATION_PRESETS.pulseAngle;
  }
  if (spec.kind === "diagonal" && stepKind !== GEOMETRY_STEP_KINDS.identify) {
    return GEOMETRY_ANIMATION_PRESETS.drawDiagonal;
  }
  if (spec.kind === "tiling") {
    return GEOMETRY_ANIMATION_PRESETS.tileRepeat;
  }
  if (spec.kind === "transformation_translate") {
    return GEOMETRY_ANIMATION_PRESETS.translateGhost;
  }
  if (spec.kind === "transformation_reflect") {
    return GEOMETRY_ANIMATION_PRESETS.reflectMirror;
  }
  if (spec.kind === "rotation_step") {
    return GEOMETRY_ANIMATION_PRESETS.rotateArc;
  }
  if (spec.kind === "solid_identify" || spec.kind?.startsWith?.("solid_")) {
    return GEOMETRY_ANIMATION_PRESETS.solidFaces;
  }
  if (spec.mode === "volume" || topic === "volume") {
    return GEOMETRY_ANIMATION_PRESETS.solidFaces;
  }
  return GEOMETRY_ANIMATION_PRESETS.none;
}

function revealForEmphasis(emphasis, spec) {
  const reveal = [];
  if (emphasis === "formula") reveal.push("formula_note");
  if (emphasis === "side" || emphasis === "length_width") reveal.push("side_labels");
  if (emphasis === "base_height" || emphasis === "bases_height") {
    reveal.push("base_label", "height_dash");
  }
  if (emphasis === "base") reveal.push("base_label");
  if (emphasis === "radius") reveal.push("radius_line");
  if (emphasis === "rim") reveal.push("rim_path");
  if (emphasis === "all_sides") reveal.push("all_side_labels");
  if (emphasis === "squares_legs") reveal.push("leg_squares");
  if (spec?.kind === "symmetry") reveal.push("symmetry_axis");
  if (spec?.kind === "parallel_lines") reveal.push("line_markers");
  if (spec?.kind === "tiling" && spec.angle != null) reveal.push("tile_angle");
  return reveal;
}

function textHighlightsFor(stepKind, topic, emphasis) {
  const hl = [];
  if (stepKind === GEOMETRY_STEP_KINDS.formula) hl.push(TEXT_HIGHLIGHT_KINDS.formula);
  if (stepKind === GEOMETRY_STEP_KINDS.substitute || stepKind === GEOMETRY_STEP_KINDS.compute) {
    hl.push(TEXT_HIGHLIGHT_KINDS.number);
  }
  if (stepKind === GEOMETRY_STEP_KINDS.result) hl.push(TEXT_HIGHLIGHT_KINDS.number, TEXT_HIGHLIGHT_KINDS.unit);
  if (topic === "parallel_perpendicular") hl.push(TEXT_HIGHLIGHT_KINDS.keyword);
  if (emphasis === "formula") hl.push(TEXT_HIGHLIGHT_KINDS.formula);
  return [...new Set(hl)];
}

function emphasisConceptual(spec, stepIndex, totalSteps, question) {
  const topic = question?.topic;
  const p = question?.params || {};
  const last = lastIndex(totalSteps);

  if (spec.kind === "shape_template") {
    if (stepIndex === 0) return "identify_sides";
    if (stepIndex === 1) return "identify_vertices";
    return "right_angles";
  }
  if (spec.kind === "symmetry") {
    const axes = p.axes ?? 4;
    if (stepIndex === 0) return "axis_intro";
    if (stepIndex >= last) return `axis_${Math.min(axes, 4)}`;
    return `axis_${Math.min(stepIndex, axes)}`;
  }
  if (spec.kind === "parallel_lines") {
    if (spec.mode === "perpendicular") return stepIndex >= 1 ? "perpendicular" : "parallel";
    return stepIndex >= 1 ? "parallel" : "perpendicular";
  }
  if (spec.kind === "diagonal") {
    if (stepIndex === 0) return "diagonal_intro";
    if (stepIndex >= last) return "diagonal_line";
    return "diagonal_compute";
  }
  if (spec.kind === "tiling") {
    if (stepIndex === 0) return "tile_shape";
    if (spec.angle != null && stepIndex === 1) return "tile_angle";
    return "tile_repeat";
  }
  if (spec.kind === "transformation_translate") {
    if (stepIndex <= 1) return "translate_intro";
    return "translate_arrow";
  }
  if (spec.kind === "transformation_reflect") {
    if (stepIndex <= 1) return "reflect_intro";
    return "reflect_mirror";
  }
  if (spec.kind === "rotation_step") {
    if (stepIndex <= 1) return "rotate_center";
    return "rotate_arc";
  }
  if (spec.kind === "solid_identify" || String(spec.kind).startsWith("solid_")) {
    if (stepIndex === 0) return "solid_silhouette";
    if (stepIndex === 1) return "solid_faces";
    return "solid_vertices";
  }
  if (topic === "triangles" || topic === "quadrilaterals") {
    const t = String(p.type || "");
    if (t.includes("שווה")) return "equal_sides";
    if (t.includes("ישר")) return "right_angle_mark";
    if (t.includes("מקביל")) return "parallel_sides";
    return "shape_property";
  }
  return "neutral";
}

/**
 * @param {object} question
 * @param {number} stepIndex
 * @param {number} totalSteps
 * @param {string} [topicOverride]
 */
export function buildGeometryStepMetadata(question, stepIndex, totalSteps, topicOverride) {
  const topic = topicOverride || question?.topic || "";
  const effectiveQuestion =
    topic === "mixed" && question?.params?.innerTopic
      ? { ...question, topic: question.params.innerTopic }
      : question;

  const spec = getGeometryDiagramSpec(effectiveQuestion);
  const stepKind = resolveGeometryStepKind(stepIndex, totalSteps);

  let diagramEmphasis = "neutral";
  if (spec) {
    const measurementKinds = new Set([
      "square", "rectangle", "triangle", "parallelogram", "trapezoid",
      "circle", "triangle_perimeter", "triangle_angles", "pythagoras",
    ]);
    if (measurementKinds.has(spec.kind)) {
      diagramEmphasis = emphasisForMeasurementKind(
        spec.kind, stepKind, spec, stepIndex, totalSteps
      );
    } else {
      diagramEmphasis = emphasisConceptual(spec, stepIndex, totalSteps, effectiveQuestion);
    }
  }

  const animationPreset = animationForSpec(spec, diagramEmphasis, stepKind, topic);
  const diagramReveal = revealForEmphasis(diagramEmphasis, spec);
  const textHighlights = textHighlightsFor(stepKind, topic, diagramEmphasis);

  return {
    stepKind,
    diagramEmphasis,
    diagramReveal,
    animationPreset,
    textHighlights,
  };
}

/** Backward-compatible wrapper used by geometry-diagram-spec.js */
export function getDiagramEmphasisFromMetadata(question, stepIndex, totalSteps) {
  return buildGeometryStepMetadata(question, stepIndex, totalSteps).diagramEmphasis;
}

/**
 * Enrich animation steps array with full metadata.
 * @param {object} question
 * @param {string} topic
 * @param {string} gradeKey
 * @param {object[]} slides
 */
export function enrichGeometryAnimationSteps(question, topic, gradeKey, slides) {
  const n = slides.length;
  const resolvedTopic =
    topic === "mixed"
      ? question?.topic ||
        question?.params?.sourceTopic ||
        question?.params?.innerTopic ||
        topic
      : topic;

  return slides.map((content, idx) => {
    const meta = buildGeometryStepMetadata(question, idx, n, resolvedTopic);
    return {
      id: `geometry-step-${idx + 1}`,
      title: `שלב ${idx + 1}`,
      content,
      text: "",
      plainText: "",
      gradeKey,
      topic: resolvedTopic,
      ...meta,
    };
  });
}
