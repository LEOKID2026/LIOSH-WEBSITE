/**
 * Seeded RNG for reproducible worksheet question sets.
 * @module lib/worksheets/worksheet-seeded-random.server
 */

/**
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run fn with Math.random replaced by a seeded PRNG.
 * @template T
 * @param {number} seed
 * @param {() => T} fn
 * @returns {T}
 */
export function withSeededRandom(seed, fn) {
  const original = Math.random;
  const rng = createSeededRandom(seed >>> 0);
  Math.random = rng;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
