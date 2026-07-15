/**
 * Authoritative Geometry / גאומטריה page → diagram mapping.
 * `null` = intentionally no diagram (topic too vague or no safe visual).
 *
 * @typedef {{ diagramType: string | null, topicHe: string, conceptHe: string }} GeometryPageDiagramSpec
 */

/** @type {Record<string, Record<string, GeometryPageDiagramSpec>>} */
export const GEOMETRY_PAGE_DIAGRAM_BY_GRADE = Object.freeze({
  g1: Object.freeze({
    shapes_basic_square: {
      diagramType: "square_sides",
      topicHe: "הכרת הריבוע",
      conceptHe: "ריבוע - צלעות שוות",
    },
    shapes_basic_rectangle: {
      diagramType: "rectangle_sides",
      topicHe: "הכרת המלבן",
      conceptHe: "מלבן - אורך ורוחב",
    },
    transformations: {
      diagramType: null,
      topicHe: "הזזה ושיקוף",
      conceptHe: "טרנספורמציה - אין דיאגרמה בטוחה עדיין",
    },
  }),
  g2: Object.freeze({
    solids: {
      diagramType: "cube_basic",
      topicHe: "גופים תלת ממדיים",
      conceptHe: "קובייה / תיבה פשוטה",
    },
    square_area: {
      diagramType: "square_area_grid",
      topicHe: "שטח ריבוע",
      conceptHe: "ריבוע עם ריבועי יחידה",
    },
    transformations: {
      diagramType: null,
      topicHe: "הזזה ושיקוף",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
  }),
  g3: Object.freeze({
    triangles: {
      diagramType: "triangle_parts",
      topicHe: "סוגי משולשים",
      conceptHe: "משולש - צלעות וקודקודים",
    },
    quadrilaterals: {
      diagramType: "quadrilateral_parts",
      topicHe: "סוגי מרובעים",
      conceptHe: "מרובע - צלעות וקודקודים",
    },
    parallel_perpendicular: {
      diagramType: "parallel_lines",
      topicHe: "מקבילות ומאונכות",
      conceptHe: "קווים מקבילים",
    },
    square_area: {
      diagramType: "square_area_grid",
      topicHe: "שטח ריבוע",
      conceptHe: "ריבוע עם ריבועי יחידה",
    },
    square_perimeter: {
      diagramType: "square_perimeter",
      topicHe: "היקף ריבוע",
      conceptHe: "היקף - מסביב לריבוע",
    },
    triangle_perimeter: {
      diagramType: "triangle_perimeter",
      topicHe: "היקף משולש",
      conceptHe: "היקף - מסביב למשולש",
    },
    triangle_angles: {
      diagramType: "angle_basic",
      topicHe: "זוויות במשולש",
      conceptHe: "זווית עם קרניים",
    },
    rotation: {
      diagramType: null,
      topicHe: "סיבוב במישור",
      conceptHe: "סיבוב - אין דיאגרמה בטוחה עדיין",
    },
    solids: {
      diagramType: "cube_basic",
      topicHe: "גופים",
      conceptHe: "קובייה / תיבה",
    },
  }),
  g4: Object.freeze({
    shapes_basic_properties_square: {
      diagramType: "square_sides",
      topicHe: "תכונות הריבוע",
      conceptHe: "ריבוע - צלעות",
    },
    shapes_basic_properties_rectangle: {
      diagramType: "rectangle_sides",
      topicHe: "תכונות המלבן",
      conceptHe: "מלבן - אורך ורוחב",
    },
    shapes_basic_properties_angles: {
      diagramType: "right_angle",
      topicHe: "זוויות ישרות",
      conceptHe: "זווית ישרה",
    },
    symmetry: {
      diagramType: "symmetry_line",
      topicHe: "סימטריה",
      conceptHe: "קו סימטריה",
    },
    quadrilaterals: {
      diagramType: "quadrilateral_parts",
      topicHe: "מרובעים",
      conceptHe: "מרובע - סיווג",
    },
    parallel_perpendicular: {
      diagramType: "parallel_lines",
      topicHe: "מקבילות ומאונכות",
      conceptHe: "קווים מקבילים",
    },
    square_perimeter: {
      diagramType: "square_perimeter",
      topicHe: "היקף ריבוע",
      conceptHe: "היקף - ריבוע",
    },
    square_area: {
      diagramType: "square_area_grid",
      topicHe: "שטח ריבוע",
      conceptHe: "ריבוע עם ריבועי יחידה",
    },
    triangle_perimeter: {
      diagramType: "triangle_perimeter",
      topicHe: "היקף משולש",
      conceptHe: "היקף - משולש",
    },
    triangle_angles: {
      diagramType: "angle_basic",
      topicHe: "זוויות במשולש",
      conceptHe: "זווית",
    },
    diagonal_square: {
      diagramType: "square_diagonal",
      topicHe: "אלכסון בריבוע",
      conceptHe: "ריבוע עם אלכסון",
    },
    diagonal_rectangle: {
      diagramType: "rectangle_diagonal",
      topicHe: "אלכסון במלבן",
      conceptHe: "מלבן עם אלכסון",
    },
    solids: {
      diagramType: "cube_basic",
      topicHe: "גופים",
      conceptHe: "קובייה / תיבה",
    },
    rectangular_prism_volume: {
      diagramType: "box_basic",
      topicHe: "נפח תיבה",
      conceptHe: "תיבה תלת ממדית",
    },
  }),
  g5: Object.freeze({
    parallel_perpendicular: {
      diagramType: "parallel_lines",
      topicHe: "מקבילות ומאונכות",
      conceptHe: "קווים מקבילים",
    },
    quadrilaterals: {
      diagramType: "quadrilateral_parts",
      topicHe: "סיווג מרובעים",
      conceptHe: "מרובע",
    },
    triangle_angles: {
      diagramType: "angle_basic",
      topicHe: "זוויות במשולש",
      conceptHe: "זווית",
    },
    square_perimeter: {
      diagramType: "square_perimeter",
      topicHe: "היקף ריבוע",
      conceptHe: "היקף - ריבוע",
    },
    triangle_perimeter: {
      diagramType: "triangle_perimeter",
      topicHe: "היקף משולש",
      conceptHe: "היקף - משולש",
    },
    square_area: {
      diagramType: "square_area_grid",
      topicHe: "שטח ריבוע",
      conceptHe: "ריבוע עם ריבועי יחידה",
    },
    triangle_area: {
      diagramType: "triangle_height",
      topicHe: "שטח משולש",
      conceptHe: "משולש - בסיס וגובה",
    },
    parallelogram_area: {
      diagramType: "parallelogram_area",
      topicHe: "שטח מקבילית",
      conceptHe: "מקבילית - בסיס וגובה",
    },
    trapezoid_area: {
      diagramType: "trapezoid_area",
      topicHe: "שטח טרפז",
      conceptHe: "טרפז - בסיס וגובה",
    },
    heights_triangle: {
      diagramType: "triangle_height",
      topicHe: "גובה במשולש",
      conceptHe: "משולש עם קו גובה",
    },
    heights_parallelogram: {
      diagramType: "parallelogram_height",
      topicHe: "גובה במקבילית",
      conceptHe: "מקבילית עם קו גובה",
    },
    heights_trapezoid: {
      diagramType: "trapezoid_height",
      topicHe: "גובה בטרפז",
      conceptHe: "טרפז עם קו גובה",
    },
    diagonal_square: {
      diagramType: "square_diagonal",
      topicHe: "אלכסון בריבוע",
      conceptHe: "ריבוע עם אלכסון",
    },
    diagonal_rectangle: {
      diagramType: "rectangle_diagonal",
      topicHe: "אלכסון במלבן",
      conceptHe: "מלבן עם אלכסון",
    },
    diagonal_parallelogram: {
      diagramType: "parallelogram_diagonal",
      topicHe: "אלכסון במקבילית",
      conceptHe: "מקבילית עם אלכסון",
    },
    solids: {
      diagramType: "cube_basic",
      topicHe: "גופים",
      conceptHe: "קובייה / תיבה",
    },
    rectangular_prism_volume: {
      diagramType: "box_basic",
      topicHe: "נפח תיבה",
      conceptHe: "תיבה",
    },
    tiling: {
      diagramType: null,
      topicHe: "ריצוף",
      conceptHe: "ריצוף - אין דיאגרמה בטוחה עדיין",
    },
  }),
  g6: Object.freeze({
    square_perimeter: {
      diagramType: "square_perimeter",
      topicHe: "היקף ריבוע",
      conceptHe: "היקף - ריבוע",
    },
    triangle_perimeter: {
      diagramType: "triangle_perimeter",
      topicHe: "היקף משולש",
      conceptHe: "היקף - משולש",
    },
    square_area: {
      diagramType: "square_area_grid",
      topicHe: "שטח ריבוע",
      conceptHe: "ריבוע עם ריבועי יחידה",
    },
    parallelogram_area: {
      diagramType: "parallelogram_area",
      topicHe: "שטח מקבילית",
      conceptHe: "מקבילית - בסיס וגובה",
    },
    trapezoid_area: {
      diagramType: "trapezoid_area",
      topicHe: "שטח טרפז",
      conceptHe: "טרפז - בסיס וגובה",
    },
    triangle_angles: {
      diagramType: "angle_basic",
      topicHe: "זוויות במשולש",
      conceptHe: "זווית",
    },
    circle_perimeter: {
      diagramType: "circle_perimeter",
      topicHe: "היקף מעגל",
      conceptHe: "מעגל - היקף מקווקו + רדיוס",
    },
    circle_area: {
      diagramType: "circle_area",
      topicHe: "שטח עיגול",
      conceptHe: "מעגל - שטח + רדיוס",
    },
    pythagoras_hyp: {
      diagramType: "right_triangle",
      topicHe: "משפט פיתגורס - יתר",
      conceptHe: "משולש ישר זווית",
    },
    pythagoras_leg: {
      diagramType: "right_triangle",
      topicHe: "משפט פיתגורס - ניצב",
      conceptHe: "משולש ישר זווית",
    },
    solids: {
      diagramType: null,
      topicHe: "גליל, פירמידה, חרוט, כדור",
      conceptHe: "מגוון גופים - אין דיאגרמה אחת בטוחה",
    },
    rectangular_prism_volume: {
      diagramType: "box_basic",
      topicHe: "נפח תיבה",
      conceptHe: "תיבה",
    },
    prism_volume_rectangular: {
      diagramType: "box_basic",
      topicHe: "נפח מנסרה - בסיס מלבן",
      conceptHe: "תיבה / מנסרה",
    },
    prism_volume_triangle: {
      diagramType: null,
      topicHe: "נפח מנסרה - בסיס משולש",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
    pyramid_volume_square: {
      diagramType: null,
      topicHe: "נפח פירמידה",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
    pyramid_volume_rectangular: {
      diagramType: null,
      topicHe: "נפח פירמידה",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
    cylinder_volume: {
      diagramType: null,
      topicHe: "נפח גליל",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
    cone_volume: {
      diagramType: null,
      topicHe: "נפח חרוט",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
    sphere_volume: {
      diagramType: null,
      topicHe: "נפח כדור",
      conceptHe: "אין דיאגרמה בטוחה עדיין",
    },
  }),
});

/** Which shape family each diagram type represents (for mismatch detection). */
export const GEOMETRY_DIAGRAM_SHAPE_FAMILY = Object.freeze({
  triangle_parts: "triangle",
  triangle_perimeter: "triangle",
  triangle_height: "triangle",
  angle_basic: "angle",
  right_angle: "angle",
  right_triangle: "triangle",
  quadrilateral_parts: "quadrilateral",
  rectangle_sides: "rectangle",
  rectangle_diagonal: "rectangle",
  square_sides: "square",
  square_perimeter: "square",
  square_area_grid: "square",
  square_diagonal: "square",
  parallelogram_area: "parallelogram",
  parallelogram_height: "parallelogram",
  parallelogram_diagonal: "parallelogram",
  trapezoid_area: "trapezoid",
  trapezoid_height: "trapezoid",
  symmetry_line: "triangle",
  parallel_lines: "lines",
  circle_radius: "circle",
  circle_perimeter: "circle",
  circle_area: "circle",
  cube_basic: "solid",
  box_basic: "solid",
  perimeter_path: "rectangle",
  area_grid: "square",
});

/** Page IDs that must use a given shape family when a diagram is present. */
export const GEOMETRY_PAGE_SHAPE_REQUIREMENT = Object.freeze({
  triangle_perimeter: "triangle",
  heights_triangle: "triangle",
  square_perimeter: "square",
  square_area: "square",
  shapes_basic_square: "square",
  shapes_basic_properties_square: "square",
  diagonal_square: "square",
  shapes_basic_rectangle: "rectangle",
  shapes_basic_properties_rectangle: "rectangle",
  diagonal_rectangle: "rectangle",
  parallelogram_area: "parallelogram",
  heights_parallelogram: "parallelogram",
  diagonal_parallelogram: "parallelogram",
  trapezoid_area: "trapezoid",
  heights_trapezoid: "trapezoid",
  circle_perimeter: "circle",
  circle_area: "circle",
  triangles: "triangle",
  symmetry: "triangle",
});

/**
 * @param {string} grade
 * @param {string} pageId
 * @returns {GeometryPageDiagramSpec | null}
 */
export function getGeometryPageDiagramSpec(grade, pageId) {
  return GEOMETRY_PAGE_DIAGRAM_BY_GRADE[String(grade)]?.[String(pageId)] ?? null;
}

/**
 * @param {string} grade
 * @param {string} pageId
 * @returns {string | null}
 */
export function getRequiredGeometryDiagramType(grade, pageId) {
  return getGeometryPageDiagramSpec(grade, pageId)?.diagramType ?? null;
}

/**
 * @param {string} pageId
 * @param {string} diagramType
 * @returns {boolean}
 */
export function isDiagramShapeMismatch(pageId, diagramType) {
  if (!diagramType) return false;
  const required = GEOMETRY_PAGE_SHAPE_REQUIREMENT[pageId];
  if (!required) return false;
  const family = GEOMETRY_DIAGRAM_SHAPE_FAMILY[diagramType];
  if (!family) return true;
  if (required === "triangle" && family !== "triangle" && family !== "angle") {
    return true;
  }
  return family !== required && !(required === "angle" && family === "angle");
}
