/**
 * Geometry Track A safety gates — no teaching content; flags and grade checks only.
 */
import { parseGradeKey } from "./grade-gating.js";

/** Oracle-confirmed G5+ triangle area formula (kita5.pdf § ה. מדידות שטחים). */
export const TRIANGLE_AREA_FORMULA_MIN_GRADE = 5;

/** G5 triangle_area book page + spine skill registered (Track B). */
export const TRIANGLE_AREA_TEACH_PATH_READY = true;

/** Flip true when geometry:kind:rectangle_area spine skill + binding exist. */
export const RECTANGLE_AREA_SPINE_REGISTERED = false;

/**
 * Parse grade for gate checks - accepts `g3`, `3`, numeric 3, etc.
 * @param {string|number|null|undefined} gradeLevel
 * @returns {number|null} 1–6 or null when unknown
 */
export function parseGeometryGateGrade(gradeLevel) {
  if (gradeLevel == null || gradeLevel === "") return null;
  const fromKey = parseGradeKey(gradeLevel);
  if (fromKey != null) return fromKey;
  if (typeof gradeLevel === "number" && gradeLevel >= 1 && gradeLevel <= 6) {
    return gradeLevel;
  }
  const s = String(gradeLevel).trim();
  if (/^[1-6]$/.test(s)) return parseInt(s, 10);
  const m = s.match(/\b([1-6])\b/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Triangle area formula exposure allowed for this grade.
 * Unknown/null grade → false (fail closed).
 * @param {string|number|null|undefined} gradeLevel
 */
export function isTriangleAreaFormulaGradeAllowed(gradeLevel) {
  const n = parseGeometryGateGrade(gradeLevel);
  if (n == null) return false;
  return n >= TRIANGLE_AREA_FORMULA_MIN_GRADE;
}

/** G6 prism_volume_triangle book/practice/generator until G5 teach path exists. */
export function isPrismVolumeTriangleAllowed() {
  return TRIANGLE_AREA_TEACH_PATH_READY === true;
}

/** @param {string} kind */
export function isTriangleAreaFormulaKind(kind) {
  const k = String(kind || "").replace(/^story_/, "");
  return k === "triangle_area";
}

/** @param {string} kind */
export function isRectangleAreaDiagnosticKind(kind) {
  const k = String(kind || "").replace(/^story_/, "");
  return k === "rectangle_area";
}

/** @returns {boolean} */
export function isRectangleAreaSpineRegistered() {
  return RECTANGLE_AREA_SPINE_REGISTERED === true;
}
