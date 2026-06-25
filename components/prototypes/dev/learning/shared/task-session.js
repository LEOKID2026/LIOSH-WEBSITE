/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** משימות בכל סשן בדיקה (המאגר מאחורה גדול בהרבה). */
export const SESSION_TASK_COUNT = 12;

export const MIN_POOL_SIZE = 50;

/** @param {number} min @param {number} max */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
 * @param {(difficulty: DifficultyId, opts?: { salt?: number }) => T[]} generatePool
 * @param {DifficultyId} difficulty
 * @param {(task: T) => string} keyFn
 * @param {number} [count]
 */
export function pickSessionTasks(generatePool, difficulty, keyFn, count = SESSION_TASK_COUNT) {
  const seen = new Set();
  /** @type {T[]} */
  const out = [];
  let salt = 0;

  while (out.length < count && salt < 12) {
    const pool = shuffle(generatePool(difficulty, { salt }));
    for (const task of pool) {
      const key = keyFn(task);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(task);
      if (out.length >= count) break;
    }
    salt += 1;
  }

  return out;
}
