/**
 * Geometry worksheet topic allowlist and print support matrix — Wave C.
 * @module lib/worksheets/worksheet-geometry-allowlist
 */

import { GRADES, TOPICS } from "../../utils/geometry-constants.js";

/** All 18 geometry hub topics (must match TOPICS keys). */
export const GEOMETRY_WORKSHEET_TOPIC_IDS = /** @type {const} */ ([
  "shapes_basic",
  "area",
  "perimeter",
  "volume",
  "angles",
  "parallel_perpendicular",
  "triangles",
  "quadrilaterals",
  "transformations",
  "rotation",
  "symmetry",
  "diagonal",
  "heights",
  "tiling",
  "circles",
  "solids",
  "pythagoras",
  "mixed",
]);

/**
 * Diagram kinds with static print SVG in worksheet-geometry-diagram-svg.server.js
 * @type {Set<string>}
 */
export const GEOMETRY_PRINT_SUPPORTED_DIAGRAM_KINDS = new Set([
  "square",
  "rectangle",
  "triangle",
  "triangle_perimeter",
  "triangle_angles",
  "parallelogram",
  "trapezoid",
  "circle",
  "shape_template",
  "parallel_lines",
  "symmetry",
  "diagonal",
  "rotation_step",
  "transformation_translate",
  "transformation_reflect",
  "pythagoras",
  "tiling",
  "solid_box",
  "solid_identify",
  "solid_cylinder",
  "solid_sphere",
  "solid_pyramid",
  "solid_cone",
  "solid_prism",
]);

/**
 * Diagram kinds that still have no static print SVG.
 * Keep empty once all engine solids are drawable.
 */
export const GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS = new Set(["pending"]);

/**
 * Topics that may produce conceptual/text-heavy items without numeric diagram.
 * Still printable as text MCQ.
 */
export const GEOMETRY_TEXT_ONLY_TOPIC_KINDS = new Set([
  "concept_transform",
  "concept_rotation",
  "concept_symmetry",
  "concept_lines",
  "concept_angle_reason",
  "concept_angle_type",
  "concept_classify",
  "concept_tiling",
  "concept_solids",
  "concept_measure_interpret",
  "concept_volume_meaning",
  "concept_circle",
  "concept_pythagoras",
]);

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listGeometryTopicsForGrade(gradeKey) {
  return (GRADES[gradeKey]?.topics || []).slice();
}

/** All solids that have real print SVG (no placeholders). */
export const GEOMETRY_PRINT_ALLOWED_SOLID_SHAPES = new Set([
  "cube",
  "rectangular_prism",
  "box",
  "cylinder",
  "sphere",
  "pyramid",
  "cone",
  "prism",
  "תיבה",
  "קובייה",
  "גליל",
  "כדור",
  "פירמידה",
  "חרוט",
  "מנסרה",
]);

/** No solids are blocked once renderers exist — keep empty (legacy names ignored). */
export const GEOMETRY_PRINT_BLOCKED_SOLID_SHAPES = new Set([]);

/**
 * @param {string|null|undefined} shape
 * @returns {boolean}
 */
export function isGeometryPrintBlockedSolidShape(_shape) {
  // All engine solids have print SVG; never block by shape name.
  return false;
}

/**
 * Concrete printable topics for mixed round-robin (≥2 required to expose mixed).
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listGeometryMixedPoolTopics(gradeKey) {
  return listGeometryTopicsForGrade(gradeKey).filter(
    (t) => t && t !== "mixed" && GEOMETRY_WORKSHEET_TOPIC_IDS.includes(t)
  );
}

/**
 * @param {string} gradeKey
 * @returns {boolean}
 */
export function canExposeGeometryWorksheetMixed(gradeKey) {
  if (!(GRADES[gradeKey]?.topics || []).includes("mixed")) return false;
  return listGeometryMixedPoolTopics(gradeKey).length >= 2;
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
export function listGradesForGeometryTopic(topicKey) {
  /** @type {string[]} */
  const grades = [];
  for (const [gradeKey, cfg] of Object.entries(GRADES)) {
    if (cfg.topics?.includes(topicKey)) grades.push(gradeKey);
  }
  return grades;
}

/**
 * @param {string} topicKey
 * @returns {boolean}
 */
export function isKnownGeometryWorksheetTopic(topicKey) {
  return topicKey in TOPICS;
}

/**
 * @param {string|null|undefined} diagramKind
 * @returns {boolean}
 */
export function isGeometryDiagramKindPrintSupported(diagramKind) {
  return GEOMETRY_PRINT_SUPPORTED_DIAGRAM_KINDS.has(String(diagramKind || ""));
}
