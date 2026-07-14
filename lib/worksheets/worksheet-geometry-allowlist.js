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
]);

/**
 * Diagram kinds produced by geometry-diagram-spec but without static print SVG yet.
 * Questions that resolve only to these kinds are temporarily non-printable.
 */
export const GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS = new Set([
  "solid_cylinder",
  "solid_sphere",
  "solid_pyramid",
  "solid_cone",
  "pending",
]);

/**
 * Topics that may produce conceptual/text-heavy items without numeric diagram.
 * Still printable as text MCQ.
 */
export const GEOMETRY_TEXT_ONLY_TOPIC_KINDS = new Set([
  "concept_transform",
  "concept_rotation",
  "concept_symmetry",
  "concept_lines",
  "tiling",
  "heights",
]);

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listGeometryTopicsForGrade(gradeKey) {
  return (GRADES[gradeKey]?.topics || []).slice();
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
