/** Geometry step-by-step metadata enums. */

export const GEOMETRY_ANIMATION_PRESETS = {
  none: "none",
  drawPath: "drawPath",
  drawHeight: "drawHeight",
  drawDiagonal: "drawDiagonal",
  gridFill: "gridFill",
  tracePerimeter: "tracePerimeter",
  pulseRadius: "pulseRadius",
  pulseAngle: "pulseAngle",
  pythagorasSquares: "pythagorasSquares",
  tileRepeat: "tileRepeat",
  translateGhost: "translateGhost",
  reflectMirror: "reflectMirror",
  rotateArc: "rotateArc",
  solidFaces: "solidFaces",
};

export const GEOMETRY_STEP_KINDS = {
  identify: "identify",
  formula: "formula",
  substitute: "substitute",
  compute: "compute",
  result: "result",
  concept: "concept",
};

export const TEXT_HIGHLIGHT_KINDS = {
  number: "number",
  formula: "formula",
  keyword: "keyword",
  unit: "unit",
};

/**
 * @param {number} stepIndex
 * @param {number} totalSteps
 */
export function resolveGeometryStepKind(stepIndex, totalSteps) {
  if (totalSteps <= 1) return GEOMETRY_STEP_KINDS.identify;
  if (stepIndex === 0) return GEOMETRY_STEP_KINDS.identify;
  if (stepIndex === 1) return GEOMETRY_STEP_KINDS.formula;
  if (stepIndex === totalSteps - 1) return GEOMETRY_STEP_KINDS.result;
  if (stepIndex === totalSteps - 2 && totalSteps >= 4) return GEOMETRY_STEP_KINDS.compute;
  if (stepIndex === 2 && totalSteps >= 5) return GEOMETRY_STEP_KINDS.substitute;
  if (stepIndex >= totalSteps - 2) return GEOMETRY_STEP_KINDS.compute;
  return GEOMETRY_STEP_KINDS.substitute;
}
