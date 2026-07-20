/**
 * Build outline SVG, centerline stroke_path SVG, and stroke-order JSON for one glyph.
 */

import fs from "node:fs";
import path from "node:path";
import { getGlyphPath, loadFont, outlineSvgContent, fullTraceSvgFromStrokes, pathToViewBox } from "./font-outline.mjs";
import {
  flattenCommands,
  lineToViewBox,
  polylineToPathD,
  rasterizeStroke,
  simplifyPolyline,
  skeletonize,
  splitSubpaths,
  isClosedContour,
  createFontRasterTransform,
  fontPointToRaster,
  pruneSkeletonSpurs,
  traceSkeletonGraph,
  medialPolylinesFromPolygons,
  pruneOverlappingPolylines,
} from "./raster-skeleton.mjs";
import { getFullTracePathOverride } from "./full-trace-overrides.mjs";
import {
  RASTER_SIZE,
  VIEWBOX,
  fullTraceSvgPath,
  outlineSvgPath,
  strokeOrderJsonPath,
  strokePathSvgPath,
} from "./glyph-config.mjs";

const FULL_TRACE_SVG_OPTIONS = { strokeDasharray: "4 3" };

/**
 * @param {string} pathD
 */
function pathEndpoints(pathD) {
  const nums = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 4) {
    return { start: { x: nums[0] ?? 0, y: nums[1] ?? 0 }, end: { x: nums[0] ?? 0, y: nums[1] ?? 0 } };
  }
  return {
    start: { x: nums[0], y: nums[1] },
    end: { x: nums[nums.length - 2], y: nums[nums.length - 1] },
  };
}

/**
 * @param {string[]} paths
 * @param {"rtl" | "ltr"} readingDir
 */
function strokesFromManualPaths(paths, _readingDir) {
  return paths.map((pathD, idx) => {
    const nums = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    /** @type {Array<[number, number]>} */
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const { start, end } = pathEndpoints(pathD);
    return {
      order: idx + 1,
      pathId: `stroke-${idx + 1}`,
      path: pathD,
      start,
      end,
      direction: directionOf(pts.length >= 2 ? pts : [[start.x, start.y], [end.x, end.y]]),
      arrow: true,
    };
  });
}

/**
 * @param {string} svg
 * @param {string} groupId
 * @param {string} glyph
 */
export function validateFullTraceSvg(svg, groupId, glyph) {
  if (!svg.includes('data-trace="full_trace"')) {
    throw new Error(`${groupId}/${glyph}: missing full_trace marker`);
  }
  if (!svg.includes('fill="none"')) {
    throw new Error(`${groupId}/${glyph}: paths must use fill="none"`);
  }
  if (!/stroke-dasharray="4 3"/.test(svg)) {
    throw new Error(`${groupId}/${glyph}: expected stroke-dasharray="4 3"`);
  }
  if (/\b[Zz]\b/.test(svg)) {
    throw new Error(`${groupId}/${glyph}: closed path (Z) is not allowed`);
  }
}

/**
 * @param {Array<[number, number]>} pts
 */
function directionOf(pts) {
  if (pts.length < 2) return "unknown";
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) >= Math.abs(dy) * 1.2) return dx >= 0 ? "ltr" : "rtl";
  return dy >= 0 ? "ttb" : "btt";
}

/**
 * @param {Array<[number, number]>} pts
 */
function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

/**
 * @param {Array<Array<[number, number]>>} segments
 * @param {"rtl" | "ltr"} readingDir
 */
function orderStrokes(segments, readingDir) {
  return [...segments].sort((a, b) => {
    const [ax, ay] = a[0];
    const [bx, by] = b[0];
    if (Math.abs(ay - by) > 3) return ay - by;
    return readingDir === "rtl" ? bx - ax : ax - bx;
  });
}

/**
 * @param {Array<[number, number]>} pts
 * @param {number} [minDist=3]
 */
function isClosedLikePolyline(pts, minDist = 3) {
  if (pts.length < 2) return true;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return Math.hypot(ex - sx, ey - sy) < minDist;
}

/**
 * Final SVG coordinate normalization for auto-generated centerlines only.
 * @param {Array<Array<[number, number]>>} segments
 * @param {number} viewBox
 */
function normalizeAutoTraceOrientation(segments, viewBox) {
  return segments.map((line) => line.map(([x, y]) => [x, viewBox - y]));
}

/**
 * Centerline strokes via compound even-odd raster + graph skeleton (single pass).
 * @param {import("opentype.js").Path} otPath
 * @param {number} rasterSize
 * @param {number} viewBox
 */
function extractCenterlineStrokes(otPath, rasterSize, viewBox) {
  const transform = createFontRasterTransform(otPath.getBoundingBox(), rasterSize);

  /** @type {Array<Array<[number, number]>>} */
  const rasterPolylines = [];

  /** @type {Array<Array<[number, number]>>} */
  const closedPolygons = [];

  for (const sub of splitSubpaths(otPath)) {
    const flatFont = flattenCommands(sub, 24);
    const flatRaster = flatFont.map(([x, y]) => fontPointToRaster(x, y, transform));

    if (isClosedContour(sub, flatFont) && flatRaster.length >= 4) {
      closedPolygons.push(flatRaster);
      continue;
    }

    const strokeGrid = rasterizeStroke(flatRaster, rasterSize, rasterSize, 4);
    let sk = skeletonize(strokeGrid, rasterSize, rasterSize);
    sk = pruneSkeletonSpurs(sk, rasterSize, rasterSize, 6);
    rasterPolylines.push(...traceSkeletonGraph(sk, rasterSize, rasterSize));
  }

  if (closedPolygons.length) {
    rasterPolylines.push(
      ...medialPolylinesFromPolygons(closedPolygons, rasterSize, rasterSize)
    );
  }

  /** @type {Array<Array<[number, number]>>} */
  const segments = [];
  for (const line of rasterPolylines) {
    const simplified = simplifyPolyline(line, 2.8);
    const viewPts = lineToViewBox(simplified, rasterSize, viewBox);
    if (viewPts.length < 2 || pathLength(viewPts) < 8) continue;
    if (isClosedLikePolyline(viewPts)) continue;
    segments.push(viewPts);
  }

  return pruneOverlappingPolylines(segments);
}

/**
 * @param {string} groupId
 * @param {string} glyph
 * @param {string} fontFile
 * @param {number} fontSize
 */
export function buildGlyphAssets(groupId, glyph, fontFile, fontSize = 220) {
  const font = loadFont(fontFile);
  const { path: otPath } = getGlyphPath(font, glyph, fontSize);
  const { d: outlineD } = pathToViewBox(otPath, VIEWBOX);

  const readingDir = groupId.startsWith("he") ? "rtl" : "ltr";
  const manualPaths = getFullTracePathOverride(groupId, glyph);

  /** @type {Array<{ order: number, pathId: string, path: string, start: {x:number,y:number}, end: {x:number,y:number}, direction: string, arrow: boolean }>} */
  let strokes;
  let usedManualOverride = false;

  if (manualPaths?.length) {
    strokes = strokesFromManualPaths(manualPaths, readingDir);
    usedManualOverride = true;
  } else {
    let segments = extractCenterlineStrokes(otPath, RASTER_SIZE, VIEWBOX);
    if (!segments.length) {
      throw new Error(`No centerline segments for ${groupId}/${glyph}`);
    }
    segments = normalizeAutoTraceOrientation(segments, VIEWBOX);
    segments = orderStrokes(segments, readingDir);
    strokes = segments.map((pts, idx) => {
      const [sx, sy] = pts[0];
      const [ex, ey] = pts[pts.length - 1];
      return {
        order: idx + 1,
        pathId: `stroke-${idx + 1}`,
        path: polylineToPathD(pts),
        start: { x: sx, y: sy },
        end: { x: ex, y: ey },
        direction: directionOf(pts),
        arrow: true,
      };
    });
  }

  for (const stroke of strokes) {
    if (/\b[Zz]\b/.test(stroke.path)) {
      throw new Error(`${groupId}/${glyph}: stroke ${stroke.order} contains Z`);
    }
  }

  const strokePaths = strokes
    .map(
      (s) =>
        `<path id="${s.pathId}" d="${s.path}" fill="none" stroke="#334155" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("\n  ");
  const markers = strokes
    .map(
      (s) =>
        `<circle cx="${s.start.x}" cy="${s.start.y}" r="3" fill="#dc2626" data-stroke-start="${s.order}"/>` +
        `<circle cx="${s.end.x}" cy="${s.end.y}" r="2" fill="#16a34a" data-stroke-end="${s.order}"/>`
    )
    .join("\n  ");

  const strokeSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="none" data-glyph="${glyph}" data-group="${groupId}" data-centerline="true">
  ${strokePaths}
  ${markers}
</svg>
`;

  const strokeOrder = {
    glyphId: glyph,
    group: groupId,
    viewBox: VIEWBOX,
    strokeCount: strokes.length,
    strokes,
    alternatives: [],
    generatedBy: "build-glyph-assets",
    version: 1,
  };

  fs.mkdirSync(path.dirname(outlineSvgPath(groupId, glyph)), { recursive: true });
  fs.mkdirSync(path.dirname(strokePathSvgPath(groupId, glyph)), { recursive: true });
  fs.mkdirSync(path.dirname(strokeOrderJsonPath(groupId, glyph)), { recursive: true });

  fs.mkdirSync(path.dirname(fullTraceSvgPath(groupId, glyph)), { recursive: true });

  fs.writeFileSync(outlineSvgPath(groupId, glyph), outlineSvgContent(outlineD, VIEWBOX));
  const fullTraceSvg = fullTraceSvgFromStrokes(strokes, VIEWBOX, FULL_TRACE_SVG_OPTIONS);
  validateFullTraceSvg(fullTraceSvg, groupId, glyph);
  fs.writeFileSync(fullTraceSvgPath(groupId, glyph), fullTraceSvg);
  fs.writeFileSync(strokePathSvgPath(groupId, glyph), strokeSvg);
  fs.writeFileSync(strokeOrderJsonPath(groupId, glyph), `${JSON.stringify(strokeOrder, null, 2)}\n`);

  return { strokeCount: strokes.length, outlineD, usedManualOverride };
}
