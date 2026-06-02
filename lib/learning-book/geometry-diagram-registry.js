/**
 * Geometry / גאומטריה learning-book diagram types and directive parsing.
 * Child-facing labels are Hebrew only.
 */

/** @typedef {{ type: string, options: Record<string, string> }} GeometryDiagramSpec */

export const GEOMETRY_DIAGRAM_LABELS = Object.freeze({
  side: "צלע",
  vertex: "קודקוד",
  angle: "זווית",
  rightAngle: "זווית ישרה",
  length: "אורך",
  width: "רוחב",
  base: "בסיס",
  height: "גובה",
  perimeter: "היקף",
  area: "שטח",
  symmetryLine: "קו סימטריה",
  parallelLines: "קווים מקבילים",
  radius: "רדיוס",
  diameter: "קוטר",
});

/** @type {readonly string[]} */
export const GEOMETRY_DIAGRAM_TYPE_IDS = Object.freeze([
  "triangle_parts",
  "triangle_perimeter",
  "triangle_height",
  "right_triangle",
  "quadrilateral_parts",
  "rectangle_sides",
  "rectangle_diagonal",
  "square_sides",
  "square_perimeter",
  "square_diagonal",
  "square_area_grid",
  "parallelogram_height",
  "parallelogram_area",
  "parallelogram_diagonal",
  "trapezoid_height",
  "trapezoid_area",
  "right_angle",
  "angle_basic",
  "symmetry_line",
  "parallel_lines",
  "circle_radius",
  "circle_perimeter",
  "circle_area",
  "cube_basic",
  "box_basic",
  "area_grid",
  "perimeter_path",
]);

/** Deprecated types — must not appear in new page mappings. */
export const DEPRECATED_GEOMETRY_DIAGRAM_TYPES = Object.freeze([
  "perimeter_path",
  "area_grid",
]);

const TYPE_SET = new Set(GEOMETRY_DIAGRAM_TYPE_IDS);

export const FORBIDDEN_ENGLISH_DIAGRAM_LABELS = Object.freeze([
  "side",
  "vertex",
  "angle",
  "perimeter",
  "area",
  "parallel",
  "symmetry",
  "width",
  "length",
  "radius",
  "diameter",
  "base",
  "height",
]);

export function isKnownGeometryDiagramType(type) {
  return TYPE_SET.has(String(type || "").trim());
}

export function isDeprecatedGeometryDiagramType(type) {
  return DEPRECATED_GEOMETRY_DIAGRAM_TYPES.includes(String(type || "").trim());
}

export function parseGeometryDiagramDirective(body) {
  const options = {};
  let type = "";

  for (const line of String(body || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim();
    if (key === "type") {
      type = value;
    } else {
      options[key] = value;
    }
  }

  return { type: type.trim(), options };
}

export function geometryDiagramFence(type) {
  return `:::geometry-diagram\ntype: ${type}\n:::`;
}

export function replaceGeometryDiagramInBody(body, diagramType) {
  const normalized = String(body || "").replace(/\r\n/g, "\n");
  const fence = diagramType ? geometryDiagramFence(diagramType) : null;

  if (/:::geometry-diagram[\s\S]*?:::/.test(normalized)) {
    if (!fence) {
      return normalized.replace(/\n?:::geometry-diagram[\s\S]*?:::\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
    }
    return normalized.replace(/:::geometry-diagram[\s\S]*?:::/, fence);
  }

  if (!fence) return normalized;

  for (const n of [2, 3]) {
    const re = new RegExp(`(## ${n}\\. [^\\n]+\\n\\n)`);
    if (re.test(normalized)) {
      return normalized.replace(re, `$1${fence}\n\n`);
    }
  }

  return `${fence}\n\n${normalized}`;
}
