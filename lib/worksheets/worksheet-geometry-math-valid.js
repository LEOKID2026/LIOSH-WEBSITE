/**
 * Mathematical validity gates for printable geometry worksheet items.
 * @module lib/worksheets/worksheet-geometry-math-valid
 */

/**
 * Strict triangle inequality (positive finite sides).
 * @param {unknown} a
 * @param {unknown} b
 * @param {unknown} c
 * @returns {boolean}
 */
export function triangleSidesValid(a, b, c) {
  const x = Number(a);
  const y = Number(b);
  const z = Number(c);
  if (![x, y, z].every((n) => Number.isFinite(n) && n > 0)) return false;
  return x + y > z && x + z > y && y + z > x;
}

/**
 * @param {unknown} n
 * @returns {boolean}
 */
export function isPositiveFinite(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Sample three side lengths that form a real triangle within maxSide.
 * @param {number} maxSide
 * @returns {{ side1: number, side2: number, side3: number }}
 */
export function pickValidTriangleSides(maxSide) {
  const cap = Math.max(3, Math.floor(Number(maxSide) || 3));
  for (let i = 0; i < 80; i += 1) {
    const side1 = Math.floor(Math.random() * cap) + 1;
    const side2 = Math.floor(Math.random() * cap) + 1;
    const side3 = Math.floor(Math.random() * cap) + 1;
    if (triangleSidesValid(side1, side2, side3)) {
      return { side1, side2, side3 };
    }
  }
  return { side1: 3, side2: 4, side3: 5 };
}

/**
 * Reject print candidates with impossible / incomplete numeric data.
 * @param {Record<string, unknown>|null|undefined} params
 * @returns {boolean}
 */
export function isGeometryWorksheetParamsMathValid(params) {
  if (!params || typeof params !== "object") return true;
  const kind = String(params.kind || "").replace(/^story_/, "");

  if (
    kind === "triangle_perimeter" ||
    (params.side1 != null && params.side2 != null && params.side3 != null && /triangle/.test(kind))
  ) {
    if (!triangleSidesValid(params.side1, params.side2, params.side3)) return false;
  }

  const positiveKeys = [
    "side",
    "base",
    "height",
    "radius",
    "length",
    "width",
    "base1",
    "base2",
    "area",
    "diagonal",
    "a",
    "b",
    "c",
    "side1",
    "side2",
    "side3",
  ];
  for (const key of positiveKeys) {
    if (params[key] == null) continue;
    if (typeof params[key] === "number" && !isPositiveFinite(params[key])) return false;
  }

  if (kind === "heights_triangle" || kind === "heights_parallelogram") {
    if (!isPositiveFinite(params.base) || !isPositiveFinite(params.area)) return false;
    if (params.height != null && !isPositiveFinite(params.height)) return false;
  }

  if (kind === "diagonal_square" && !isPositiveFinite(params.side)) return false;
  if (
    (kind === "diagonal_rectangle" || kind === "diagonal_parallelogram") &&
    (!isPositiveFinite(params.side) || !isPositiveFinite(params.width))
  ) {
    return false;
  }

  return true;
}
