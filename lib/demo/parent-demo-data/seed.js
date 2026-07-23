import { PARENT_DEMO_DATA_VERSION } from "./constants.js";

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * @param {...string} parts
 * @returns {number} unsigned 32-bit
 */
export function demoSeedHash32(...parts) {
  const key = [String(PARENT_DEMO_DATA_VERSION), ...parts].join("|");
  return xmur3(key)();
}

/**
 * @param {...string} parts
 * @returns {() => number} 0..1
 */
export function demoSeededRandom(...parts) {
  let state = demoSeedHash32(...parts);
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {() => number} rnd
 * @param {number} min
 * @param {number} max inclusive
 */
export function demoRandInt(rnd, min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

/**
 * @param {() => number} rnd
 * @param {readonly string[]} items
 */
export function demoPick(rnd, items) {
  if (!items?.length) return "";
  return items[Math.floor(rnd() * items.length)];
}

/**
 * Deterministic UUID-shaped question key for demo frozen snapshots.
 * @param {string} activityId
 * @param {number} questionIndex
 */
export function demoStableQuestionKey(activityId, questionIndex) {
  const a = demoSeedHash32(activityId, "qk-a", String(questionIndex));
  const b = demoSeedHash32(activityId, "qk-b", String(questionIndex));
  const c = demoSeedHash32(activityId, "qk-c", String(questionIndex));
  const d = demoSeedHash32(activityId, "qk-d", String(questionIndex));
  const hex8 = (n) => (n >>> 0).toString(16).padStart(8, "0");
  const variant = (((b >>> 16) & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  return `${hex8(a).slice(0, 8)}-${hex8(b).slice(0, 4)}-4${hex8(b).slice(5, 8)}-${variant}-${hex8(c)}${hex8(d).slice(0, 4)}`;
}
