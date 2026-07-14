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
  triangleVerticesFromSides,
  scalePythagorasLegs,
} from "../../utils/geometry-diagram-scale.js";
import {
  getShapeTemplatePolygon,
  shapeTemplatePointsString,
  triangleLayoutFromAngles,
} from "../../utils/geometry-diagram-layout.js";
import { isGeometryDiagramKindPrintSupported } from "./worksheet-geometry-allowlist.js";

const VIEW_W = 200;
const VIEW_H = 160;
const ORIGIN_X = 100;
const ORIGIN_Y = 130;

/**
 * @param {number} n
 * @param {string} [unit]
 */
function fmt(n, unit = "") {
  if (n == null || !Number.isFinite(n)) return "";
  const v = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  return unit ? `${v} ${unit}` : v;
}

/**
 * @param {{ inkSave?: boolean }} [opts]
 */
function svgStyles(opts = {}) {
  const stroke = "#111";
  const fill = opts.inkSave ? "none" : "rgba(0,0,0,0.05)";
  const text = "#111";
  return { stroke, fill, text };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {{ text: string }} st
 */
function dimLabel(x, y, label, st) {
  if (!label) return "";
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="${st.text}" font-family="system-ui,sans-serif">${label}</text>`;
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
  return `${pts.x0 + dx},${pts.y0 + dy} ${pts.x1 + dx},${pts.y1 + dy} ${pts.x2 + dx},${pts.y2 + dy}`;
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

  if (kind === "square" && spec.side != null) {
    const { w } = scaleSquareSide(Number(spec.side), { maxW: 120, maxH: 120 });
    const x = ORIGIN_X - w / 2;
    const y = ORIGIN_Y - w;
    return `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(ORIGIN_X, y - 6, fmt(spec.side, "ס״מ"), st)}`;
  }

  if (kind === "rectangle" && spec.length != null && spec.width != null) {
    const { w, h } = scaleLengthToWidth(Number(spec.length), Number(spec.width), {
      maxW: 140,
      maxH: 90,
    });
    const x = ORIGIN_X - w / 2;
    const y = ORIGIN_Y - h;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(ORIGIN_X, y - 6, fmt(spec.length, "ס״מ"), st)}
${dimLabel(x - 8, y + h / 2, fmt(spec.width, "ס״מ"), st)}`;
  }

  if (kind === "triangle" && spec.base != null && spec.height != null) {
    const { w, h } = scaleBaseToHeight(Number(spec.base), Number(spec.height), {
      maxW: 140,
      maxH: 100,
    });
    const x0 = ORIGIN_X - w / 2;
    const y0 = ORIGIN_Y;
    const pts = `${x0},${y0} ${x0 + w},${y0} ${ORIGIN_X},${y0 - h}`;
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(ORIGIN_X, y0 + 14, fmt(spec.base, "ס״מ"), st)}
${dimLabel(x0 - 10, y0 - h / 2, fmt(spec.height, "ס״מ"), st)}`;
  }

  if (kind === "circle" && spec.radius != null) {
    const r = scaleCircleRadius(Number(spec.radius), { maxR: 55 });
    const cx = ORIGIN_X;
    const cy = ORIGIN_Y - r;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(cx, cy + r + 14, `r=${fmt(spec.radius, "ס״מ")}`, st)}`;
  }

  if (kind === "parallelogram" && spec.base != null && spec.height != null) {
    const { w, h } = scaleBaseToHeight(Number(spec.base), Number(spec.height));
    const skew = Math.min(24, w * 0.2);
    const x0 = ORIGIN_X - w / 2;
    const y0 = ORIGIN_Y;
    const pts = `${x0 + skew},${y0 - h} ${x0 + w + skew},${y0 - h} ${x0 + w},${y0} ${x0},${y0}`;
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
  }

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
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
  }

  if (
    kind === "triangle_angles" &&
    spec.angle1 != null &&
    spec.angle2 != null &&
    spec.angle3 != null
  ) {
    const layout = triangleLayoutFromAngles(
      Number(spec.angle1),
      Number(spec.angle2),
      Number(spec.angle3),
      { hiddenAngle: spec.hideAngle3 ? 3 : spec.hiddenAngle || undefined }
    );
    const pts = layout.vertices.map((v) => `${v.x * 0.55 + 20},${v.y * 0.55 + 10}`).join(" ");
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
  }

  if (
    kind === "triangle_perimeter" &&
    spec.side1 != null &&
    spec.side2 != null &&
    spec.side3 != null
  ) {
    const verts = triangleVerticesFromSides(
      Number(spec.side1),
      Number(spec.side2),
      Number(spec.side3)
    );
    const pts = centerTriangleVerts(verts, ORIGIN_X, 95);
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(ORIGIN_X, ORIGIN_Y + 8, fmt(spec.side1, "ס״מ"), st)}`;
  }

  if (kind === "shape_template" && spec.template) {
    const poly = getShapeTemplatePolygon(String(spec.template), { x: ORIGIN_X, y: 90 });
    const pts = poly.map((p) => `${p.x},${p.y}`).join(" ");
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
  }

  if (kind === "parallel_lines") {
    return `<line x1="30" y1="60" x2="170" y2="60" stroke="${st.stroke}" stroke-width="2"/>
<line x1="30" y1="100" x2="170" y2="100" stroke="${st.stroke}" stroke-width="2"/>`;
  }

  if (kind === "diagonal") {
    return `<rect x="50" y="40" width="100" height="70" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="50" y1="110" x2="150" y2="40" stroke="${st.stroke}" stroke-width="2" stroke-dasharray="4 3"/>`;
  }

  if (kind === "symmetry") {
    return `<rect x="60" y="50" width="80" height="60" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="100" y1="40" x2="100" y2="120" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  }

  if (kind === "rotation_step") {
    const angle = Number(spec.angle) || 90;
    return `<rect x="70" y="70" width="50" height="50" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<rect x="95" y="45" width="50" height="50" fill="none" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>
${dimLabel(ORIGIN_X, 135, `${angle}°`, st)}`;
  }

  if (kind === "transformation_translate" || kind === "transformation_reflect") {
    return `<rect x="55" y="75" width="45" height="45" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<rect x="105" y="75" width="45" height="45" fill="none" stroke="${st.stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  }

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
    return `<polygon points="${pts}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(cx, y0 + 14, fmt(spec.a, "ס״מ"), st)}
${dimLabel(x0 - 12, y0 - legA / 2, fmt(spec.b, "ס״מ"), st)}`;
  }

  if (kind === "tiling") {
    const cx = ORIGIN_X;
    const cy = 95;
    const tile = spec.tile || "square";
    let points = shapeTemplatePointsString("square", { x: cx, y: cy });
    if (tile === "triangle") {
      points = shapeTemplatePointsString("triangle_equilateral", { x: cx, y: cy + 10 });
    } else if (tile === "hexagon") {
      const r = 48;
      const hex = [];
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        hex.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      points = hex.join(" ");
    }
    if (!points) return "";
    return `<polygon points="${points}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`;
  }

  if (kind === "solid_box" && spec.length != null && spec.width != null && spec.height != null) {
    const { w, h } = scaleLengthToWidth(Number(spec.length), Number(spec.height), {
      maxW: 90,
      maxH: 70,
    });
    const d = Math.min(28, w * 0.25);
    const x = 60;
    const y = ORIGIN_Y - h;
    return `<polygon points="${x},${y} ${x + w},${y} ${x + w + d},${y - d} ${x + d},${y - d}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<polygon points="${x + w},${y} ${x + w},${y + h} ${x + w + d},${y + h - d} ${x + w + d},${y - d}" fill="none" stroke="${st.stroke}" stroke-width="1.5"/>
<polygon points="${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}" fill="none" stroke="${st.stroke}" stroke-width="1.5"/>`;
  }

  if (kind === "solid_identify") {
    const label = String(spec.solidShape || "גוף");
    return `<rect x="65" y="55" width="70" height="55" rx="4" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
${dimLabel(ORIGIN_X, 92, label, st)}`;
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
  return `<svg class="worksheet-geometry-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet" dir="ltr" aria-hidden="true">${inner}</svg>`;
}
