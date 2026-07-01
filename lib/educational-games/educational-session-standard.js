/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

export const TASKS_PER_SESSION = 20;

export const SESSION_OPEN_COUNT = 5;
export const SESSION_MID_COUNT = 10;
export const SESSION_FINAL_COUNT = 5;

/** @type {Record<DifficultyId, number>} */
export const MAX_MISTAKES_BY_DIFFICULTY = {
  easy: 5,
  medium: 4,
  hard: 3,
};

/** 0-based task index → band 0 (opening), 1 (mid), 2 (final). */
export function sessionBandForIndex(taskIndex0) {
  const i = Math.max(0, Math.floor(taskIndex0));
  if (i < SESSION_OPEN_COUNT) return 0;
  if (i < SESSION_OPEN_COUNT + SESSION_MID_COUNT) return 1;
  return 2;
}

/** @param {number} taskIndex0 @param {[number, number, number]} limitsByBand */
export function timeLimitForSessionIndex(taskIndex0, limitsByBand) {
  const band = sessionBandForIndex(taskIndex0);
  return limitsByBand[band] ?? limitsByBand[limitsByBand.length - 1];
}

/**
 * Pick `count` items from three pools (easy→hard within the same difficulty level).
 * Avoids more than 2 consecutive items with the same type key.
 *
 * @template T
 * @param {T[]} openingPool
 * @param {T[]} midPool
 * @param {T[]} finalPool
 * @param {(item: T) => string} typeKeyFn
 * @param {number} [count]
 */
export function pickSessionFromBands(openingPool, midPool, finalPool, typeKeyFn, count = TASKS_PER_SESSION) {
  const openN = SESSION_OPEN_COUNT;
  const midN = SESSION_MID_COUNT;
  const finalN = count - openN - midN;

  /** @param {T[]} pool @param {number} n @param {string|null} lastType @param {Set<string>} usedKeys */
  function pickBand(pool, n, lastType, usedKeys) {
    /** @type {T[]} */
    const out = [];
    let last = lastType;
    let typeStreak = 0;
    const sorted = [...pool].sort(() => Math.random() - 0.5);

    for (let attempt = 0; attempt < sorted.length * 3 && out.length < n; attempt += 1) {
      const item = sorted[attempt % sorted.length];
      const typeKey = typeKeyFn(item);
      const uniqueKey = `${typeKey}|${JSON.stringify(item)}`;
      if (usedKeys.has(uniqueKey)) continue;
      if (last === typeKey && typeStreak >= 2) continue;
      usedKeys.add(uniqueKey);
      out.push(item);
      if (last === typeKey) typeStreak += 1;
      else {
        last = typeKey;
        typeStreak = 1;
      }
    }

    let idx = 0;
    while (out.length < n && sorted.length) {
      out.push(sorted[idx % sorted.length]);
      idx += 1;
    }

    return { items: out.slice(0, n), lastType: last };
  }

  const used = new Set();
  const a = pickBand(openingPool, openN, null, used);
  const b = pickBand(midPool, midN, a.lastType, used);
  const c = pickBand(finalPool, finalN, b.lastType, used);

  return [...a.items, ...b.items, ...c.items].slice(0, count);
}

/**
 * @template T
 * @param {T[]} run
 * @param {(item: T) => string} typeKeyFn
 */
export function sessionRunTypeStreakOk(run, typeKeyFn) {
  let streak = 0;
  let last = null;
  for (const item of run) {
    const key = typeKeyFn(item);
    if (key === last) streak += 1;
    else {
      last = key;
      streak = 1;
    }
    if (streak > 2) return false;
  }
  return true;
}

/** @param {DifficultyId} difficulty */
export function maxMistakesForDifficulty(difficulty) {
  return MAX_MISTAKES_BY_DIFFICULTY[difficulty] ?? MAX_MISTAKES_BY_DIFFICULTY.medium;
}
