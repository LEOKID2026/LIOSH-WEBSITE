import { GRADES } from "../../utils/geometry-constants.js";
import { isPrismVolumeTriangleAllowed } from "../../utils/geometry-curriculum-gates.js";
import { GEOMETRY_G1_PAGE_ORDER } from "./geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "./geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "./geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "./geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "./geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "./geometry-g6-registry.js";

/** @typedef {{ topic: string, forceKind: string }} GeometryPracticeEntry */

/** @param {string} pageId @param {string} [topic] */
function entry(pageId, topic = pageId) {
  return { topic, forceKind: pageId };
}

/** @type {Record<string, Record<string, GeometryPracticeEntry>>} */
export const GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE = {
  g1: {
    shapes_basic_square: entry("shapes_basic_square", "shapes_basic"),
    shapes_basic_rectangle: entry("shapes_basic_rectangle", "shapes_basic"),
    transformations: entry("transformations", "transformations"),
  },
  g2: {
    solids: entry("solids", "solids"),
    square_area: entry("square_area", "area"),
    transformations: entry("transformations", "transformations"),
  },
  g3: {
    triangles: entry("triangles", "triangles"),
    quadrilaterals: entry("quadrilaterals", "quadrilaterals"),
    parallel_perpendicular: entry("parallel_perpendicular", "parallel_perpendicular"),
    square_area: entry("square_area", "area"),
    square_perimeter: entry("square_perimeter", "perimeter"),
    triangle_perimeter: entry("triangle_perimeter", "perimeter"),
    triangle_angles: entry("triangle_angles", "angles"),
    rotation: entry("rotation", "rotation"),
    solids: entry("solids", "solids"),
  },
  g4: {
    shapes_basic_properties_square: entry(
      "shapes_basic_properties_square",
      "shapes_basic"
    ),
    shapes_basic_properties_rectangle: entry(
      "shapes_basic_properties_rectangle",
      "shapes_basic"
    ),
    shapes_basic_properties_angles: entry(
      "shapes_basic_properties_angles",
      "shapes_basic"
    ),
    symmetry: entry("symmetry", "symmetry"),
    quadrilaterals: entry("quadrilaterals", "quadrilaterals"),
    parallel_perpendicular: entry("parallel_perpendicular", "parallel_perpendicular"),
    square_perimeter: entry("square_perimeter", "perimeter"),
    square_area: entry("square_area", "area"),
    triangle_perimeter: entry("triangle_perimeter", "perimeter"),
    triangle_angles: entry("triangle_angles", "angles"),
    diagonal_square: entry("diagonal_square", "diagonal"),
    diagonal_rectangle: entry("diagonal_rectangle", "diagonal"),
    solids: entry("solids", "solids"),
    rectangular_prism_volume: entry("rectangular_prism_volume", "volume"),
  },
  g5: {
    parallel_perpendicular: entry("parallel_perpendicular", "parallel_perpendicular"),
    quadrilaterals: entry("quadrilaterals", "quadrilaterals"),
    triangle_angles: entry("triangle_angles", "angles"),
    square_perimeter: entry("square_perimeter", "perimeter"),
    triangle_perimeter: entry("triangle_perimeter", "perimeter"),
    heights_triangle: entry("heights_triangle", "heights"),
    heights_parallelogram: entry("heights_parallelogram", "heights"),
    heights_trapezoid: entry("heights_trapezoid", "heights"),
    square_area: entry("square_area", "area"),
    triangle_area: entry("triangle_area", "area"),
    parallelogram_area: entry("parallelogram_area", "area"),
    trapezoid_area: entry("trapezoid_area", "area"),
    diagonal_square: entry("diagonal_square", "diagonal"),
    diagonal_rectangle: entry("diagonal_rectangle", "diagonal"),
    diagonal_parallelogram: entry("diagonal_parallelogram", "diagonal"),
    solids: entry("solids", "solids"),
    rectangular_prism_volume: entry("rectangular_prism_volume", "volume"),
    tiling: entry("tiling", "tiling"),
  },
  g6: {
    square_perimeter: entry("square_perimeter", "perimeter"),
    triangle_perimeter: entry("triangle_perimeter", "perimeter"),
    square_area: entry("square_area", "area"),
    parallelogram_area: entry("parallelogram_area", "area"),
    trapezoid_area: entry("trapezoid_area", "area"),
    triangle_angles: entry("triangle_angles", "angles"),
    circle_perimeter: entry("circle_perimeter", "circles"),
    circle_area: entry("circle_area", "circles"),
    pythagoras_hyp: entry("pythagoras_hyp", "pythagoras"),
    pythagoras_leg: entry("pythagoras_leg", "pythagoras"),
    solids: entry("solids", "solids"),
    rectangular_prism_volume: entry("rectangular_prism_volume", "volume"),
    prism_volume_rectangular: entry("prism_volume_rectangular", "volume"),
    prism_volume_triangle: entry("prism_volume_triangle", "volume"),
    pyramid_volume_square: entry("pyramid_volume_square", "volume"),
    pyramid_volume_rectangular: entry("pyramid_volume_rectangular", "volume"),
    cylinder_volume: entry("cylinder_volume", "volume"),
    cone_volume: entry("cone_volume", "volume"),
    sphere_volume: entry("sphere_volume", "volume"),
  },
};

/** @type {Record<string, string[]>} */
export const GEOMETRY_PAGE_ORDER_BY_GRADE = {
  g1: GEOMETRY_G1_PAGE_ORDER,
  g2: GEOMETRY_G2_PAGE_ORDER,
  g3: GEOMETRY_G3_PAGE_ORDER,
  g4: GEOMETRY_G4_PAGE_ORDER,
  g5: GEOMETRY_G5_PAGE_ORDER,
  g6: GEOMETRY_G6_PAGE_ORDER,
};

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveGeometryPracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  if (pageId === "prism_volume_triangle" && !isPrismVolumeTriangleAllowed()) {
    return null;
  }
  const map = GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;

  const pageOrder = GEOMETRY_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  if (!pageOrder.includes(pageId)) return null;

  const practice = map[pageId];
  if (!practice) return null;

  const gradeCfg = GRADES[gradeKey];
  if (!gradeCfg?.topics?.includes(practice.topic)) return null;

  return {
    pageId,
    grade: gradeKey,
    mode: "learning",
    topic: practice.topic,
    forceKind: practice.forceKind,
  };
}

export function hasGeometryPracticeTarget(grade, pageId) {
  return resolveGeometryPracticeTarget(grade, pageId) != null;
}
