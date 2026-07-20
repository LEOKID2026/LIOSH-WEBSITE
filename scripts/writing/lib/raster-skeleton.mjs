/**
 * Flatten opentype paths and rasterize to binary grid.
 */

/**
 * @param {import("opentype.js").PathCommand[]} commands
 * @param {number} samplesPerCurve
 * @returns {Array<[number, number]>}
 */
export function flattenCommands(commands, samplesPerCurve = 16) {
  /** @type {Array<[number, number]>} */
  const points = [];
  let cx = 0;
  let cy = 0;

  for (const cmd of commands) {
    if (cmd.type === "M") {
      cx = cmd.x;
      cy = cmd.y;
      points.push([cx, cy]);
    } else if (cmd.type === "L") {
      cx = cmd.x;
      cy = cmd.y;
      points.push([cx, cy]);
    } else if (cmd.type === "C") {
      for (let i = 1; i <= samplesPerCurve; i += 1) {
        const t = i / samplesPerCurve;
        const mt = 1 - t;
        const x =
          mt ** 3 * cx +
          3 * mt ** 2 * t * cmd.x1 +
          3 * mt * t ** 2 * cmd.x2 +
          t ** 3 * cmd.x;
        const y =
          mt ** 3 * cy +
          3 * mt ** 2 * t * cmd.y1 +
          3 * mt * t ** 2 * cmd.y2 +
          t ** 3 * cmd.y;
        points.push([x, y]);
      }
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === "Q") {
      for (let i = 1; i <= samplesPerCurve; i += 1) {
        const t = i / samplesPerCurve;
        const mt = 1 - t;
        const x = mt ** 2 * cx + 2 * mt * t * cmd.x1 + t ** 2 * cmd.x;
        const y = mt ** 2 * cy + 2 * mt * t * cmd.y1 + t ** 2 * cmd.y;
        points.push([x, y]);
      }
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === "Z") {
      if (points.length) points.push([points[0][0], points[0][1]]);
    }
  }
  return points;
}

/**
 * @param {import("opentype.js").Path} otPath
 * @returns {import("opentype.js").PathCommand[][]}
 */
export function splitSubpaths(otPath) {
  /** @type {import("opentype.js").PathCommand[][]} */
  const subpaths = [];
  /** @type {import("opentype.js").PathCommand[]} */
  let current = [];
  for (const cmd of otPath.commands) {
    if (cmd.type === "M") {
      if (current.length) subpaths.push(current);
      current = [cmd];
    } else {
      current.push(cmd);
    }
  }
  if (current.length) subpaths.push(current);
  return subpaths;
}

/**
 * @param {Array<[number, number]>} polygon
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function rasterizePolygon(polygon, width, height) {
  const grid = new Uint8Array(width * height);
  if (polygon.length < 3) return grid;

  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of polygon) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(height - 1, Math.ceil(maxY)); y += 1) {
    /** @type {number[]} */
    const nodes = [];
    for (let i = 0; i < polygon.length - 1; i += 1) {
      const [x1, y1] = polygon[i];
      const [x2, y2] = polygon[i + 1];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
        nodes.push(x);
      }
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i + 1 < nodes.length; i += 2) {
      const xStart = Math.max(0, Math.floor(nodes[i]));
      const xEnd = Math.min(width - 1, Math.ceil(nodes[i + 1]));
      for (let x = xStart; x <= xEnd; x += 1) {
        grid[y * width + x] = 1;
      }
    }
  }
  return grid;
}

/**
 * @param {import("opentype.js").Path} otPath
 * @param {number} size
 */
export function rasterizePath(otPath, size) {
  const bbox = otPath.getBoundingBox();
  const transform = createFontRasterTransform(bbox, size);

  const grid = new Uint8Array(size * size);
  for (const sub of splitSubpaths(otPath)) {
    const flat = flattenCommands(sub, 20).map(([x, y]) => fontPointToRaster(x, y, transform));
    const subGrid = rasterizePolygon(flat, size, size);
    for (let i = 0; i < grid.length; i += 1) {
      if (subGrid[i]) grid[i] = 1;
    }
  }

  return {
    grid,
    width: size,
    height: size,
    minX: transform.minX,
    minY: transform.minY,
    scale: transform.scale,
    bbox,
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} grid
 */
function neighborCount(x, y, width, height, grid) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && grid[ny * width + nx]) n += 1;
    }
  }
  return n;
}

/**
 * Zhang-Suen thinning (both sub-iterations).
 * @param {Uint8Array} grid
 * @param {number} width
 * @param {number} height
 */
export function skeletonize(grid, width, height) {
  const sk = new Uint8Array(grid);
  let changed = true;
  while (changed) {
    changed = false;
    for (let sub = 0; sub < 2; sub += 1) {
      /** @type {Array<[number, number]>} */
      const toRemove = [];
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          if (!sk[y * width + x]) continue;
          const n = neighborCount(x, y, width, height, sk);
          if (n < 2 || n > 6) continue;
          const p2 = sk[(y - 1) * width + x];
          const p4 = sk[y * width + x + 1];
          const p6 = sk[(y + 1) * width + x];
          const p8 = sk[y * width + x - 1];
          if (sub === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          toRemove.push([x, y]);
        }
      }
      if (toRemove.length) {
        changed = true;
        for (const [x, y] of toRemove) sk[y * width + x] = 0;
      }
    }
  }
  return sk;
}

/**
 * Remove short spur branches from skeleton.
 * @param {Uint8Array} sk
 * @param {number} width
 * @param {number} height
 * @param {number} minSpurLen
 */
export function pruneSkeletonSpurs(sk, width, height, minSpurLen = 12) {
  const out = new Uint8Array(sk);
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (!out[y * width + x]) continue;
        if (neighborCount(x, y, width, height, out) !== 1) continue;
        let cx = x;
        let cy = y;
        let len = 0;
        /** @type {Array<[number, number]>} */
        const branch = [[cx, cy]];
        while (true) {
          let next = null;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
              if (!out[ny * width + nx]) continue;
              if (branch.some(([bx, by]) => bx === nx && by === ny)) continue;
              next = [nx, ny];
              break;
            }
            if (next) break;
          }
          if (!next) break;
          branch.push(next);
          cx = next[0];
          cy = next[1];
          len += 1;
          if (neighborCount(cx, cy, width, height, out) !== 2) break;
        }
        if (len < minSpurLen && neighborCount(cx, cy, width, height, out) !== 1) {
          for (const [bx, by] of branch) out[by * width + bx] = 0;
          changed = true;
        }
      }
    }
  }
  return out;
}

/**
 * Rasterize a polyline as a thick stroke (for open subpaths).
 * @param {Array<[number, number]>} points
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
export function rasterizeStroke(points, width, height, radius = 3) {
  const grid = new Uint8Array(width * height);
  for (const [px, py] of points) {
    const cx = Math.round(px);
    const cy = Math.round(py);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < width && y < height) grid[y * width + x] = 1;
      }
    }
  }
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const cx = Math.round(px);
      const cy = Math.round(py);
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && y >= 0 && x < width && y < height) grid[y * width + x] = 1;
        }
      }
    }
  }
  return grid;
}

/**
 * Walk skeleton from endpoints — robust polyline extraction.
 * @param {Uint8Array} sk
 * @param {number} width
 * @param {number} height
 * @returns {Array<Array<[number, number]>>}
 */
export function walkSkeletonLines(sk, width, height) {
  const visited = new Uint8Array(sk.length);
  /** @type {Array<Array<[number, number]>>} */
  const polylines = [];

  function degree(x, y) {
    let d = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && sk[ny * width + nx]) d += 1;
      }
    }
    return d;
  }

  function walkFrom(sx, sy) {
    /** @type {Array<[number, number]>} */
    const line = [[sx, sy]];
    visited[sy * width + sx] = 1;
    let x = sx;
    let y = sy;
    while (true) {
      let found = false;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const idx = ny * width + nx;
          if (sk[idx] && !visited[idx]) {
            visited[idx] = 1;
            line.push([nx, ny]);
            x = nx;
            y = ny;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) break;
    }
    return line;
  }

  /** @type {Array<[number, number]>} */
  const endpoints = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (sk[y * width + x] && degree(x, y) === 1) endpoints.push([x, y]);
    }
  }

  for (const [x, y] of endpoints) {
    if (!visited[y * width + x]) {
      const line = walkFrom(x, y);
      if (line.length >= 5) polylines.push(line);
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (sk[y * width + x] && !visited[y * width + x]) {
        const line = walkFrom(x, y);
        if (line.length >= 5) polylines.push(line);
      }
    }
  }

  polylines.sort((a, b) => b.length - a.length);
  return polylines;
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function skeletonEdgeKey(x1, y1, x2, y2) {
  const a = `${x1},${y1}`;
  const b = `${x2},${y2}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Uint8Array} sk
 * @param {number} width
 * @param {number} height
 */
function skeletonNeighbors(x, y, sk, width, height) {
  /** @type {Array<[number, number]>} */
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && sk[ny * width + nx]) {
        neighbors.push([nx, ny]);
      }
    }
  }
  return neighbors;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Uint8Array} sk
 * @param {number} width
 * @param {number} height
 */
function skeletonDegree(x, y, sk, width, height) {
  return skeletonNeighbors(x, y, sk, width, height).length;
}

/**
 * Break a closed skeleton loop into an open polyline (no Z).
 * @param {Array<[number, number]>} line
 */
function openSkeletonLoop(line) {
  if (line.length < 4) return line;
  const [sx, sy] = line[0];
  const [ex, ey] = line[line.length - 1];
  if (Math.hypot(ex - sx, ey - sy) >= 3) return line;

  let breakIdx = 0;
  for (let i = 1; i < line.length; i += 1) {
    const [x, y] = line[i];
    const [bx, by] = line[breakIdx];
    if (y < by - 0.01 || (Math.abs(y - by) < 0.01 && x < bx)) breakIdx = i;
  }

  const open = [...line.slice(breakIdx), ...line.slice(0, breakIdx)];
  if (open.length >= 2) {
    const [fx, fy] = open[0];
    const [lx, ly] = open[open.length - 1];
    if (Math.hypot(lx - fx, ly - fy) < 3) open.pop();
  }
  return open;
}

/**
 * Graph-based skeleton tracer — each edge consumed exactly once.
 * @param {Uint8Array} sk
 * @param {number} width
 * @param {number} height
 * @param {number} [minLen=5]
 * @returns {Array<Array<[number, number]>>}
 */
export function traceSkeletonGraph(sk, width, height, minLen = 5) {
  const visitedEdges = new Set();
  /** @type {Array<Array<[number, number]>>} */
  const polylines = [];

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} nextX
   * @param {number} nextY
   */
  function walkEdge(startX, startY, nextX, nextY) {
    /** @type {Array<[number, number]>} */
    const line = [[startX, startY]];
    let px = startX;
    let py = startY;
    let cx = nextX;
    let cy = nextY;
    visitedEdges.add(skeletonEdgeKey(px, py, cx, cy));

    while (true) {
      line.push([cx, cy]);
      if (skeletonDegree(cx, cy, sk, width, height) !== 2) break;

      const neighbors = skeletonNeighbors(cx, cy, sk, width, height);
      let found = null;
      for (const [nx, ny] of neighbors) {
        const ek = skeletonEdgeKey(cx, cy, nx, ny);
        if (!visitedEdges.has(ek) && !(nx === px && ny === py)) {
          found = [nx, ny];
          visitedEdges.add(ek);
          break;
        }
      }
      if (!found) break;
      px = cx;
      py = cy;
      cx = found[0];
      cy = found[1];
    }

    return openSkeletonLoop(line);
  }

  /** @type {Array<[number, number]>} */
  const nodes = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!sk[y * width + x]) continue;
      if (skeletonDegree(x, y, sk, width, height) !== 2) nodes.push([x, y]);
    }
  }

  for (const [nx, ny] of nodes) {
    for (const [mx, my] of skeletonNeighbors(nx, ny, sk, width, height)) {
      const ek = skeletonEdgeKey(nx, ny, mx, my);
      if (visitedEdges.has(ek)) continue;
      const line = walkEdge(nx, ny, mx, my);
      if (line.length >= minLen) polylines.push(line);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!sk[y * width + x]) continue;
      for (const [mx, my] of skeletonNeighbors(x, y, sk, width, height)) {
        const ek = skeletonEdgeKey(x, y, mx, my);
        if (visitedEdges.has(ek)) continue;
        const line = walkEdge(x, y, mx, my);
        if (line.length >= minLen) polylines.push(line);
        break;
      }
    }
  }

  polylines.sort((a, b) => b.length - a.length);
  return polylines;
}

/**
 * @param {Array<[number, number]>} pts
 */
function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

/**
 * @param {Array<[number, number]>} pts
 * @param {number} spacing
 */
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
  const last = pts[pts.length - 1];
  const prev = samples[samples.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > 0.5) samples.push(last);
  return samples;
}

/**
 * @param {[number, number]} point
 * @param {Array<[number, number]>} pts
 */
function minDistToPolyline(point, pts) {
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(point[0] - pts[0][0], point[1] - pts[0][1]);
  let min = Infinity;
  for (let i = 1; i < pts.length; i += 1) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((point[0] - x1) * dx + (point[1] - y1) * dy) / lenSq));
    }
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    min = Math.min(min, Math.hypot(point[0] - px, point[1] - py));
  }
  return min;
}

/**
 * @param {Array<[number, number]>} shorter
 * @param {Array<[number, number]>} longer
 * @param {number} [threshold=2.5]
 */
function overlapRatio(shorter, longer, threshold = 2.5) {
  const samples = samplePolyline(shorter, 2);
  if (!samples.length) return 0;
  let near = 0;
  for (const p of samples) {
    if (minDistToPolyline(p, longer) <= threshold) near += 1;
  }
  return near / samples.length;
}

/**
 * Drop shorter polylines that geometrically overlap a longer one.
 * @param {Array<Array<[number, number]>>} polylines
 * @param {number} [threshold=2.5]
 * @param {number} [ratio=0.35]
 */
export function pruneOverlappingPolylines(polylines, threshold = 2.5, ratio = 0.35) {
  /** @type {Array<{ line: Array<[number, number]>, idx: number, len: number }>} */
  const ranked = polylines.map((line, idx) => ({ line, idx, len: polylineLength(line) }));
  ranked.sort((a, b) => b.len - a.len);
  const removed = new Set();

  for (let i = 0; i < ranked.length; i += 1) {
    if (removed.has(ranked[i].idx)) continue;
    for (let j = i + 1; j < ranked.length; j += 1) {
      if (removed.has(ranked[j].idx)) continue;
      const shorter = ranked[j].line;
      const longer = ranked[i].line;
      const forward = overlapRatio(shorter, longer, threshold);
      const reverse = overlapRatio(longer, shorter, threshold);
      if (forward > ratio || (forward > 0.8 && reverse > 0.8)) {
        removed.add(ranked[j].idx);
      }
    }
  }

  return polylines.filter((_, idx) => !removed.has(idx));
}

/** @deprecated alias */
export const traceSkeletonPolylines = walkSkeletonLines;

/**
 * @param {{ x1: number, y1: number, x2: number, y2: number }} bbox
 * @param {number} rasterSize
 * @param {number} [padRatio=0.08]
 */
export function createFontRasterTransform(bbox, rasterSize, padRatio = 0.08) {
  const pad = Math.max(bbox.x2 - bbox.x1, bbox.y2 - bbox.y1) * padRatio || 10;
  const minX = bbox.x1 - pad;
  const minY = bbox.y1 - pad;
  const scale =
    (rasterSize - 4) / Math.max(bbox.x2 - bbox.x1 + 2 * pad, bbox.y2 - bbox.y1 + 2 * pad);
  return { minX, minY, scale, rasterSize };
}

/**
 * Font coordinates → raster (Y-down). Y is flipped exactly once here.
 * @param {number} fontX
 * @param {number} fontY
 * @param {{ minX: number, minY: number, scale: number, rasterSize: number }} transform
 * @returns {[number, number]}
 */
export function fontPointToRaster(fontX, fontY, transform) {
  const mappedX = (fontX - transform.minX) * transform.scale + 2;
  const mappedFontY = (fontY - transform.minY) * transform.scale + 2;
  return [mappedX, transform.rasterSize - mappedFontY];
}

/**
 * Raster (Y-down) → SVG viewBox (Y-down). Scale only — no second Y flip.
 * @param {number} rasterX
 * @param {number} rasterY
 * @param {number} rasterSize
 * @param {number} viewBox
 * @returns {[number, number]}
 */
export function rasterPointToViewBox(rasterX, rasterY, rasterSize, viewBox) {
  const scale = viewBox / rasterSize;
  return [
    Math.round(rasterX * scale * 10) / 10,
    Math.round(rasterY * scale * 10) / 10,
  ];
}

/**
 * @param {Array<[number, number]>} line
 * @param {number} rasterSize
 * @param {number} viewBox
 */
export function lineToViewBox(line, rasterSize, viewBox) {
  return line.map(([x, y]) => rasterPointToViewBox(x, y, rasterSize, viewBox));
}

/**
 * @param {Array<[number, number]>} pts
 */
export function polylineToPathD(pts) {
  if (!pts.length) return "";
  const [fx, fy] = pts[0];
  let d = `M ${fx} ${fy}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}

/**
 * Ramer-Douglas-Peucker simplification.
 * @param {Array<[number, number]>} pts
 * @param {number} epsilon
 */
export function simplifyPolyline(pts, epsilon = 1.8) {
  if (pts.length <= 2) return pts;

  function perpDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    const proj = [a[0] + t * dx, a[1] + t * dy];
    return Math.hypot(p[0] - proj[0], p[1] - proj[1]);
  }

  function rdp(points) {
    let maxD = 0;
    let idx = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const d = perpDist(points[i], points[0], points[points.length - 1]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon) {
      const left = rdp(points.slice(0, idx + 1));
      const right = rdp(points.slice(idx));
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[points.length - 1]];
  }

  return rdp(pts);
}

/**
 * @param {import("opentype.js").PathCommand[]} sub
 * @param {Array<[number, number]>} flatFont
 */
export function isClosedContour(sub, flatFont) {
  if (sub.some((c) => c.type === "Z")) return true;
  if (flatFont.length < 4) return false;
  const [fx, fy] = flatFont[0];
  const [lx, ly] = flatFont[flatFont.length - 1];
  return Math.hypot(lx - fx, ly - fy) < Math.max(2, (flatFont[1]?.[0] ?? 0) * 0.01);
}

/**
 * @param {Array<[number, number]>} polygon
 * @param {number} coord
 * @param {"horizontal" | "vertical"} axis
 */
function scanlineIntersections(polygon, coord, axis) {
  /** @type {number[]} */
  const hits = [];
  for (let i = 0; i < polygon.length - 1; i += 1) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[i + 1];
    if (axis === "horizontal") {
      const y = coord;
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        hits.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    } else {
      const x = coord;
      if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
        hits.push(y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
      }
    }
  }
  hits.sort((a, b) => a - b);
  return hits;
}

/**
 * Even-odd fill raster for multiple closed contours (preserves holes).
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} width
 * @param {number} height
 */
export function rasterizeCompoundEvenOdd(polygons, width, height) {
  const grid = new Uint8Array(width * height);

  let minY = Infinity;
  let maxY = -Infinity;

  for (const polygon of polygons) {
    for (const [, y] of polygon) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(height - 1, Math.floor(maxY)); y += 1) {
    /** @type {number[]} */
    const hits = [];

    for (const polygon of polygons) {
      hits.push(...scanlineIntersections(polygon, y, "horizontal"));
    }

    hits.sort((a, b) => a - b);

    for (let i = 0; i + 1 < hits.length; i += 2) {
      const x1 = Math.max(0, Math.ceil(hits[i]));
      const x2 = Math.min(width - 1, Math.floor(hits[i + 1]));

      for (let x = x1; x <= x2; x += 1) {
        grid[y * width + x] = 1;
      }
    }
  }

  return grid;
}

/**
 * Chamfer distance transform — distance from each filled pixel to nearest empty pixel.
 * @param {Uint8Array} grid
 * @param {number} width
 * @param {number} height
 */
export function distanceTransform(grid, width, height) {
  const dist = new Float32Array(width * height);
  const INF = width + height;

  for (let i = 0; i < dist.length; i += 1) {
    dist[i] = grid[i] ? INF : 0;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) d = Math.min(d, dist[i - width] + 1);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - width - 1] + 1.414);
      if (x + 1 < width && y > 0) d = Math.min(d, dist[i - width + 1] + 1.414);
      dist[i] = d;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      let d = dist[i];
      if (x + 1 < width) d = Math.min(d, dist[i + 1] + 1);
      if (y + 1 < height) d = Math.min(d, dist[i + width] + 1);
      if (x + 1 < width && y + 1 < height) d = Math.min(d, dist[i + width + 1] + 1.414);
      if (x > 0 && y + 1 < height) d = Math.min(d, dist[i + width - 1] + 1.414);
      dist[i] = d;
    }
  }

  return dist;
}

/**
 * Medial-axis ridge pixels from distance transform (local maxima).
 * @param {Float32Array} dist
 * @param {Uint8Array} grid
 * @param {number} width
 * @param {number} height
 * @param {number} [minDist=1.5]
 */
export function medialAxisFromDistance(dist, grid, width, height, minDist = 1.5) {
  const sk = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      const d = dist[i];
      if (d < minDist) continue;

      let isRidge = true;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const ni = (y + dy) * width + (x + dx);
          if (grid[ni] && dist[ni] > d + 0.01) {
            isRidge = false;
            break;
          }
        }
        if (!isRidge) break;
      }

      if (isRidge) sk[i] = 1;
    }
  }

  return sk;
}

/**
 * Medial-axis skeleton from filled grid via distance-transform ridges.
 * Replaces naive Zhang-Suen on solid block glyphs (which fragments).
 * @param {Uint8Array} grid
 * @param {number} width
 * @param {number} height
 */
export function skeletonizeFilledGrid(grid, width, height) {
  const dist = distanceTransform(grid, width, height);
  const ridges = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      const d = dist[i];
      if (d < 1.5) continue;

      const left = grid[i - 1] ? dist[i - 1] : 0;
      const right = grid[i + 1] ? dist[i + 1] : 0;
      const up = grid[i - width] ? dist[i - width] : 0;
      const down = grid[i + width] ? dist[i + width] : 0;

      const hRidge = d >= left && d >= right && (d > left + 0.01 || d > right + 0.01);
      const vRidge = d >= up && d >= down && (d > up + 0.01 || d > down + 0.01);

      if (hRidge || vRidge) ridges[i] = 1;
    }
  }

  let sk = skeletonize(ridges, width, height);
  if (sk.reduce((a, b) => a + b, 0) < 8) {
    sk = skeletonize(grid, width, height);
  }
  return sk;
}

/**
 * Mark horizontal + vertical scanline center pixels on a grid (even-odd).
 * Used as medial-axis seed for graph tracing — not dual polyline output.
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} width
 * @param {number} height
 */
export function medialSkeletonGridFromScanlines(polygons, width, height) {
  const grid = new Uint8Array(width * height);

  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const polygon of polygons) {
    for (const [x, y] of polygon) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
    /** @type {number[]} */
    const hits = [];
    for (const polygon of polygons) {
      hits.push(...scanlineIntersections(polygon, y, "horizontal"));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const cx = Math.round((hits[i] + hits[i + 1]) / 2);
      if (cx >= 0 && cx < width && y >= 0 && y < height) grid[y * width + cx] = 1;
    }
  }

  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += 1) {
    /** @type {number[]} */
    const hits = [];
    for (const polygon of polygons) {
      hits.push(...scanlineIntersections(polygon, x, "vertical"));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const cy = Math.round((hits[i] + hits[i + 1]) / 2);
      if (cy >= 0 && cy < height && x >= 0 && x < width) grid[cy * width + x] = 1;
    }
  }

  return grid;
}

/**
 * Medial polylines from closed raster polygons via even-odd fill + graph skeleton.
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} width
 * @param {number} height
 * @param {number} [minLen=5]
 */
export function medialPolylinesFromPolygons(polygons, width, height, minLen = 5) {
  const grid = rasterizeCompoundEvenOdd(polygons, width, height);
  let sk = skeletonizeFilledGrid(grid, width, height);
  sk = pruneSkeletonSpurs(sk, width, height, 4);

  let lines = traceSkeletonGraph(sk, width, height, minLen);
  const graphCoverage = lines.reduce((sum, line) => sum + line.length, 0);

  if (graphCoverage < minLen * 4) {
    sk = medialSkeletonGridFromScanlines(polygons, width, height);
    sk = pruneSkeletonSpurs(sk, width, height, 4);
    lines = traceSkeletonGraph(sk, width, height, minLen);
  }

  return lines;
}

/**
 * @param {Array<{ coord: number, centers: Array<[number, number, number]> }>} rows
 * @param {"horizontal" | "vertical"} axis
 * @param {number} minChainLen
 */
function traceScanRowsIntoPolylines(rows, axis, minChainLen = 8) {
  /** @type {Array<Array<[number, number]>>} */
  let active = [];
  /** @type {Array<Array<[number, number]>>} */
  const finished = [];

  for (const row of rows) {
    /** @type {Array<Array<[number, number]>>} */
    const next = [];
    const used = new Set();

    for (const center of row.centers) {
      const primary = center[0];
      const secondary = row.coord;
      /** @type {[number, number]} */
      const pt = axis === "horizontal" ? [primary, secondary] : [secondary, primary];
      const width = center[2];

      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < active.length; i += 1) {
        if (used.has(i)) continue;
        const chain = active[i];
        const [px, py] = chain[chain.length - 1];
        const step = axis === "horizontal" ? secondary - py : secondary - px;
        if (step <= 0 || step > 4) continue;
        const dist = Math.hypot(pt[0] - px, pt[1] - py);
        const limit = Math.max(width * 1.8, 18);
        if (dist < bestDist && dist <= limit) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        active[bestIdx].push(pt);
        used.add(bestIdx);
        next.push(active[bestIdx]);
      } else {
        next.push([pt]);
      }
    }

    for (let i = 0; i < active.length; i += 1) {
      if (!used.has(i) && active[i].length >= minChainLen) finished.push(active[i]);
    }
    active = next;
  }

  for (const chain of active) {
    if (chain.length >= minChainLen) finished.push(chain);
  }
  return finished;
}

/**
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} coord
 * @param {"horizontal" | "vertical"} axis
 */
function scanlineIntersectionsCompound(polygons, coord, axis) {
  /** @type {number[]} */
  const hits = [];
  for (const polygon of polygons) {
    hits.push(...scanlineIntersections(polygon, coord, axis));
  }
  hits.sort((a, b) => a - b);
  return hits;
}

/**
 * Medial-ish centerlines from one or more closed contours (even-odd fill).
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} width
 * @param {number} height
 * @param {number} minChainLen
 */
export function scanlineCenterlinesCompound(polygons, width, height, minChainLen = 8) {
  if (!polygons.length) return [];

  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const polygon of polygons) {
    for (const [x, y] of polygon) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  /** @type {Array<Array<[number, number]>>} */
  const polylines = [];

  /** @type {Array<{ coord: number, centers: Array<[number, number, number]> }>} */
  const hRows = [];
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
    const xs = scanlineIntersectionsCompound(polygons, y, "horizontal");
    /** @type {Array<[number, number, number]>} */
    const centers = [];
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const span = xs[i + 1] - xs[i];
      if (span >= 3) centers.push([(xs[i] + xs[i + 1]) / 2, y, span]);
    }
    if (centers.length) hRows.push({ coord: y, centers });
  }
  polylines.push(...traceScanRowsIntoPolylines(hRows, "horizontal", minChainLen));

  /** @type {Array<{ coord: number, centers: Array<[number, number, number]> }>} */
  const vRows = [];
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += 1) {
    const ys = scanlineIntersectionsCompound(polygons, x, "vertical");
    /** @type {Array<[number, number, number]>} */
    const centers = [];
    for (let i = 0; i + 1 < ys.length; i += 2) {
      const span = ys[i + 1] - ys[i];
      if (span >= 3) centers.push([(ys[i] + ys[i + 1]) / 2, x, span]);
    }
    if (centers.length) vRows.push({ coord: x, centers });
  }
  polylines.push(...traceScanRowsIntoPolylines(vRows, "vertical", minChainLen));

  polylines.sort((a, b) => b.length - a.length);
  return polylines;
}

/**
 * Medial-ish centerlines from filled polygon via horizontal + vertical scan pairing.
 * @param {Array<[number, number]>} polygon
 * @param {number} width
 * @param {number} height
 * @param {number} minChainLen
 */
export function scanlineCenterlines(polygon, width, height, minChainLen = 8) {
  if (polygon.length < 4) return [];
  return scanlineCenterlinesCompound([polygon], width, height, minChainLen);
}

/**
 * @param {Array<Array<[number, number]>>} polygons
 * @param {number} width
 * @param {number} height
 * @param {number} minChainLen
 */
export function scanlineCenterlinesFromPolygons(polygons, width, height, minChainLen = 8) {
  /** @type {Array<Array<[number, number]>>} */
  const closed = polygons.filter((poly) => poly.length >= 4);
  if (!closed.length) return [];
  if (closed.length === 1) {
    const minChain = closed[0].length <= 12 ? 3 : minChainLen;
    return scanlineCenterlines(closed[0], width, height, minChain);
  }
  return scanlineCenterlinesCompound(closed, width, height, minChainLen);
}

/**
 * @param {Array<[number, number]>} poly
 */
export function polygonCentroid(poly) {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return [x / poly.length, y / poly.length];
}

/**
 * @param {number} px
 * @param {number} py
 * @param {Array<[number, number]>} poly
 */
export function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * @param {Array<Array<[number, number]>>} polylines
 */
export function dedupePolylines(polylines) {
  /** @type {Array<Array<[number, number]>>} */
  const kept = [];
  for (const line of polylines) {
    const dup = kept.some((other) => {
      if (Math.abs(other.length - line.length) > 4) return false;
      const [ax, ay] = line[0];
      const [bx, by] = line[line.length - 1];
      const [ox, oy] = other[0];
      const [px, py] = other[other.length - 1];
      const sameDir = Math.hypot(ax - ox, ay - oy) < 8 && Math.hypot(bx - px, by - py) < 8;
      const revDir = Math.hypot(ax - px, ay - py) < 8 && Math.hypot(bx - ox, by - oy) < 8;
      return sameDir || revDir;
    });
    if (!dup) kept.push(line);
  }
  return kept;
}

/**
 * Centerline from a single subpath contour.
 * @param {import("opentype.js").PathCommand[]} subCommands
 * @param {{ minX: number, minY: number, scale: number, width: number, height: number }} transform
 */
export function centerlineFromSubpath(subCommands, transform) {
  const flat = flattenCommands(subCommands, 24).map(([x, y]) =>
    fontPointToRaster(x, y, {
      minX: transform.minX,
      minY: transform.minY,
      scale: transform.scale,
      rasterSize: transform.width,
    })
  );
  let grid = rasterizePolygon(flat, transform.width, transform.height);
  let sk = skeletonize(grid, transform.width, transform.height);
  sk = pruneSkeletonSpurs(sk, transform.width, transform.height, 10);
  const lines = traceSkeletonPolylines(sk, transform.width, transform.height);
  return lines[0] || null;
}
