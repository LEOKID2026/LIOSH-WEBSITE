#!/usr/bin/env node
/**
 * Install approved Hebrew print SVGs from staging export into public/assets/writing/.
 * Does not regenerate geometry — copies path elements verbatim from approved export.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HEBREW_PRINT_PUBLISH_ORDER } from "../lib/writing/glyph-asset-slugs.js";
import { isEndpointConnected } from "./lib/hebrew-print-topology.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPROVED_EXPORT = path.join(ROOT, "tmp", "hebrew-glyphs", "approved-print", "export");
const SITE_ASSETS_DIR = path.join(ROOT, "public", "assets", "writing");
const GLYPHS_JSON_PATH = path.join(ROOT, "hebrew-print-glyphs-project.json");

/**
 * @param {string} svgText
 */
function parseSvgDocument(svgText) {
  const match = svgText.match(/<svg\b([\s\S]*?)>([\s\S]*?)<\/svg>/);
  if (!match) throw new Error("Invalid SVG document");
  return parseSvgInner(`${match[1]}>${match[2]}`);
}

/**
 * @param {string} inner
 */
function parseSvgInner(inner) {
  const split = inner.match(/^([\s\S]*?)>([\s\S]*)$/);
  if (!split) throw new Error("Invalid SVG inner");
  const openTagBody = split[1];
  const body = split[2];
  const paths = [];
  const pathRe = /<path\b[^>]*\/>/g;
  let pm;
  while ((pm = pathRe.exec(body)) !== null) {
    paths.push(pm[0]);
  }
  return {
    viewBox: (openTagBody.match(/viewBox="([^"]+)"/) || [])[1] || "0 0 100 100",
    fill: (openTagBody.match(/fill="([^"]+)"/) || [])[1] || "none",
    stroke: (openTagBody.match(/\n\s*stroke="([^"]+)"/) || openTagBody.match(/\sstroke="([^"]+)"/) || [])[1],
    strokeLinecap: (openTagBody.match(/stroke-linecap="([^"]+)"/) || [])[1] || "butt",
    strokeLinejoin: (openTagBody.match(/stroke-linejoin="([^"]+)"/) || [])[1] || "round",
    paths,
  };
}

/**
 * @param {string} pathTag
 */
function pathAttrs(pathTag) {
  /** @type {Record<string, string>} */
  const attrs = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(pathTag)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * @param {string} d
 */
function parsePathEndpoints(d) {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 4) throw new Error(`unsupported path d: ${d.slice(0, 120)}`);
  return {
    start: { x: nums[0], y: nums[1] },
    end: { x: nums[nums.length - 2], y: nums[nums.length - 1] },
  };
}

/**
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 */
function strokeDirection(start, end) {
  const dy = end.y - start.y;
  const dx = end.x - start.x;
  if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? "ttb" : "btt";
  return dx >= 0 ? "ltr" : "rtl";
}

/**
 * @param {string[]} rootAttrs
 * @param {string[]} pathLines
 * @param {string[]} extraLines
 */
function buildSvg(rootAttrs, pathLines, extraLines = []) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg ${rootAttrs.join("\n     ")}\n     >\n${[...pathLines, ...extraLines].join("\n")}\n</svg>\n`;
}

/**
 * @param {string} jsonSlug
 * @param {number} strokeIndex
 * @param {"start"|"end"} role
 */
function shouldDrawEndpointCap(jsonSlug, strokeIndex, role) {
  if (jsonSlug === "tsadi" && strokeIndex === 3 && (role === "start" || role === "end")) return false;
  return true;
}

/**
 * @param {string} jsonSlug
 * @param {string[]} pathTags
 * @param {Record<string, any>} glyphs
 */
function buildEndpointCaps(jsonSlug, pathTags, glyphs) {
  const caps = [];
  const seen = new Set();
  pathTags.forEach((pathTag, idx) => {
    const attrs = pathAttrs(pathTag);
    const strokeIndex = Number((attrs.id || "").replace("stroke-", "")) || idx + 1;
    const { start, end } = parsePathEndpoints(attrs.d);
    for (const [role, point] of /** @type {const} */ ([["start", start], ["end", end]])) {
      if (!shouldDrawEndpointCap(jsonSlug, strokeIndex, role)) continue;
      if (isEndpointConnected(jsonSlug, strokeIndex, role, glyphs)) continue;
      const key = `${point.x},${point.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      caps.push(`  <circle cx="${point.x}" cy="${point.y}" r="1.1" fill="currentColor"/>`);
    }
  });
  return caps;
}

/**
 * @param {string} letter
 * @param {string} jsonSlug
 * @param {string[]} pathTags
 */
function buildStrokeOrderJson(letter, jsonSlug, pathTags) {
  const strokes = pathTags.map((pathTag, idx) => {
    const attrs = pathAttrs(pathTag);
    const { start, end } = parsePathEndpoints(attrs.d);
    return {
      order: idx + 1,
      pathId: attrs.id || `stroke-${idx + 1}`,
      path: attrs.d,
      start,
      end,
      direction: strokeDirection(start, end),
      arrow: true,
    };
  });
  return {
    glyphId: letter,
    group: "he-print",
    viewBox: 100,
    strokeCount: strokes.length,
    strokes,
    generatedBy: "build-glyph-assets",
    version: 1,
  };
}

/**
 * @param {string} letter
 * @param {ReturnType<typeof parseSvgDocument>} dashed
 */
function buildFullTraceSvg(letter, dashed) {
  const rootAttrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${dashed.viewBox}"`,
    `fill="${dashed.fill}"`,
    `stroke-linecap="${dashed.strokeLinecap}"`,
    `stroke-linejoin="${dashed.strokeLinejoin}"`,
    'data-trace="full_trace"',
    'data-monoline="true"',
    'data-source="approved-print-export"',
    `data-glyph="${letter}"`,
    'data-group="he-print"',
  ];
  const pathLines = dashed.paths.map((p) => `  ${p}`);
  return buildSvg(rootAttrs, pathLines);
}

/**
 * @param {string} letter
 * @param {ReturnType<typeof parseSvgDocument>} solid
 */
function buildOutlineSvg(letter, solid) {
  const rootAttrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${solid.viewBox}"`,
    `fill="${solid.fill}"`,
    ...(solid.stroke ? [`stroke="${solid.stroke}"`] : []),
    `stroke-linecap="${solid.strokeLinecap}"`,
    `stroke-linejoin="${solid.strokeLinejoin}"`,
    `data-glyph="${letter}"`,
    'data-group="he-print"',
    'data-outline="true"',
  ];
  const pathLines = solid.paths.map((p) => `  ${p}`);
  return buildSvg(rootAttrs, pathLines);
}

/**
 * @param {string} letter
 * @param {string} jsonSlug
 * @param {ReturnType<typeof parseSvgDocument>} solid
 * @param {Record<string, any>} glyphs
 */
function buildStrokePathSvg(letter, jsonSlug, solid, glyphs) {
  const rootAttrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${solid.viewBox}"`,
    `fill="${solid.fill}"`,
    ...(solid.stroke ? [`stroke="${solid.stroke}"`] : []),
    `stroke-linecap="${solid.strokeLinecap}"`,
    `stroke-linejoin="${solid.strokeLinejoin}"`,
    `data-glyph="${letter}"`,
    'data-group="he-print"',
    'data-centerline="true"',
  ];
  const pathLines = solid.paths.map((p) => `  ${p}`);
  const caps = buildEndpointCaps(jsonSlug, solid.paths, glyphs);
  return buildSvg(rootAttrs, pathLines, caps);
}

function main() {
  const glyphs = JSON.parse(fs.readFileSync(GLYPHS_JSON_PATH, "utf8")).glyphs;
  const solidDir = path.join(APPROVED_EXPORT, "solid");
  const dashedDir = path.join(APPROVED_EXPORT, "dashed");
  const fullTraceDir = path.join(SITE_ASSETS_DIR, "full-trace", "he-print");
  const outlineDir = path.join(SITE_ASSETS_DIR, "outline", "he-print");
  const strokePathDir = path.join(SITE_ASSETS_DIR, "stroke-path", "he-print");
  const strokeOrderDir = path.join(SITE_ASSETS_DIR, "stroke-order", "he-print");

  for (const dir of [fullTraceDir, outlineDir, strokePathDir, strokeOrderDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  /** @type {string[]} */
  const installed = [];

  for (const { letter, jsonSlug, assetSlug } of HEBREW_PRINT_PUBLISH_ORDER) {
    const solidPath = path.join(solidDir, `${jsonSlug}.svg`);
    const dashedPath = path.join(dashedDir, `${jsonSlug}.svg`);
    if (!fs.existsSync(solidPath)) throw new Error(`missing approved solid: ${jsonSlug}.svg`);
    if (!fs.existsSync(dashedPath)) throw new Error(`missing approved dashed: ${jsonSlug}.svg`);

    const solid = parseSvgDocument(fs.readFileSync(solidPath, "utf8"));
    const dashed = parseSvgDocument(fs.readFileSync(dashedPath, "utf8"));

    fs.writeFileSync(path.join(fullTraceDir, `${assetSlug}.svg`), buildFullTraceSvg(letter, dashed));
    fs.writeFileSync(path.join(outlineDir, `${assetSlug}.svg`), buildOutlineSvg(letter, solid));
    fs.writeFileSync(
      path.join(strokePathDir, `${assetSlug}.svg`),
      buildStrokePathSvg(letter, jsonSlug, solid, glyphs)
    );
    fs.writeFileSync(
      path.join(strokeOrderDir, `${assetSlug}.json`),
      `${JSON.stringify(buildStrokeOrderJson(letter, jsonSlug, solid.paths), null, 2)}\n`
    );
    installed.push(assetSlug);
  }

  console.log(`Installed ${installed.length} Hebrew print asset sets from approved export`);
  console.log(`  full-trace: ${fullTraceDir}`);
  console.log(`  outline:    ${outlineDir}`);
  console.log(`  stroke-path:${strokePathDir}`);
  console.log(`  stroke-order:${strokeOrderDir}`);
}

main();
