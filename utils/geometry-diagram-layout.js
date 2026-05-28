/**
 * Lightweight visual layout for geometry SVG diagrams.
 * Approximate proportions for elementary readability — not exact construction proofs.
 */

const DEG = Math.PI / 180;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function toPointsString(points) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function inwardLabel(vertex, centroid, distance) {
  const dx = centroid.x - vertex.x;
  const dy = centroid.y - vertex.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: vertex.x + (dx / len) * distance,
    y: vertex.y + (dy / len) * distance,
  };
}

/**
 * Triangle with angle1 at base-left, angle2 at base-right, angle3 at apex.
 * @param {number} angle1
 * @param {number} angle2
 * @param {number} [angle3]
 * @param {{ centerX?: number, centerY?: number, maxW?: number, maxH?: number, minH?: number, labelInset?: number }} [options]
 */
export function triangleLayoutFromAngles(angle1, angle2, angle3, options = {}) {
  const a1 = clamp(Number(angle1) || 60, 14, 152);
  const a2 = clamp(Number(angle2) || 60, 14, 152);
  let a3 = typeof angle3 === "number" ? angle3 : 180 - a1 - a2;
  a3 = clamp(a3, 14, 152);

  const sin1 = Math.sin(a1 * DEG);
  const sin2 = Math.sin(a2 * DEG);
  const sin3 = Math.sin(a3 * DEG) || 1e-6;

  const t = sin2 / sin3;
  const cx = t * Math.cos(a1 * DEG);
  const cy = t * Math.sin(a1 * DEG);

  let x0 = 0;
  let y0 = 0;
  let x1 = 1;
  let y1 = 0;
  let x2 = cx;
  let y2 = cy;

  // Math layout uses y-up; SVG uses y-down — flip before scaling.
  const flipY = Math.max(y0, y1, y2);
  y0 = flipY - y0;
  y1 = flipY - y1;
  y2 = flipY - y2;

  const xs = [x0, x1, x2];
  const ys = [y0, y1, y2];
  const width = Math.max(...xs) - Math.min(...xs) || 1;
  const height = Math.max(...ys) - Math.min(...ys) || 1;

  const maxW = options.maxW ?? 232;
  const maxH = options.maxH ?? 168;
  const minH = options.minH ?? 88;

  let k = Math.min(maxW / width, maxH / height);
  if (height * k < minH) k = minH / height;
  if (width * k > maxW) k = Math.min(k, maxW / width);

  x0 *= k;
  x1 *= k;
  x2 *= k;
  y0 *= k;
  y1 *= k;
  y2 *= k;

  const targetCx = options.centerX ?? 180;
  const targetCy = options.centerY ?? 138;
  const minx = Math.min(x0, x1, x2);
  const maxx = Math.max(x0, x1, x2);
  const miny = Math.min(y0, y1, y2);
  const maxy = Math.max(y0, y1, y2);
  const tx = targetCx - (minx + maxx) / 2;
  const ty = targetCy - (miny + maxy) / 2;

  const vertices = [
    { x: x0 + tx, y: y0 + ty, role: "baseLeft", angle: a1 },
    { x: x1 + tx, y: y1 + ty, role: "baseRight", angle: a2 },
    { x: x2 + tx, y: y2 + ty, role: "apex", angle: a3 },
  ];

  const centroid = {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
  };
  const inset = options.labelInset ?? 42;

  return {
    angle1: a1,
    angle2: a2,
    angle3: a3,
    vertices,
    pointsString: toPointsString(vertices),
    labels: {
      angle1: inwardLabel(vertices[0], centroid, inset),
      angle2: inwardLabel(vertices[1], centroid, inset),
      angle3: inwardLabel(vertices[2], centroid, inset + 4),
    },
  };
}

/** @typedef {'square'|'rectangle'|'parallelogram'|'trapezoid'|'rhombus'|'quadrilateral_general'|'triangle_equilateral'|'triangle_isosceles'|'triangle_scalene'} ShapeTemplateId */

/** Relative polygon templates centered at origin, then shifted to canvas center. */
const SHAPE_POLYGONS = {
  square: [
    { x: -40, y: -40 },
    { x: 40, y: -40 },
    { x: 40, y: 40 },
    { x: -40, y: 40 },
  ],
  rectangle: [
    { x: -72, y: -36 },
    { x: 72, y: -36 },
    { x: 72, y: 36 },
    { x: -72, y: 36 },
  ],
  parallelogram: [
    { x: -78, y: 52 },
    { x: 78, y: 52 },
    { x: 98, y: -52 },
    { x: -58, y: -52 },
  ],
  trapezoid: [
    { x: -92, y: 56 },
    { x: 92, y: 56 },
    { x: 62, y: -56 },
    { x: -62, y: -56 },
  ],
  rhombus: [
    { x: 0, y: -88 },
    { x: 72, y: 0 },
    { x: 0, y: 88 },
    { x: -72, y: 0 },
  ],
  quadrilateral_general: [
    { x: -86, y: 58 },
    { x: 92, y: 46 },
    { x: 74, y: -54 },
    { x: -58, y: -42 },
  ],
  triangle_equilateral: [
    { x: 0, y: -86 },
    { x: -96, y: 78 },
    { x: 96, y: 78 },
  ],
  triangle_isosceles: [
    { x: 0, y: -92 },
    { x: -88, y: 78 },
    { x: 88, y: 78 },
  ],
  triangle_scalene: [
    { x: 24, y: -88 },
    { x: -102, y: 76 },
    { x: 96, y: 68 },
  ],
};

/**
 * @param {ShapeTemplateId|string} templateId
 * @param {{ x?: number, y?: number }} [center]
 */
export function getShapeTemplatePolygon(templateId, center = { x: 180, y: 138 }) {
  const rel = SHAPE_POLYGONS[templateId];
  if (!rel) return null;
  const cx = center.x ?? 180;
  const cy = center.y ?? 138;
  return rel.map((p) => ({ x: cx + p.x, y: cy + p.y }));
}

/**
 * @param {ShapeTemplateId|string} templateId
 * @param {{ x?: number, y?: number }} [center]
 */
export function shapeTemplatePointsString(templateId, center) {
  const pts = getShapeTemplatePolygon(templateId, center);
  return pts ? toPointsString(pts) : null;
}

/** @param {string} [type] */
export function resolveQuadrilateralTemplate(type) {
  const map = {
    ריבוע: "square",
    מלבן: "rectangle",
    מקבילית: "parallelogram",
    טרפז: "trapezoid",
    מעוין: "rhombus",
  };
  return map[type] || "quadrilateral_general";
}

/** @param {string} [type] */
export function resolveTriangleClassTemplate(type) {
  const map = {
    "שווה צלעות": "triangle_equilateral",
    "שווה שוקיים": "triangle_isosceles",
    "שונה צלעות": "triangle_scalene",
  };
  return map[type] || "triangle_scalene";
}

/**
 * Stable fingerprint for structural tests (rounded coords).
 * @param {{ x: number, y: number }[]} points
 */
export function layoutFingerprint(points) {
  return points
    .map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`)
    .join("|");
}

/**
 * Compare width/height span — squares should look more equal than rectangles.
 * @param {{ x: number, y: number }[]} points
 */
export function polygonAspectRatio(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return h > 0 ? w / h : 1;
}
