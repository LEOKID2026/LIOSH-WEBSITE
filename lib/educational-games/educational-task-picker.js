export const PRODUCTION_MIN_POOL = 100;

/** @template T @param {T[]} arr */
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @template T
 * @param {(difficulty: string, opts?: object) => T[]} generatePool
 * @param {string} difficulty
 * @param {object} poolOpts
 * @param {Set<string>} usedKeys
 * @param {string|null} lastKey
 * @param {(task: T) => string} keyFn
 */
export function pickNextTask(generatePool, difficulty, poolOpts, usedKeys, lastKey, keyFn) {
  for (let salt = 0; salt < 12; salt += 1) {
    const pool = shuffle(generatePool(difficulty, { ...poolOpts, salt }));
    for (const task of pool) {
      const key = keyFn(task);
      if (usedKeys.has(key)) continue;
      if (lastKey && key === lastKey) continue;
      return task;
    }
  }
  return null;
}

/**
 * @template T
 * @param {(difficulty: string, opts?: object) => T[]} generatePool
 * @param {string} difficulty
 * @param {object} poolOpts
 * @param {number} count
 * @param {(task: T) => string} keyFn
 */
export function pickSessionTasks(generatePool, difficulty, poolOpts, count, keyFn) {
  const used = new Set();
  /** @type {T[]} */
  const out = [];
  let lastKey = null;

  while (out.length < count) {
    const task = pickNextTask(generatePool, difficulty, poolOpts, used, lastKey, keyFn);
    if (!task) break;
    const key = keyFn(task);
    used.add(key);
    lastKey = key;
    out.push(task);
  }

  return out;
}
