/**
 * Rebuild Hebrew reference-derived dot tracing assets.
 * Run from the repository root:
 *   node scripts/writing/build-hebrew-reference-dot-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import {
  HEBREW_PRINT_REFERENCE_DOTS,
  HEBREW_SCRIPT_REFERENCE_DOTS,
} from "../../lib/writing/hebrew-reference-dot-data.mjs";
import { glyphAssetSlug } from "../../lib/writing/glyph-asset-slugs.js";

const ROOT = process.cwd();
const FULL_ROOT = path.join(ROOT, "public", "assets", "writing", "full-trace");
const ORDER_ROOT = path.join(ROOT, "public", "assets", "writing", "stroke-order");

function nearestNeighborOrder(points) {
  if (!points.length) return [];
  const remaining = points.map((_, i) => i);
  const start = remaining.reduce((best, i) => {
    if (best === null) return i;
    const [x, y] = points[i];
    const [bx, by] = points[best];
    return y < by || (y === by && x > bx) ? i : best;
  }, null);
  const order = [start];
  remaining.splice(remaining.indexOf(start), 1);
  while (remaining.length) {
    const [lx, ly] = points[order[order.length - 1]];
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const [x, y] = points[remaining[i]];
      const distance = (x - lx) ** 2 + (y - ly) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    order.push(remaining.splice(bestIndex, 1)[0]);
  }
  return order.map((i) => points[i]);
}

function pathFromPoints(points) {
  const ordered = nearestNeighborOrder(points);
  if (!ordered.length) return "";
  return `M ${ordered.map(([x, y]) => `${x} ${y}`).join(" L ")}`;
}

function writeGroup(group, table) {
  const fullDir = path.join(FULL_ROOT, group);
  const orderDir = path.join(ORDER_ROOT, group);
  fs.mkdirSync(fullDir, { recursive: true });
  fs.mkdirSync(orderDir, { recursive: true });

  for (const [glyph, points] of Object.entries(table)) {
    const slug = glyphAssetSlug(glyph);
    const circles = points
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#444444"/>`)
      .join("\n  ");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"
     data-trace="full_trace" data-dot-trace="true" data-source="user-reference">
  ${circles}
</svg>
`;
    fs.writeFileSync(path.join(fullDir, `${slug}.svg`), svg);

    const ordered = nearestNeighborOrder(points);
    const order = {
      glyphId: glyph,
      group,
      viewBox: 100,
      strokeCount: ordered.length ? 1 : 0,
      strokes: ordered.length
        ? [{
            order: 1,
            pathId: "stroke-1",
            path: pathFromPoints(points),
            start: { x: ordered[0][0], y: ordered[0][1] },
            end: { x: ordered.at(-1)[0], y: ordered.at(-1)[1] },
            direction: "reference-derived",
            arrow: false,
          }]
        : [],
      dotPoints: points.map(([x, y]) => ({ x, y })),
      generatedBy: "hebrew-reference-dot-data",
      referenceQuality: "visual tracing asset; stroke order is approximate",
      version: 1,
    };
    fs.writeFileSync(
      path.join(orderDir, `${slug}.json`),
      `${JSON.stringify(order, null, 2)}\n`
    );
  }
}

writeGroup("he-print", HEBREW_PRINT_REFERENCE_DOTS);
writeGroup("he-script", HEBREW_SCRIPT_REFERENCE_DOTS);
console.log("Hebrew reference dot assets written: 54 SVG + 54 JSON");
