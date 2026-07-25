/**
 * Fraction parse / equality helpers for Topic-3 diagnostics.
 */

/**
 * @param {unknown} v
 * @returns {number|null}
 */
function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number} a
 * @param {number} b
 */
export function gcdInt(a, b) {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * @param {number} n
 * @param {number} d
 * @returns {{ n: number, d: number }}
 */
export function reduceFraction(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return { n, d };
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = Math.abs(d);
  const g = gcdInt(nn, dd);
  return { n: nn / g, d: dd / g };
}

/**
 * Parse "a/b", mixed "w n/d", or finite number → {n,d}.
 * @param {unknown} raw
 * @returns {{ n: number, d: number }|null}
 */
export function parseFraction(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const n = num(/** @type {{ n?: unknown, num?: unknown }} */ (raw).n ?? /** @type {{ num?: unknown }} */ (raw).num);
    const d = num(/** @type {{ d?: unknown, den?: unknown }} */ (raw).d ?? /** @type {{ den?: unknown }} */ (raw).den);
    if (n != null && d != null && d !== 0) return { n, d };
  }
  const s = String(raw).trim().replace(/\s+/g, " ");
  if (!s) return null;

  const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = num(mixed[1]);
    const n = num(mixed[2]);
    const d = num(mixed[3]);
    if (whole == null || n == null || d == null || d === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return { n: sign * (Math.abs(whole) * d + n), d };
  }

  const simple = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (simple) {
    const n = num(simple[1]);
    const d = num(simple[2]);
    if (n == null || d == null || d === 0) return null;
    return { n, d };
  }

  const asNum = num(s);
  if (asNum != null) return { n: asNum, d: 1 };
  return null;
}

/**
 * @param {number} n
 * @param {number} d
 * @param {{ reduce?: boolean }} [opts]
 */
export function formatFraction(n, d, opts = {}) {
  const reduce = opts.reduce !== false;
  const f = reduce ? reduceFraction(n, d) : { n, d };
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

/**
 * Exact value equality after reduction.
 * @param {{ n: number, d: number }|null} a
 * @param {{ n: number, d: number }|null} b
 */
export function fractionsEqual(a, b) {
  if (!a || !b || a.d === 0 || b.d === 0) return false;
  const ra = reduceFraction(a.n, a.d);
  const rb = reduceFraction(b.n, b.d);
  return ra.n === rb.n && ra.d === rb.d;
}

/**
 * Same written form (no reduction) — for slip detection.
 * @param {{ n: number, d: number }|null} a
 * @param {{ n: number, d: number }|null} b
 */
export function fractionsSameWritten(a, b) {
  if (!a || !b) return false;
  return a.n === b.n && a.d === b.d;
}

export const TOPIC3_FRAC_COMPARE_KINDS = Object.freeze([
  "frac_compare_same_den",
  "frac_compare_like_den_g3",
  "frac_compare_like_den_g4",
]);

export const TOPIC3_FRAC_ADD_SUB_KINDS = Object.freeze([
  "frac_add",
  "frac_sub",
  "frac_add_sub",
  "frac_same_den_add",
  "frac_same_den_sub",
  "frac_same_den_add_g4",
  "frac_same_den_sub_g4",
]);

export const TOPIC3_FRAC_MUL_KINDS = Object.freeze(["frac_multiply"]);
export const TOPIC3_FRAC_DIV_KINDS = Object.freeze(["frac_divide"]);
export const TOPIC3_FRAC_SIMPLIFY_KINDS = Object.freeze([
  "frac_reduce",
  "frac_simplify_intro_g3",
  "frac_simplify_intro_g4",
]);

/**
 * @param {string} kind
 */
export function isTopic3FracKind(kind) {
  const k = kind != null ? String(kind).trim() : "";
  if (!k.startsWith("frac_") && !k.includes("frac")) return false;
  if (k.includes("probe")) return false;
  return true;
}
