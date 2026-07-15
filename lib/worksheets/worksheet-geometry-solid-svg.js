/**
 * Print-safe isometric/orthographic solid SVG fragments for geometry worksheets.
 * Coordinates fit viewBox 0 0 200 160 with padding.
 * @module lib/worksheets/worksheet-geometry-solid-svg
 */

/**
 * @param {{ fill: string, stroke: string, text: string }} st
 * @param {(x: number, y: number, value: unknown, st: object, opts?: object) => string} dimMeasure
 * @param {(x: number, y: number, label: string, st: object, opts?: object) => string} dimLabel
 */

/**
 * @param {string|null|undefined} solidShape
 * @returns {string}
 */
export function normalizeSolidShapeKey(solidShape) {
  const raw = String(solidShape || "").trim();
  const map = {
    קובייה: "cube",
    תיבה: "rectangular_prism",
    גליל: "cylinder",
    כדור: "sphere",
    פירמידה: "pyramid",
    חרוט: "cone",
    מנסרה: "prism",
    box: "rectangular_prism",
    rectangular_prism: "rectangular_prism",
  };
  if (map[raw]) return map[raw];
  const s = raw.toLowerCase().replace(/-/g, "_");
  if (map[s]) return map[s];
  return s || "cube";
}

/**
 * @param {{
 *   kind: string,
 *   solidShape?: string,
 *   length?: number,
 *   width?: number,
 *   height?: number,
 *   radius?: number,
 *   side?: number,
 *   base?: number,
 *   baseHeight?: number,
 *   mode?: string,
 *   hideHeight?: boolean,
 *   hideRadius?: boolean,
 * }} spec
 * @param {{ fill: string, stroke: string, text: string }} st
 * @param {{
 *   dimMeasure: (x: number, y: number, value: unknown, st: object, opts?: object) => string,
 *   dimLabel: (x: number, y: number, label: string, st: object, opts?: object) => string,
 * }} helpers
 * @returns {string}
 */
export function renderSolidDiagramSvgInner(spec, st, helpers) {
  const { dimMeasure, dimLabel } = helpers;
  const kind = String(spec?.kind || "");
  const shapeFromKind = kind.replace(/^solid_/, "");
  const shape =
    kind === "solid_box"
      ? "rectangular_prism"
      : kind === "solid_identify"
        ? normalizeSolidShapeKey(spec.solidShape)
        : normalizeSolidShapeKey(spec.solidShape || shapeFromKind);

  const showMeasures = kind !== "solid_identify" && String(spec.mode || "") !== "identify";

  if (shape === "cube" || shape === "rectangular_prism") {
    return renderBoxSolid(spec, st, helpers, {
      isCube: shape === "cube",
      showMeasures,
    });
  }
  if (shape === "cylinder") {
    return renderCylinderSolid(spec, st, helpers, { showMeasures });
  }
  if (shape === "sphere") {
    return renderSphereSolid(spec, st, helpers, { showMeasures });
  }
  if (shape === "pyramid") {
    return renderPyramidSolid(spec, st, helpers, { showMeasures });
  }
  if (shape === "cone") {
    return renderConeSolid(spec, st, helpers, { showMeasures });
  }
  if (shape === "prism") {
    return renderPrismSolid(spec, st, helpers, { showMeasures });
  }
  // Unknown — safe cube silhouette (never a labeled placeholder rect).
  return renderBoxSolid({ length: 5, width: 5, height: 5 }, st, helpers, {
    isCube: true,
    showMeasures: false,
  });
}

function renderBoxSolid(spec, st, helpers, opts) {
  const { dimMeasure } = helpers;
  const isCube = opts.isCube;
  const L = Number(spec.length ?? spec.side ?? 4) || 4;
  const W = Number(spec.width ?? spec.side ?? (isCube ? L : 3)) || 3;
  const H = Number(spec.height ?? spec.side ?? (isCube ? L : 5)) || 5;
  const maxFrontW = isCube ? 70 : 90;
  const maxFrontH = isCube ? 70 : 75;
  const k = Math.min(maxFrontW / Math.max(L, 1e-6), maxFrontH / Math.max(H, 1e-6));
  const w = Math.max(42, L * k);
  const h = Math.max(42, H * k);
  const d = Math.min(28, Math.max(14, (W / Math.max(L, 1e-6)) * w * 0.35));
  const x = 100 - (w + d) / 2;
  const y = 128 - h - 6;
  const hidden = `<line x1="${x}" y1="${y + h}" x2="${x + d}" y2="${y + h - d}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
<line x1="${x + d}" y1="${y + h - d}" x2="${x + w + d}" y2="${y + h - d}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
<line x1="${x + d}" y1="${y + h - d}" x2="${x + d}" y2="${y - d}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>`;
  const body = `<polygon points="${x},${y} ${x + w},${y} ${x + w + d},${y - d} ${x + d},${y - d}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<polygon points="${x + w},${y} ${x + w},${y + h} ${x + w + d},${y + h - d} ${x + w + d},${y - d}" fill="none" stroke="${st.stroke}" stroke-width="1.6"/>
<polygon points="${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}" fill="none" stroke="${st.stroke}" stroke-width="1.6"/>
${hidden}`;
  if (!opts.showMeasures) return body;
  const heightLbl = spec.hideHeight
    ? helpers.dimLabel(x - 12, y + h / 2, "?", st)
    : dimMeasure(x - 12, y + h / 2, H, st);
  return `${body}
${dimMeasure(x + w / 2, y + h + 14, L, st)}
${heightLbl}
${dimMeasure(x + w + d / 2 + 8, y + h / 2 - d / 2, W, st)}`;
}

function renderCylinderSolid(spec, st, helpers, opts) {
  const { dimMeasure, dimLabel } = helpers;
  const rNum = Number(spec.radius) || 3;
  const hNum = Number(spec.height) || 6;
  const rx = Math.min(48, 28 + rNum * 3);
  const ry = Math.max(10, rx * 0.28);
  const bodyH = Math.min(72, 40 + hNum * 4);
  const cx = 100;
  const topY = 42;
  const botY = topY + bodyH;
  const body = `<ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ry}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${cx - rx}" y1="${topY}" x2="${cx - rx}" y2="${botY}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${cx + rx}" y1="${topY}" x2="${cx + rx}" y2="${botY}" stroke="${st.stroke}" stroke-width="2"/>
<path d="M ${cx - rx} ${botY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${botY}" fill="none" stroke="${st.stroke}" stroke-width="2"/>
<path d="M ${cx - rx} ${botY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${botY}" fill="none" stroke="${st.stroke}" stroke-width="1.3" stroke-dasharray="3 3"/>
<line x1="${cx}" y1="${topY}" x2="${cx + rx}" y2="${topY}" stroke="${st.stroke}" stroke-width="1.3"/>`;
  if (!opts.showMeasures) return body;
  const rLbl = spec.hideRadius
    ? dimLabel(cx + rx / 2, topY - 10, "?", st)
    : dimMeasure(cx + rx / 2, topY - 10, rNum, st);
  const hLbl = spec.hideHeight
    ? dimLabel(cx + rx + 14, (topY + botY) / 2, "?", st)
    : dimMeasure(cx + rx + 14, (topY + botY) / 2, hNum, st);
  return `${body}
${rLbl}
${hLbl}`;
}

function renderSphereSolid(spec, st, helpers, opts) {
  const { dimMeasure, dimLabel } = helpers;
  const rNum = Number(spec.radius) || 4;
  const r = Math.min(52, 34 + rNum * 3);
  const cx = 100;
  const cy = 82;
  const body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${Math.max(10, r * 0.32)}" fill="none" stroke="${st.stroke}" stroke-width="1.3" stroke-dasharray="4 3"/>
<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${st.stroke}" stroke-width="1.3"/>`;
  if (!opts.showMeasures) return body;
  const rLbl = spec.hideRadius
    ? dimLabel(cx + r / 2, cy - 12, "?", st)
    : dimMeasure(cx + r / 2, cy - 12, rNum, st);
  return `${body}
${rLbl}`;
}

function renderPyramidSolid(spec, st, helpers, opts) {
  const { dimMeasure, dimLabel } = helpers;
  const side = Number(spec.side ?? spec.baseSide ?? spec.base ?? 5) || 5;
  const height = Number(spec.height) || 6;
  const baseW = Math.min(120, 70 + side * 4);
  const apexY = 36;
  const baseY = 128;
  const left = 100 - baseW / 2;
  const right = 100 + baseW / 2;
  const mid = 100;
  // Front face + hidden base diagonals / height
  const body = `<polygon points="${left},${baseY} ${right},${baseY} ${mid},${apexY}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${left}" y1="${baseY}" x2="${mid}" y2="${apexY}" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="${right}" y1="${baseY}" x2="${mid}" y2="${apexY}" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="${mid}" y1="${apexY}" x2="${mid}" y2="${baseY}" stroke="${st.stroke}" stroke-width="1.3" stroke-dasharray="4 3"/>
<line x1="${left + baseW * 0.22}" y1="${baseY - 18}" x2="${right - baseW * 0.22}" y2="${baseY - 18}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.75"/>`;
  if (!opts.showMeasures) return body;
  const sideLbl = dimMeasure(mid, baseY + 14, side, st);
  const hLbl = spec.hideHeight
    ? dimLabel(mid + 16, (apexY + baseY) / 2, "?", st)
    : dimMeasure(mid + 16, (apexY + baseY) / 2, height, st);
  const width = spec.baseWidth ?? spec.width;
  const extra =
    typeof width === "number"
      ? dimMeasure(right - 8, baseY - 28, width, st)
      : "";
  return `${body}
${sideLbl}
${hLbl}
${extra}`;
}

function renderConeSolid(spec, st, helpers, opts) {
  const { dimMeasure, dimLabel } = helpers;
  const rNum = Number(spec.radius) || 3;
  const hNum = Number(spec.height) || 6;
  const rx = Math.min(54, 30 + rNum * 3);
  const ry = Math.max(10, rx * 0.26);
  const apexY = 34;
  const baseY = 128;
  const cx = 100;
  const body = `<line x1="${cx}" y1="${apexY}" x2="${cx - rx}" y2="${baseY}" stroke="${st.stroke}" stroke-width="2"/>
<line x1="${cx}" y1="${apexY}" x2="${cx + rx}" y2="${baseY}" stroke="${st.stroke}" stroke-width="2"/>
<ellipse cx="${cx}" cy="${baseY}" rx="${rx}" ry="${ry}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<path d="M ${cx - rx} ${baseY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${baseY}" fill="none" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>
<line x1="${cx}" y1="${apexY}" x2="${cx}" y2="${baseY}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="${cx}" y1="${baseY}" x2="${cx + rx}" y2="${baseY}" stroke="${st.stroke}" stroke-width="1.2"/>`;
  if (!opts.showMeasures) return body;
  const rLbl = spec.hideRadius
    ? dimLabel(cx + rx / 2, baseY + 16, "?", st)
    : dimMeasure(cx + rx / 2, baseY + 16, rNum, st);
  const hLbl = spec.hideHeight
    ? dimLabel(cx + 16, (apexY + baseY) / 2, "?", st)
    : dimMeasure(cx + 16, (apexY + baseY) / 2, hNum, st);
  return `${body}
${rLbl}
${hLbl}`;
}

function renderPrismSolid(spec, st, helpers, opts) {
  const { dimMeasure, dimLabel } = helpers;
  // Triangular prism isometric-ish
  const depth = 28;
  const baseW = 90;
  const h = 58;
  const x0 = 55;
  const y0 = 118;
  const body = `<polygon points="${x0},${y0} ${x0 + baseW},${y0} ${x0 + baseW * 0.5},${y0 - h}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>
<polygon points="${x0 + baseW},${y0} ${x0 + baseW + depth},${y0 - depth * 0.55} ${x0 + baseW * 0.5 + depth},${y0 - h - depth * 0.55} ${x0 + baseW * 0.5},${y0 - h}" fill="none" stroke="${st.stroke}" stroke-width="1.6"/>
<line x1="${x0}" y1="${y0}" x2="${x0 + depth}" y2="${y0 - depth * 0.55}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>
<line x1="${x0 + depth}" y1="${y0 - depth * 0.55}" x2="${x0 + baseW + depth}" y2="${y0 - depth * 0.55}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>
<line x1="${x0 + depth}" y1="${y0 - depth * 0.55}" x2="${x0 + baseW * 0.5 + depth}" y2="${y0 - h - depth * 0.55}" stroke="${st.stroke}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  if (!opts.showMeasures) return body;
  const base = Number(spec.base ?? spec.baseLength ?? spec.side ?? 4);
  const baseHeight = Number(spec.baseHeight ?? spec.width ?? 3);
  const height = Number(spec.height ?? 5);
  const hLbl = spec.hideHeight
    ? dimLabel(x0 + baseW + depth + 10, y0 - h / 2, "?", st)
    : dimMeasure(x0 + baseW + depth + 10, y0 - h / 2, height, st);
  return `${body}
${dimMeasure(x0 + baseW / 2, y0 + 14, base, st)}
${dimMeasure(x0 + 8, y0 - h / 2, baseHeight, st)}
${hLbl}`;
}
