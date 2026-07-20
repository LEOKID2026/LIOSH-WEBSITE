import fs from "node:fs";
import path from "node:path";
import { GLYPH_GROUPS, ASSETS_DIR } from "./lib/glyph-config.mjs";
import { glyphAssetSlug } from "../../lib/writing/glyph-asset-slugs.js";

/** @param {string} d @returns {Array<[number, number]>} */
function parsePathPoints(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  /** @type {Array<[number, number]>} */
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

/** @param {Array<[number, number]>} pts */
function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

/** @param {Array<[number, number]>} pts @param {number} spacing */
function samplePolyline(pts, spacing = 2) {
  if (pts.length < 2) return pts.length ? [pts[0]] : [];
  /** @type {Array<[number, number]>} */
  const samples = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    if (segLen === 0) continue;
    let dist = spacing - carry;
    while (dist <= segLen) {
      const t = dist / segLen;
      samples.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
      dist += spacing;
    }
    carry = segLen - (dist - spacing);
  }
  return samples;
}

/** @param {[number, number]} point @param {Array<[number, number]>} pts */
function minDistToPolyline(point, pts) {
  if (!pts.length) return Infinity;
  if (pts.length === 1) return Math.hypot(point[0] - pts[0][0], point[1] - pts[0][1]);
  let min = Infinity;
  for (let i = 1; i < pts.length; i += 1) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) t = Math.max(0, Math.min(1, ((point[0] - x1) * dx + (point[1] - y1) * dy) / lenSq));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    min = Math.min(min, Math.hypot(point[0] - px, point[1] - py));
  }
  return min;
}

/** @param {Array<[number, number]>} shorter @param {Array<[number, number]>} longer */
function overlapRatio(shorter, longer, threshold = 2.5) {
  const samples = samplePolyline(shorter, 2);
  if (!samples.length) return 0;
  let near = 0;
  for (const p of samples) {
    if (minDistToPolyline(p, longer) <= threshold) near += 1;
  }
  return near / samples.length;
}

/** @type {Array<[string, string]>} */
const TARGETS = [
  ["he-print", "ב"],
  ["en-upper", "F"],
  ["digits", "5"],
];

/** @type {string[]} */
const issues = [];

for (const [groupId, glyph] of TARGETS) {
  const slug = glyphAssetSlug(glyph);
  const file = path.join(ASSETS_DIR, "full-trace", groupId, `${slug}.svg`);
  const svg = fs.readFileSync(file, "utf8");
  const key = `${groupId}/${glyph}`;
  const paths = [...svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  const polylines = paths.map(parsePathPoints);

  for (let i = 0; i < polylines.length; i += 1) {
    const len = polylineLength(polylines[i]);
    if (len > 0 && len < 8) issues.push(`${key}: stroke ${i + 1} too short (${len.toFixed(1)} units)`);
  }

  for (let i = 0; i < polylines.length; i += 1) {
    for (let j = i + 1; j < polylines.length; j += 1) {
      const lenI = polylineLength(polylines[i]);
      const lenJ = polylineLength(polylines[j]);
      const [short, long] = lenI <= lenJ ? [polylines[i], polylines[j]] : [polylines[j], polylines[i]];
      const ratio = overlapRatio(short, long);
      if (ratio > 0.35) {
        issues.push(`${key}: stroke ${i + 1} overlaps stroke ${j + 1} by ${Math.round(ratio * 100)}%`);
      }
    }
  }
}

console.log(JSON.stringify({ issueCount: issues.length, issues, strokes: TARGETS.map(([g, ch]) => {
  const slug = glyphAssetSlug(ch);
  const svg = fs.readFileSync(path.join(ASSETS_DIR, "full-trace", g, `${slug}.svg`), "utf8");
  return { key: `${g}/${ch}`, count: [...svg.matchAll(/d="/g)].length };
}) }, null, 2));
