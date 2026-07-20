/**
 * Generate QA contact sheets for writing glyph assets.
 * Run: node scripts/writing/generate-contact-sheets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLYPH_GROUPS, ASSETS_DIR, glyphAssetBasename } from "./lib/glyph-config.mjs";
import { PREWRITING_PATHS } from "../../lib/writing/writing-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "docs", "audits", "writing-contact-sheets");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {string} title
 * @param {Array<{ label: string, outline: string, stroke: string }>} cells
 * @param {string} outFile
 */
function writeContactSheet(title, cells, outFile) {
  const cols = 6;
  const cellW = 120;
  const cellH = 140;
  const rows = Math.ceil(cells.length / cols);
  const width = cols * cellW + 40;
  const height = rows * cellH + 80;

  const cellSvgs = cells
    .map((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * cellW;
      const y = 50 + row * cellH;
      const outline = fs.existsSync(cell.outline)
        ? fs.readFileSync(cell.outline, "utf8").replace(/<\?xml[^?]*\?>\s*/i, "")
        : "";
      const stroke = fs.existsSync(cell.stroke)
        ? fs.readFileSync(cell.stroke, "utf8").replace(/<\?xml[^?]*\?>\s*/i, "")
        : "";
      return `
  <g transform="translate(${x}, ${y})">
    <rect x="0" y="0" width="${cellW - 10}" height="${cellH - 10}" fill="#fff" stroke="#cbd5e1"/>
    <text x="${(cellW - 10) / 2}" y="14" text-anchor="middle" font-size="11" fill="#334155">${cell.label}</text>
    <g transform="translate(8, 22) scale(0.45)">${outline.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>
    <g transform="translate(${cellW / 2 - 4}, 22) scale(0.45)">${stroke.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>
  </g>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="20" y="28" font-size="16" font-weight="700" fill="#0f172a">${title}</text>
  ${cellSvgs}
</svg>`;
  fs.writeFileSync(outFile, svg);
}

ensureDir(OUT_DIR);

/** @type {Record<string, string>} */
const sheets = {};

for (const group of GLYPH_GROUPS) {
  const cells = group.glyphs.map((glyph) => {
    const safe = glyphAssetBasename(group.id, glyph);
    return {
      label: glyph,
      outline: path.join(ASSETS_DIR, "outline", group.id, `${safe}.svg`),
      stroke: path.join(ASSETS_DIR, "stroke-path", group.id, `${safe}.svg`),
    };
  });
  const outFile = path.join(OUT_DIR, `${group.id}-contact-sheet.svg`);
  writeContactSheet(group.id, cells, outFile);
  sheets[group.id] = outFile;
}

const preCells = PREWRITING_PATHS.map((id) => ({
  label: id,
  outline: path.join(ASSETS_DIR, "prewriting", `${id}.svg`),
  stroke: path.join(ASSETS_DIR, "prewriting", `${id}.svg`),
}));
const preFile = path.join(OUT_DIR, "prewriting-contact-sheet.svg");
writeContactSheet("prewriting", preCells, preFile);
sheets.prewriting = preFile;

fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ sheets }, null, 2));
console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, sheets: Object.keys(sheets) }, null, 2));
