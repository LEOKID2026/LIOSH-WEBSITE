/**
 * Geometry worksheet open vs MCQ classification (print pedagogy).
 * @module lib/worksheets/worksheet-geometry-answer-mode
 */

/** Computational kinds → open numeric answer on worksheets. */
const GEOMETRY_WORKSHEET_OPEN_KINDS = new Set([
  "triangle_angles",
  "square_perimeter",
  "rectangle_perimeter",
  "triangle_perimeter",
  "circle_perimeter",
  "square_area",
  "rectangle_area",
  "triangle_area",
  "parallelogram_area",
  "trapezoid_area",
  "circle_area",
  "story_rectangle_area",
  "story_circle_area",
  "story_circle_perimeter",
  "pythagoras_hyp",
  "pythagoras_leg",
  "diagonal_square",
  "diagonal_rectangle",
  "diagonal_parallelogram",
  "heights_triangle",
  "heights_parallelogram",
  "heights_trapezoid",
  "cube_volume",
  "rectangular_prism_volume",
  "tiling_count",
]);

/** Explicit identify / concept kinds → keep MCQ when options exist. */
const GEOMETRY_WORKSHEET_MCQ_KINDS = new Set([
  "concept_angle_reason",
  "concept_angle_type",
  "concept_classify",
  "concept_transform",
  "concept_rotation",
  "concept_symmetry",
  "concept_lines",
  "concept_tiling",
  "concept_solids",
  "concept_measure_interpret",
  "concept_volume_meaning",
  "concept_circle",
  "concept_pythagoras",
  "triangles",
  "quadrilaterals",
  "shapes_basic_square",
  "shapes_basic_rectangle",
  "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
  "symmetry",
  "parallel_perpendicular",
  "solids",
  "solids_identify",
  "solids_faces",
  "solids_vertices",
  "solids_edges",
  "rotation",
  "tiling",
]);

/**
 * @param {string} kind
 * @returns {string}
 */
function normalizeKind(kind) {
  return String(kind || "").replace(/^story_/, "").trim();
}

/**
 * @param {string|null|undefined} kind
 * @param {string|null|undefined} topic
 * @returns {"open" | "mcq"}
 */
export function resolveGeometryWorksheetAnswerMode(kind, topic) {
  const k = normalizeKind(kind);
  if (GEOMETRY_WORKSHEET_OPEN_KINDS.has(k)) return "open";
  if (GEOMETRY_WORKSHEET_MCQ_KINDS.has(k)) return "mcq";
  if (k.startsWith("concept_")) return "mcq";
  if (k.startsWith("heights_") || k.startsWith("diagonal_")) return "open";
  if (k.includes("perimeter") || k.includes("area") || k.includes("volume")) {
    return "open";
  }
  if (k.includes("pythagoras")) return "open";
  // Default: identification-ish MCQ when options exist; callers still gate on options.
  if (["angles", "area", "perimeter", "volume", "pythagoras", "circles"].includes(String(topic || ""))) {
    // Ambiguous mid kinds on compute topics → open if not clearly concept.
    if (!k.startsWith("concept_")) return "open";
  }
  return "mcq";
}

/**
 * @param {string|null|undefined} kind
 * @returns {boolean}
 */
export function isGeometryWorksheetOpenKind(kind) {
  return resolveGeometryWorksheetAnswerMode(kind, null) === "open";
}
