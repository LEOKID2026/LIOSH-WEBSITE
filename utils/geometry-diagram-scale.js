/**
 * Geometry diagram: map numeric measures to SVG pixel sizes (approximate ratios, readable mins).
 */

const BOX = {
  maxW: 236,
  maxH: 132,
  minW: 56,
  minH: 22,
};

/**
 * Horizontal extent vs vertical extent matching base : height numeric ratio.
 * @returns {{ w: number, h: number }}
 */
export function scaleBaseToHeight(base, height, overrides = {}) {
  const B = Math.max(Number(base) || 0, 1e-9);
  const H = Math.max(Number(height) || 0, 1e-9);
  const maxW = overrides.maxW ?? BOX.maxW;
  const maxH = overrides.maxH ?? BOX.maxH;
  const minW = overrides.minW ?? BOX.minW;
  const minH = overrides.minH ?? BOX.minH;

  let k = Math.min(maxW / B, maxH / H);
  let w = B * k;
  let h = H * k;

  const need = Math.max(w < minW ? minW / w : 1, h < minH ? minH / h : 1);
  if (need > 1) {
    k *= need;
    w = B * k;
    h = H * k;
  }
  if (w > maxW || h > maxH) {
    const shrink = Math.min(maxW / w, maxH / h);
    w *= shrink;
    h *= shrink;
  }
  return { w, h };
}

/**
 * Rectangle: length (horizontal) vs width (vertical in our layout).
 */
export function scaleLengthToWidth(length, width, overrides = {}) {
  return scaleBaseToHeight(length, width, overrides);
}

/**
 * Trapezoid vertical spacing and horizontal spans for bases.
 */
export function scaleTrapezoid(base1, base2, height, overrides = {}) {
  const b1 = Math.max(Number(base1) || 0, 1e-9);
  const b2 = Math.max(Number(base2) || 0, 1e-9);
  const ht = Math.max(Number(height) || 0, 1e-9);
  const maxW = overrides.maxW ?? 240;
  const maxH = overrides.maxH ?? 128;
  const minW = overrides.minW ?? 48;
  const minH = overrides.minH ?? 24;

  let k = Math.min(maxW / Math.max(b1, b2), maxH / ht);
  let bottomW = b1 * k;
  let topW = b2 * k;
  let h = ht * k;

  const need = Math.max(
    bottomW < minW ? minW / bottomW : 1,
    topW < minW ? minW / topW : 1,
    h < minH ? minH / h : 1
  );
  if (need > 1) {
    k *= need;
    bottomW = b1 * k;
    topW = b2 * k;
    h = ht * k;
  }
  if (bottomW > maxW || topW > maxW || h > maxH) {
    const shrink = Math.min(maxW / Math.max(bottomW, topW), maxH / h);
    bottomW *= shrink;
    topW *= shrink;
    h *= shrink;
  }
  return { bottomW, topW, h };
}

/**
 * Circle radius in SVG units from numeric radius (bounded, monotonic).
 */
export function scaleCircleRadius(radius, overrides = {}) {
  const r = Math.max(Number(radius) || 0, 1e-9);
  const rMin = overrides.rMin ?? 38;
  const rMax = overrides.rMax ?? 88;
  const ref = overrides.ref ?? 6;
  const linear = rMin + ((rMax - rMin) * Math.min(r / ref, 2.5)) / 2.5;
  return Math.round(Math.max(rMin, Math.min(rMax, linear)));
}

/**
 * Square side visual size (equal w and h), weakly scales with numeric side.
 */
export function scaleSquareSide(side, overrides = {}) {
  const s = Math.max(Number(side) || 0, 1e-9);
  const base = overrides.base ?? 150;
  const minS = overrides.minS ?? 112;
  const maxS = overrides.maxS ?? 178;
  const t = Math.min(s / 12, 1.35);
  const size = Math.round(base + (maxS - base) * (t / 1.35));
  return Math.max(minS, Math.min(maxS, size));
}

/**
 * Parallelogram: base along bottom, vertical = height; skew is fixed (not data).
 */
export function scaleParallelogram(base, height, overrides = {}) {
  const { w, h } = scaleBaseToHeight(base, height, {
    maxW: 232,
    maxH: 118,
    minW: 64,
    minH: 26,
    ...overrides,
  });
  const skew = overrides.skew ?? Math.min(44, w * 0.22);
  return { w, h, skew };
}

/**
 * Right triangle legs: horizontal = b, vertical = a (Pythagoras layout).
 */
export function scalePythagorasLegs(a, b, overrides = {}) {
  return scaleBaseToHeight(b, a, {
    maxW: 168,
    maxH: 142,
    minW: 46,
    minH: 40,
    ...overrides,
  });
}

function triangleHeightFromBase(a, b, c) {
  const p = (a + b + c) / 2;
  const inner = p * (p - a) * (p - b) * (p - c);
  if (inner <= 0) return a * 0.45;
  return (2 * Math.sqrt(inner)) / Math.max(a, 1e-9);
}

/**
 * Triangle from three side lengths (scaled, bounded). Bottom edge = side1 (left→right).
 * Extreme ratios are capped so vertices stay printable; labels carry true lengths.
 */
export function triangleVerticesFromSides(side1, side2, side3) {
  let s1 = Math.max(Number(side1) || 0, 1e-9);
  let s2 = Math.max(Number(side2) || 0, 1e-9);
  let s3 = Math.max(Number(side3) || 0, 1e-9);

  // Cap aspect before layout so a tiny base / huge side cannot explode SVG space.
  const maxSide = Math.max(s1, s2, s3);
  const minSide = Math.min(s1, s2, s3);
  if (maxSide / minSide > 2.8) {
    // Fall back to a readable schematic proportion; caller may still label true lengths.
    s1 = 6;
    s2 = 7;
    s3 = 8;
  }

  const maxW = 160;
  const maxH = 100;
  const hEst = triangleHeightFromBase(s1, s2, s3);
  let k = Math.min(maxW / s1, maxH / Math.max(hEst, 1e-6));
  const L = s1 * k;
  const t2 = s2 * k;
  const t3 = s3 * k;

  if (s1 + s2 <= s3 || s1 + s3 <= s2 || s2 + s3 <= s1) {
    return isoscelesTriangleLayout(6, 7, 8, Math.min(maxW / 6, maxH / 5));
  }

  const x0 = 0;
  const y0 = 0;
  const x1 = L;
  const y1 = 0;
  const x = (t3 * t3 - t2 * t2 + L * L) / (2 * L);
  const ySq = t3 * t3 - x * x;
  if (ySq <= 1e-6) return isoscelesTriangleLayout(6, 7, 8, Math.min(maxW / 6, maxH / 5));

  const y = Math.sqrt(ySq);
  const x2 = x;
  const y2 = -y;
  const minY = Math.min(y0, y1, y2);
  const shiftY = -minY;
  return {
    x0,
    y0: y0 + shiftY,
    x1,
    y1: y1 + shiftY,
    x2,
    y2: y2 + shiftY,
    k,
  };
}

function isoscelesTriangleLayout(s1, s2, s3, k) {
  const L = s1 * k;
  const t3 = s3 * k;
  const half = L / 2;
  const h = Math.sqrt(Math.max(0, t3 * t3 - half * half));
  const x0 = 0;
  const y0 = h;
  const x1 = L;
  const y1 = h;
  const x2 = half;
  const y2 = 0;
  return { x0, y0, x1, y1, x2, y2, k };
}
