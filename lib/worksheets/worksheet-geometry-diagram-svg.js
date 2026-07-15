/**
 * Static geometry diagram SVG for worksheet print/preview (client + server safe).
 * @module lib/worksheets/worksheet-geometry-diagram-svg
 */

import {
  scaleBaseToHeight,
  scaleCircleRadius,
  scaleLengthToWidth,
  scaleSquareSide,
  scaleTrapezoid,
  scalePythagorasLegs,
} from "../../utils/geometry-diagram-scale.js";
import {
  getShapeTemplatePolygon,
  shapeTemplatePointsString,
  triangleLayoutFromAngles,
} from "../../utils/geometry-diagram-layout.js";
import { isGeometryDiagramKindPrintSupported } from "./worksheet-geometry-allowlist.js";
import { renderSolidDiagramSvgInner } from "./worksheet-geometry-solid-svg.js";

const VIEW_W = 200;
const VIEW_H = 160;
const ORIGIN_X = 100;
const ORIGIN_Y = 130;

/**
 * @param {number} n
 */
function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  const num = Number(n);
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

const UNIT_CM = "ס״מ";

/**
 * @param {{ inkSave?: boolean }} [opts]
 */
function svgStyles(opts = {}) {
  const stroke = "#111";
  const fill = opts.inkSave ? "none" : "rgba(0,0,0,0.05)";
  // Slightly lighter than stroke so dim labels read as regular, not bold ink.
  const text = "#374151";
  return { stroke, fill, text };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {{ text: string }} st
 * @param {{ fontSize?: number, weight?: number, anchor?: string }} [opts]
 */
function dimLabel(x, y, label, st, opts = {}) {
  if (!label) return "";
  const fontSize = opts.fontSize ?? 11;
  const weight = opts.weight ?? 400;
  const anchor = opts.anchor ?? "middle";
  // Explicit style beats HTML ancestor font-weight inheritance into SVG.
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fontSize}" font-weight="${weight}" fill="${st.text}" font-family="Arial, Helvetica, sans-serif" style="font-weight:${weight};font-synthesis:none">${label}</text>`;
}

/**
 * Dimension as separate LTR pieces: number left, unit right (visual "13 ס״מ").
 * Avoids Hebrew BiDi reversing a single "13 ס״מ" string inside SVG.
 * @param {number} x center of the pair
 * @param {number} y
 * @param {number|string|null|undefined} value
 * @param {{ text: string }} st
 * @param {{ fontSize?: number, weight?: number, gap?: number, unit?: string, prefix?: string }} [opts]
 */
function dimMeasure(x, y, value, st, opts = {}) {
  if (value === "?" || value === "？") {
    return dimLabel(x, y, "?", st, opts);
  }
  const display = typeof value === "string" ? value.trim() : fmt(value);
  if (!display) return "";
  const unit = opts.unit ?? UNIT_CM;
  const gap = opts.gap ?? 4;
  const prefix = opts.prefix || "";
  return (
    dimLabel(x - gap / 2, y, `${prefix}${display}`, st, { ...opts, anchor: "end" }) +
    dimLabel(x + gap / 2, y, unit, st, { ...opts, anchor: "start" })
  );
}

/**
 * Angle label near a triangle vertex (inset toward centroid, weight 400).
 * @param {{ x: number, y: number }} vertex
 * @param {{ x: number, y: number }} centroid
 * @param {string} label
 * @param {{ text: string }} st
 * @param {{ x?: number, y?: number }} [nudge]
 */
function angleDimLabel(vertex, centroid, label, st, nudge = {}) {
  const f = 0.2;
  const x = vertex.x + (centroid.x - vertex.x) * f + (nudge.x ?? 0);
  const y = vertex.y + (centroid.y - vertex.y) * f + (nudge.y ?? 0);
  return dimLabel(x, y, label, st, { fontSize: 12, weight: 400 });
}

/**
 * Right-angle mark at corner (foot of height / Pythagoras).
 * @param {number} x
 * @param {number} y
 * @param {number} [size]
 * @param {{ stroke: string }} st
 */
function rightAngleMark(x, y, size = 10, st) {
  return `<path d="M ${x} ${y - size} L ${x + size} ${y - size} L ${x + size} ${y}" fill="none" stroke="${st.stroke}" stroke-width="1.4"/>`;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} cols
 * @param {number} rows
 * @param {{ stroke: string }} st
 */
function gridOverlay(x, y, w, h, cols, rows, st) {
  const c = Math.max(1, Math.min(12, Math.round(cols) || 1));
  const r = Math.max(1, Math.min(12, Math.round(rows) || 1));
  /** @type {string[]} */
  const lines = [];
  for (let i = 1; i < c; i += 1) {
    const gx = x + (w * i) / c;
    lines.push(
      `<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="${st.stroke}" stroke-width="0.7" opacity="0.55"/>`
    );
  }
  for (let j = 1; j < r; j += 1) {
    const gy = y + (h * j) / r;
    lines.push(
      `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="${st.stroke}" stroke-width="0.7" opacity="0.55"/>`
    );
  }
  return lines.join("\n");
}

/**
 * Arrowhead marker for rotation / transform.
 * @param {string} id
 * @param {{ stroke: string }} st
 */
function arrowMarker(id, st) {
  return `<defs><marker id="${id}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0 0, 7 3.5, 0 7" fill="${st.stroke}"/></marker></defs>`;
}

/**
 * @param {{ x0: number, y0: number, x1: number, y1: number, x2: number, y2: number }} pts
 * @param {number} targetX
 * @param {number} targetY
 */
function centerTriangleVerts(pts, targetX, targetY) {
  const xs = [pts.x0, pts.x1, pts.x2];
  const ys = [pts.y0, pts.y1, pts.y2];
  const tcx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const tcy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const dx = targetX - tcx;
  const dy = targetY - tcy;
  return {
    x0: pts.x0 + dx,
    y0: pts.y0 + dy,
    x1: pts.x1 + dx,
    y1: pts.y1 + dy,
    x2: pts.x2 + dx,
    y2: pts.y2 + dy,
    points: `${pts.x0 + dx},${pts.y0 + dy} ${pts.x1 + dx},${pts.y1 + dy} ${pts.x2 + dx},${pts.y2 + dy}`,
  };
}

/**
 * Midpoint of two points.
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 */
function mid(ax, ay, bx, by) {
  return { x: (ax + bx) / 2, y: (ay + by) / 2 };
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetDiagramSpec} spec
 * @param {{ inkSave?: boolean }} [opts]
 * @returns {string}
 */
export function renderGeometryDiagramSvgInner(spec, opts = {}) {
  if (!spec?.kind || !isGeometryDiagramKindPrintSupported(spec.kind)) return "";
  const st = svgStyles(opts);
  const kind = spec.kind;
  const mode = String(spec.mode || "");

  // —— Square ——
  if (kind === "square") {
    if (mode === "identify" || spec.side == null) {
      const points = shapeTemplatePointsString("square", { x: ORIGIN_X, y: 95 });
      return points
        ? `<polygon points="${points}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`
        : "";
    }
    const { w } = scaleSquareSide(Number(spec.side), { maxW: 120, maxH: 120 });
    const x = ORIGIN_X - w / 2;
    const y = ORIGIN_Y - w;
    const grid =
      spec.grid === true
        ? gridOverlay(
            x,
            y,
            w,
            w,
            Number(spec.gridCols) || Number(spec.side) || 4,
            Number(spec.gridRows) || Number(spec.side) || 4,
            st
          )
        : "";
    return `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${grid}
${dimMeasure(ORIGIN_X, y - 6, spec.side, st)}
${dimMeasure(x - 14, y + w / 2, spec.side, st)}`;
  }

  // —— Rectangle ——
  if (kind === "rectangle") {
    if (mode === "identify" || spec.length == null || spec.width == null) {
      const points = shapeTemplatePointsString("rectangle", { x: ORIGIN_X, y: 90 });
      return points
        ? `<polygon points="${points}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`
        : "";
    }
    const { w, h } = scaleLengthToWidth(Number(spec.length), Number(spec.width), {
      maxW: 140,
      maxH: 90,
    });
    const x = ORIGIN_X - w / 2;
    const y = ORIGIN_Y - h;
    const grid =
      spec.grid === true
        ? gridOverlay(
            x,
            y,
            w,
            h,
            Number(spec.gridCols) || Number(spec.length) || 4,
            Number(spec.gridRows) || Number(spec.width) || 3,
            st
          )
        : "";
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${grid}
${dimMeasure(ORIGIN_X, y - 6, spec.length, st)}
${dimMeasure(x - 12, y + h / 2, spec.width, st)}`;
  }

  // —— Triangle (area / height) ——
  if (kind === "triangle" && spec.base != null && spec.height != null) {
    const { w, h } = scaleBaseToHeight(Number(spec.base), Number(spec.height), {
      maxW: 140,
      maxH: 100,
    });
    const x0 = ORIGIN_X - w / 2;
    const y0 = ORIGIN_Y;
    const pts = `${x0},${y0} ${x0 + w},${y0} ${ORIGIN_X},${y0 - h}`;
    const heightLine = `<line x1="${ORIGIN_X}" y1="${y0}" x2="${ORIGIN_X}" y2="${y0 - h}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    const rightMk =
      mode === "height" || spec.hideHeight
        ? rightAngleMark(ORIGIN_X, y0, 9, st)
        : "";
    const heightLbl = spec.hideHeight
      ? dimLabel(ORIGIN_X + 14, y0 - h / 2, "?", st)
      : dimMeasure(ORIGIN_X + 14, y0 - h / 2, spec.height, st);
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${heightLine}
${rightMk}
${dimMeasure(ORIGIN_X, y0 + 14, spec.base, st)}
${heightLbl}`;
  }

  // —— Circle ——
  if (kind === "circle" && spec.radius != null) {
    const r = scaleCircleRadius(Number(spec.radius), { maxR: 55 });
    const cx = ORIGIN_X;
    const cy = ORIGIN_Y - r;
    const isPerimeter = mode === "perimeter";
    const radiusLine = `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${st.stroke}" stroke-width="1.4"/>
<circle cx="${cx}" cy="${cy}" r="2.2" fill="${st.stroke}"/>`;
    const diameterLine = isPerimeter
      ? `<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>`
      : "";
    const label = dimMeasure(cx, cy + r + 14, spec.radius, st, { prefix: "r=" });
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${diameterLine}
${radiusLine}
${label}`;
  }

  // —— Parallelogram ——
  if (kind === "parallelogram" && spec.base != null && spec.height != null) {
    const { w, h } = scaleBaseToHeight(Number(spec.base), Number(spec.height));
    const skew = Math.min(24, w * 0.2);
    const x0 = ORIGIN_X - w / 2;
    const y0 = ORIGIN_Y;
    const pts = `${x0 + skew},${y0 - h} ${x0 + w + skew},${y0 - h} ${x0 + w},${y0} ${x0},${y0}`;
    const heightX = x0 + 8;
    const rightMk =
      mode === "height" || spec.hideHeight
        ? rightAngleMark(heightX, y0, 8, st)
        : "";
    const heightLbl = spec.hideHeight
      ? dimLabel(heightX + 14, y0 - h / 2, "?", st)
      : dimMeasure(heightX + 14, y0 - h / 2, spec.height, st);
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${heightX}" y1="${y0}" x2="${heightX}" y2="${y0 - h}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>
${rightMk}
${dimMeasure(ORIGIN_X, y0 + 14, spec.base, st)}
${heightLbl}`;
  }

  // —— Trapezoid ——
  if (
    kind === "trapezoid" &&
    spec.base1 != null &&
    spec.base2 != null &&
    spec.height != null
  ) {
    const { bottomW, topW, h } = scaleTrapezoid(
      Number(spec.base1),
      Number(spec.base2),
      Number(spec.height)
    );
    const x0 = ORIGIN_X - bottomW / 2;
    const y0 = ORIGIN_Y;
    const xTop = ORIGIN_X - topW / 2;
    const pts = `${x0},${y0} ${x0 + bottomW},${y0} ${xTop + topW},${y0 - h} ${xTop},${y0 - h}`;
    const rightMk =
      mode === "height" || spec.hideHeight
        ? rightAngleMark(ORIGIN_X, y0, 8, st)
        : "";
    const heightLbl = spec.hideHeight
      ? dimLabel(ORIGIN_X + 16, y0 - h / 2, "?", st)
      : dimMeasure(ORIGIN_X + 16, y0 - h / 2, spec.height, st);
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${ORIGIN_X}" y1="${y0}" x2="${ORIGIN_X}" y2="${y0 - h}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>
${rightMk}
${dimMeasure(ORIGIN_X, y0 + 14, spec.base1, st)}
${dimMeasure(ORIGIN_X, y0 - h - 6, spec.base2, st)}
${heightLbl}`;
  }

  // —— Triangle angles ——
  if (
    kind === "triangle_angles" &&
    spec.angle1 != null &&
    spec.angle2 != null &&
    spec.angle3 != null
  ) {
    const hideThird = spec.hideAngle3 === true;
    const layout = triangleLayoutFromAngles(
      Number(spec.angle1),
      Number(spec.angle2),
      Number(spec.angle3),
      {
        maxW: 150,
        maxH: 105,
        minH: 65,
        centerX: ORIGIN_X,
        centerY: 88,
        hiddenAngle: hideThird ? "angle3" : undefined,
      }
    );
    const [v1, v2, v3] = layout.vertices;
    const c = layout.centroid;
    const a1 = `${spec.angle1}°`;
    const a2 = `${spec.angle2}°`;
    const a3 = hideThird ? "?" : `${spec.angle3}°`;
    return `<polygon points="${layout.pointsString}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${angleDimLabel(v1, c, a1, st, { x: 4, y: 2 })}
${angleDimLabel(v2, c, a2, st, { x: -4, y: 2 })}
${angleDimLabel(v3, c, a3, st, { x: 0, y: 6 })}`;
  }

  // —— Triangle perimeter ——
  // Schematic triangle (normalized). Side lengths are labels only — never raw coords.
  if (
    kind === "triangle_perimeter" &&
    spec.side1 != null &&
    spec.side2 != null &&
    spec.side3 != null
  ) {
    const verts = {
      x0: 42,
      y0: 128,
      x1: 158,
      y1: 128,
      x2: 108,
      y2: 38,
    };
    const c = centerTriangleVerts(verts, ORIGIN_X, 88);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const m01 = mid(c.x0, c.y0, c.x1, c.y1);
    const m12 = mid(c.x1, c.y1, c.x2, c.y2);
    const m20 = mid(c.x2, c.y2, c.x0, c.y0);
    return `<polygon points="${c.points}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimMeasure(clamp(m01.x, 28, 172), clamp(m01.y + 14, 22, 148), spec.side1, st)}
${dimMeasure(clamp(m12.x + 14, 28, 172), clamp(m12.y, 22, 148), spec.side2, st)}
${dimMeasure(clamp(m20.x - 14, 28, 172), clamp(m20.y, 22, 148), spec.side3, st)}`;
  }

  // —— Shape template (identify triangles / quads / polygons) ——
  if (kind === "shape_template" && spec.template) {
    const template = String(spec.template);
    const poly = getShapeTemplatePolygon(template, { x: ORIGIN_X, y: 90 });
    const pts = poly.map((p) => `${p.x},${p.y}`).join(" ");
    /** @type {string[]} */
    const marks = [];
    const tickOn = (i, j) => {
      const a = poly[i];
      const b = poly[j];
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 5;
      const ny = (dx / len) * 5;
      marks.push(
        `<line x1="${mx - nx}" y1="${my - ny}" x2="${mx + nx}" y2="${my + ny}" stroke="${st.stroke}" stroke-width="1.4"/>`
      );
    };
    if (template === "triangle_equilateral") {
      tickOn(0, 1);
      tickOn(1, 2);
      tickOn(2, 0);
    } else if (template === "triangle_isosceles") {
      tickOn(0, 1);
      tickOn(0, 2);
    } else if (template === "rhombus") {
      tickOn(0, 1);
      tickOn(1, 2);
      tickOn(2, 3);
      tickOn(3, 0);
    } else if (template === "kite") {
      tickOn(0, 1);
      tickOn(0, 3);
      tickOn(1, 2);
      tickOn(3, 2);
    }
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${marks.join("\n")}`;
  }

  // —— Parallel / perpendicular ——
  if (kind === "parallel_lines") {
    if (mode === "perpendicular") {
      return `<line x1="30" y1="110" x2="170" y2="110" stroke="${st.stroke}" stroke-width="2.2"/>
<line x1="100" y1="125" x2="100" y2="40" stroke="${st.stroke}" stroke-width="2.2"/>
${rightAngleMark(100, 110, 11, st)}`;
    }
    // Parallel: tick marks on both lines.
    return `<line x1="30" y1="60" x2="170" y2="60" stroke="${st.stroke}" stroke-width="2.2"/>
<line x1="30" y1="105" x2="170" y2="105" stroke="${st.stroke}" stroke-width="2.2"/>
<line x1="88" y1="54" x2="96" y2="66" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="96" y1="54" x2="104" y2="66" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="88" y1="99" x2="96" y2="111" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="96" y1="99" x2="104" y2="111" stroke="${st.stroke}" stroke-width="1.6"/>`;
  }

  // —— Diagonal ——
  if (kind === "diagonal") {
    const shape = String(spec.shape || "square");
    let w = 80;
    let h = 80;
    if (shape === "rectangle") {
      if (typeof spec.side === "number" && typeof spec.width === "number") {
        const scaled = scaleLengthToWidth(Number(spec.side), Number(spec.width), {
          maxW: 130,
          maxH: 80,
        });
        w = scaled.w;
        h = scaled.h;
      } else {
        w = 120;
        h = 60;
      }
    } else if (shape === "parallelogram") {
      w = 110;
      h = 65;
    } else if (typeof spec.side === "number") {
      const scaled = scaleSquareSide(Number(spec.side), { maxW: 100, maxH: 100 });
      w = scaled.w;
      h = scaled.w;
    }
    const x = ORIGIN_X - w / 2;
    const y = ORIGIN_Y - h;
    const skew = shape === "parallelogram" ? Math.min(22, w * 0.18) : 0;
    const body =
      shape === "parallelogram"
        ? `<polygon points="${x + skew},${y} ${x + w + skew},${y} ${x + w},${y + h} ${x},${y + h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`
        : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
    const ax = x;
    const ay = y + h;
    const bx = x + w + skew;
    const by = y;
    const diagonal = `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${st.stroke}" stroke-width="2" stroke-dasharray="4 3"/>`;
    const diagMeasure = spec.hideDiagonal
      ? dimLabel((ax + bx) / 2 + 10, (ay + by) / 2 - 4, "?", st)
      : dimMeasure((ax + bx) / 2 + 10, (ay + by) / 2 - 4, spec.diagonal, st);
    const sideLabels =
      shape === "rectangle" && typeof spec.side === "number" && typeof spec.width === "number"
        ? `${dimMeasure(ORIGIN_X, y + h + 14, spec.side, st)}
${dimMeasure(x - 12, y + h / 2, spec.width, st)}`
        : typeof spec.side === "number" && shape === "square"
          ? dimMeasure(ORIGIN_X, y + h + 14, spec.side, st)
          : "";
    // Vertex letters when asking which diagonal (identify mode).
    const letters =
      mode === "identify" || String(spec.which || "")
        ? `<text x="${ax - 8}" y="${ay + 4}" font-size="11" fill="${st.text}">A</text>
<text x="${bx + 4}" y="${by + 4}" font-size="11" fill="${st.text}">C</text>
<text x="${x + w + skew + 4}" y="${y + h + 4}" font-size="11" fill="${st.text}">B</text>
<text x="${x + skew - 10}" y="${y + 4}" font-size="11" fill="${st.text}">D</text>`
        : "";
    return `${body}
${diagonal}
${letters}
${sideLabels}
${diagMeasure}`;
  }

  // —— Symmetry ——
  if (kind === "symmetry") {
    const template = String(spec.template || "square");
    const axesCount = Math.max(1, Math.min(4, Number(spec.axes) || 1));
    let shapeSvg = "";
    if (template === "rectangle" || template.includes("rectangle")) {
      shapeSvg = `<rect x="55" y="50" width="90" height="55" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
    } else if (template.includes("triangle") || template.includes("equilateral")) {
      shapeSvg = `<polygon points="100,45 145,115 55,115" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
    } else {
      shapeSvg = `<rect x="60" y="45" width="80" height="80" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
    }
    /** @type {string[]} */
    const axes = [];
    // Vertical
    axes.push(
      `<line x1="100" y1="35" x2="100" y2="135" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>`
    );
    if (axesCount >= 2) {
      // Horizontal
      axes.push(
        `<line x1="45" y1="85" x2="155" y2="85" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>`
      );
    }
    if (axesCount >= 3) {
      axes.push(
        `<line x1="55" y1="45" x2="145" y2="125" stroke="${st.stroke}" stroke-width="1.3" stroke-dasharray="5 4"/>`
      );
    }
    if (axesCount >= 4) {
      axes.push(
        `<line x1="145" y1="45" x2="55" y2="125" stroke="${st.stroke}" stroke-width="1.3" stroke-dasharray="5 4"/>`
      );
    }
    return `${shapeSvg}
${axes.join("\n")}`;
  }

  // —— Rotation ——
  if (kind === "rotation_step") {
    const angle = Number(spec.angle) || 90;
    const markerId = "rotArrow";
    return `${arrowMarker(markerId, st)}
<rect x="70" y="75" width="45" height="45" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<rect x="100" y="45" width="45" height="45" fill="none" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>
<path d="M 92 70 A 18 18 0 0 1 118 55" fill="none" stroke="${st.stroke}" stroke-width="1.6" marker-end="url(#${markerId})"/>
${dimLabel(ORIGIN_X, 140, `${angle}°`, st)}`;
  }

  // —— Translate / reflect ——
  if (kind === "transformation_translate" || kind === "transformation_reflect") {
    const dx = Number(spec.dx);
    const dy = Number(spec.dy);
    const shiftX = Number.isFinite(dx) ? Math.max(-40, Math.min(40, dx)) : 50;
    const shiftY = Number.isFinite(dy) ? Math.max(-30, Math.min(30, dy)) : 0;
    if (kind === "transformation_reflect") {
      return `<rect x="40" y="70" width="40" height="40" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="100" y1="40" x2="100" y2="140" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
<rect x="120" y="70" width="40" height="40" fill="none" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    }
    const x2 = 55 + (Math.abs(shiftX) || 50);
    const y2 = 75 + shiftY;
    const markerId = "trArrow";
    return `${arrowMarker(markerId, st)}
<rect x="40" y="75" width="40" height="40" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<rect x="${x2}" y="${y2}" width="40" height="40" fill="none" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="82" y1="95" x2="${x2 - 4}" y2="${y2 + 20}" stroke="${st.stroke}" stroke-width="1.4" marker-end="url(#${markerId})"/>`;
  }

  // —— Pythagoras ——
  if (kind === "pythagoras" && spec.a != null && spec.b != null) {
    const { w: legB, h: legA } = scalePythagorasLegs(Number(spec.a), Number(spec.b));
    const cx = ORIGIN_X;
    const yb = ORIGIN_Y;
    const x0 = cx - legB / 2;
    const y0 = yb;
    const x1 = x0 + legB;
    const y1 = yb;
    const x2 = x0;
    const y2 = yb - legA;
    const pts = `${x0},${y0} ${x1},${y1} ${x2},${y2}`;
    const hide = String(spec.hideSide || "");
    const hypMidX = (x1 + x2) / 2;
    const hypMidY = (y1 + y2) / 2;
    const measureA =
      hide === "a"
        ? dimLabel(x0 - 14, (y0 + y2) / 2, "?", st)
        : dimMeasure(x0 - 14, (y0 + y2) / 2, spec.a, st);
    const measureB =
      hide === "b"
        ? dimLabel((x0 + x1) / 2, y0 + 14, "?", st)
        : dimMeasure((x0 + x1) / 2, y0 + 14, spec.b, st);
    const measureC =
      hide === "c"
        ? dimLabel(hypMidX + 12, hypMidY, "?", st)
        : spec.c != null
          ? dimMeasure(hypMidX + 12, hypMidY, spec.c, st)
          : "";
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${rightAngleMark(x0, y0, 10, st)}
${measureB}
${measureA}
${measureC}`;
  }

  // —— Tiling (pattern tile or count grid) ——
  if (kind === "tiling") {
    if (mode === "count" && spec.floorL != null && spec.floorW != null && spec.tileSide != null) {
      const floorL = Number(spec.floorL);
      const floorW = Number(spec.floorW);
      const tileSide = Number(spec.tileSide) || 1;
      const { w, h } = scaleLengthToWidth(floorL, floorW, { maxW: 130, maxH: 85 });
      const x = ORIGIN_X - w / 2 - 8;
      const y = ORIGIN_Y - h - 8;
      // Sample tile only (not a full fill) — avoids revealing the tile count.
      const tileScaled = Math.max(
        12,
        Math.min(28, (w * tileSide) / Math.max(floorL, 1))
      );
      const tx = x + 6;
      const ty = y + h - tileScaled - 6;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<rect x="${tx}" y="${ty}" width="${tileScaled}" height="${tileScaled}" fill="none" stroke="${st.stroke}" stroke-width="1.6" stroke-dasharray="3 2"/>
${dimLabel(x + w / 2, y - 6, `${fmt(floorL)}×${fmt(floorW)}`, st)}
${dimLabel(tx + tileScaled / 2, ty - 4, fmt(tileSide), st)}`;
    }
    const cx = ORIGIN_X;
    const cy = 95;
    const tile = String(spec.tile || "square");
    // Small cluster of 3–4 tiles to show pattern (no full floor fill — avoids answering count).
    if (tile === "square" || tile === "rectangle") {
      const s = tile === "rectangle" ? 28 : 32;
      const gap = 2;
      const ox = cx - (s * 2 + gap) / 2;
      const oy = cy - (s * 2 + gap) / 2;
      /** @type {string[]} */
      const tiles = [];
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 2; c += 1) {
          const tw = tile === "rectangle" ? s * 1.4 : s;
          const th = s;
          tiles.push(
            `<rect x="${ox + c * (tw + gap)}" y="${oy + r * (th + gap)}" width="${tw}" height="${th}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.6"/>`
          );
        }
      }
      const angleLabel =
        typeof spec.angle === "number"
          ? dimLabel(cx, oy + s * 2 + gap + 18, spec.hideAngle ? "?" : `${spec.angle}°`, st)
          : "";
      return `${tiles.join("\n")}
${angleLabel}`;
    }
    if (tile === "triangle") {
      const r = 36;
      /** @type {string[]} */
      const tiles = [];
      const centers = [
        { x: cx - 22, y: cy - 8 },
        { x: cx + 22, y: cy - 8 },
        { x: cx, y: cy + 28 },
      ];
      for (const c of centers) {
        const pts = [];
        for (let i = 0; i < 3; i += 1) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
          pts.push(`${c.x + r * Math.cos(a)},${c.y + r * Math.sin(a)}`);
        }
        tiles.push(
          `<polygon points="${pts.join(" ")}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.6"/>`
        );
      }
      const angleLabel =
        typeof spec.angle === "number"
          ? dimLabel(cx, 148, spec.hideAngle ? "?" : `${spec.angle}°`, st)
          : "";
      return `${tiles.join("\n")}
${angleLabel}`;
    }
    if (tile === "hexagon") {
      const r = 22;
      /** @type {string[]} */
      const tiles = [];
      const centers = [
        { x: cx, y: cy - 18 },
        { x: cx - 34, y: cy + 10 },
        { x: cx + 34, y: cy + 10 },
      ];
      for (const c of centers) {
        const pts = [];
        for (let i = 0; i < 6; i += 1) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          pts.push(`${c.x + r * Math.cos(a)},${c.y + r * Math.sin(a)}`);
        }
        tiles.push(
          `<polygon points="${pts.join(" ")}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.6"/>`
        );
      }
      const angleLabel =
        typeof spec.angle === "number"
          ? dimLabel(cx, 148, spec.hideAngle ? "?" : `${spec.angle}°`, st)
          : "";
      return `${tiles.join("\n")}
${angleLabel}`;
    }
    const points =
      tile === "rectangle"
        ? shapeTemplatePointsString("rectangle", { x: cx, y: cy })
        : shapeTemplatePointsString("square", { x: cx, y: cy });
    if (!points) return "";
    const angleLabel =
      typeof spec.angle === "number"
        ? dimLabel(cx, cy + 58, spec.hideAngle ? "?" : `${spec.angle}°`, st)
        : "";
    return `<polygon points="${points}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${angleLabel}`;
  }

  // —— Solids (box / cylinder / sphere / pyramid / cone / prism / identify) ——
  if (
    kind === "solid_box" ||
    kind === "solid_cylinder" ||
    kind === "solid_sphere" ||
    kind === "solid_pyramid" ||
    kind === "solid_cone" ||
    kind === "solid_prism" ||
    kind === "solid_identify"
  ) {
    return renderSolidDiagramSvgInner(spec, st, { dimMeasure, dimLabel });
  }

  return "";
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetDiagramSpec|null|undefined} spec
 * @param {{ inkSave?: boolean }} [opts]
 * @returns {string}
 */
export function renderGeometryDiagramSvgHtml(spec, opts = {}) {
  const inner = renderGeometryDiagramSvgInner(spec, opts);
  if (!inner) return "";
  return `<svg class="worksheet-geometry-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" overflow="hidden" dir="ltr" aria-hidden="true">${inner}</svg>`;
}
