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

/** @param {{ x: number, y: number }} a @param {{ x: number, y: number }} b */
export function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Place a label inside the triangle by interpolating vertex → centroid.
 * @param {{ x: number, y: number }} vertex
 * @param {{ x: number, y: number }} centroid
 * @param {number} insetFactor 0 = at vertex, 1 = at centroid
 * @param {{ x?: number, y?: number }} [nudge] SVG text baseline tweak
 */
export function labelFromVertexTowardCentroid(vertex, centroid, insetFactor, nudge = {}) {
  const f = clamp(insetFactor, 0.2, 0.58);
  return {
    x: vertex.x + (centroid.x - vertex.x) * f + (nudge.x ?? 0),
    y: vertex.y + (centroid.y - vertex.y) * f + (nudge.y ?? 0),
  };
}

/**
 * @param {{ x: number, y: number, role?: string }[]} vertices
 * @param {{ x: number, y: number }} centroid
 * @param {{ hiddenAngle?: 'angle1'|'angle2'|'angle3' }} [options]
 */
export function computeTriangleAngleLabels(vertices, centroid, options = {}) {
  const [left, right, apex] = vertices;
  const distLeft = distance2d(left, centroid) || 1;
  const distRight = distance2d(right, centroid) || 1;
  const distApex = distance2d(apex, centroid) || 1;

  // Target ~30–38px inset from each corner; factor scales with triangle size.
  const targetPx = { base: 36, apex: 32 };
  const factors = {
    angle1: clamp(targetPx.base / distLeft, 0.26, 0.5),
    angle2: clamp(targetPx.base / distRight, 0.26, 0.5),
    angle3: clamp(targetPx.apex / distApex, 0.3, 0.54),
  };

  const labels = {
    angle1: labelFromVertexTowardCentroid(left, centroid, factors.angle1, { x: 4, y: -5 }),
    angle2: labelFromVertexTowardCentroid(right, centroid, factors.angle2, { x: -4, y: -5 }),
    angle3: labelFromVertexTowardCentroid(apex, centroid, factors.angle3, { x: 0, y: 8 }),
  };

  const hiddenAngle = options.hiddenAngle ?? null;
  const verticesByAngle = { angle1: left, angle2: right, angle3: apex };

  if (hiddenAngle && verticesByAngle[hiddenAngle]) {
    const hiddenInset = clamp(factors[hiddenAngle] * 0.72, 0.22, 0.48);
    const hiddenNudge =
      hiddenAngle === "angle3"
        ? { x: 0, y: 10 }
        : hiddenAngle === "angle1"
          ? { x: 8, y: -2 }
          : { x: -8, y: -2 };
    labels[hiddenAngle] = labelFromVertexTowardCentroid(
      verticesByAngle[hiddenAngle],
      centroid,
      hiddenInset,
      hiddenNudge
    );
  }

  return {
    labels,
    factors,
    hiddenAngle,
    hiddenLabel: hiddenAngle ? labels[hiddenAngle] : null,
    verticesByAngle,
  };
}

/**
 * Triangle with angle1 at base-left, angle2 at base-right, angle3 at apex.
 * @param {number} angle1
 * @param {number} angle2
 * @param {number} [angle3]
 * @param {{ centerX?: number, centerY?: number, maxW?: number, maxH?: number, minH?: number, hiddenAngle?: 'angle1'|'angle2'|'angle3' }} [options]
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
  const labelMeta = computeTriangleAngleLabels(vertices, centroid, {
    hiddenAngle: options.hiddenAngle ?? null,
  });

  return {
    angle1: a1,
    angle2: a2,
    angle3: a3,
    vertices,
    centroid,
    pointsString: toPointsString(vertices),
    labels: labelMeta.labels,
    labelFactors: labelMeta.factors,
    hiddenAngle: labelMeta.hiddenAngle,
    verticesByAngle: labelMeta.verticesByAngle,
  };
}

/** @typedef {'square'|'rectangle'|'parallelogram'|'trapezoid'|'rhombus'|'kite'|'quadrilateral_general'|'triangle_equilateral'|'triangle_isosceles'|'triangle_scalene'|'pentagon_regular'|'hexagon_regular'|'octagon_regular'} ShapeTemplateId */

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
  kite: [
    { x: 0, y: -88 },
    { x: 52, y: -8 },
    { x: 0, y: 88 },
    { x: -52, y: -8 },
  ],
  pentagon_regular: regularPolygonPoints(5, 78),
  hexagon_regular: regularPolygonPoints(6, 78),
  octagon_regular: regularPolygonPoints(8, 72),
};

/**
 * @param {number} n
 * @param {number} r
 * @returns {{ x: number, y: number }[]}
 */
function regularPolygonPoints(n, r) {
  /** @type {{ x: number, y: number }[]} */
  const pts = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < n; i += 1) {
    const a = start + (i * 2 * Math.PI) / n;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

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
    דלתון: "kite",
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
