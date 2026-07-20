/**
 * Extract and normalize font glyph outlines via opentype.js.
 */

import opentype from "opentype.js";
import fs from "node:fs";
import path from "node:path";
import { FONTS_DIR, VIEWBOX } from "./glyph-config.mjs";

/** @type {Map<string, import("opentype.js").Font>} */
const fontCache = new Map();

/**
 * @param {string} fontFile
 */
export function loadFont(fontFile) {
  if (fontCache.has(fontFile)) return fontCache.get(fontFile);
  const fontPath = path.join(FONTS_DIR, fontFile);
  if (!fs.existsSync(fontPath)) throw new Error(`Font missing: ${fontPath}`);
  const buffer = fs.readFileSync(fontPath);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  fontCache.set(fontFile, font);
  return font;
}

/**
 * @param {import("opentype.js").Font} font
 * @param {string} char
 * @param {number} fontSize
 */
export function getGlyphPath(font, char, fontSize) {
  const glyph = font.charToGlyph(char);
  if (!glyph || glyph.index === 0) {
    throw new Error(`Glyph not found for "${char}" in ${font.names.fullName?.en || "font"}`);
  }
  const scale = fontSize / font.unitsPerEm;
  const path = glyph.getPath(0, 0, fontSize);
  return { path, glyph, scale, fontSize };
}

/**
 * Transform opentype path to normalized viewBox coordinates (Y-up in SVG).
 * @param {import("opentype.js").Path} otPath
 * @param {number} viewBox
 */
export function pathToViewBox(otPath, viewBox = VIEWBOX) {
  const bbox = otPath.getBoundingBox();
  const pad = Math.max(bbox.x2 - bbox.x1, bbox.y2 - bbox.y1) * 0.06 || 8;
  const minX = bbox.x1 - pad;
  const minY = bbox.y1 - pad;
  const maxX = bbox.x2 + pad;
  const maxY = bbox.y2 + pad;
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = (viewBox - 4) / Math.max(w, h);

  /** @type {string[]} */
  const parts = [];
  for (const cmd of otPath.commands) {
    if (cmd.type === "M") {
      parts.push(
        `M ${fmt((cmd.x - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y - minY) * scale + 2))}`
      );
    } else if (cmd.type === "L") {
      parts.push(
        `L ${fmt((cmd.x - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y - minY) * scale + 2))}`
      );
    } else if (cmd.type === "C") {
      parts.push(
        `C ${fmt((cmd.x1 - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y1 - minY) * scale + 2))}` +
          ` ${fmt((cmd.x2 - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y2 - minY) * scale + 2))}` +
          ` ${fmt((cmd.x - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y - minY) * scale + 2))}`
      );
    } else if (cmd.type === "Q") {
      parts.push(
        `Q ${fmt((cmd.x1 - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y1 - minY) * scale + 2))}` +
          ` ${fmt((cmd.x - minX) * scale + 2)} ${fmt(viewBox - ((cmd.y - minY) * scale + 2))}`
      );
    } else if (cmd.type === "Z") {
      parts.push("Z");
    }
  }
  return {
    d: parts.join(" "),
    transform: { minX, minY, scale, viewBox },
  };
}

/**
 * @param {number} n
 */
function fmt(n) {
  return Math.round(n * 10) / 10;
}

/**
 * @param {string} d
 * @param {number} viewBox
 */
export function outlineSvgContent(d, viewBox = VIEWBOX) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" fill="none">
  <path d="${d}" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2" stroke-linejoin="round"/>
</svg>
`;
}

/**
 * Dashed monoline trace — one open path per pen stroke, no outline/skeleton fill.
 * @param {Array<{ path: string }>} strokes
 * @param {number} viewBox
 * @param {{ strokeWidth?: string, strokeDasharray?: string }} [options]
 */
export function fullTraceSvgFromStrokes(strokes, viewBox = VIEWBOX, options = {}) {
  const strokeWidth = options.strokeWidth ?? "2.2";
  const strokeDasharray = options.strokeDasharray ?? "4 3";
  const paths = strokes
    .map(
      (s) =>
        `<path d="${s.path}" fill="none" stroke="#444444" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${strokeDasharray}"/>`
    )
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" fill="none" data-trace="full_trace" data-monoline="true">
  ${paths}
</svg>
`;
}

/** @deprecated outline-based trace — do not use for full_trace */
export function fullTraceSvgContent(d, viewBox = VIEWBOX) {
  return fullTraceSvgFromStrokes([{ path: d }], viewBox);
}
