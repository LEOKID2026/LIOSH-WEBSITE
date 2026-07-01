/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

import { PRODUCTION_MIN_POOL, shuffle } from "../../../lib/educational-games/educational-task-picker.js";
import {
  pickSessionFromBands,
  SESSION_FINAL_COUNT,
  SESSION_MID_COUNT,
  SESSION_OPEN_COUNT,
  TASKS_PER_SESSION,
  timeLimitForSessionIndex,
} from "../../../lib/educational-games/educational-session-standard.js";

/** @typedef {{
 *   id: string
 *   total: number
 *   children: number
 *   itemLabel: string
 *   itemEmoji: string
 * }} GiftsTask */

export { TASKS_PER_SESSION };

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל" },
  medium: { id: "medium", label: "בינוני" },
  hard: { id: "hard", label: "קשה" },
};

/** @type {Record<DifficultyId, [number, number, number]>} */
export const GIFTS_TIME_LIMITS_BY_BAND = {
  easy: [45, 40, 35],
  medium: [40, 35, 30],
  hard: [35, 30, 25],
};

const ITEM_TYPES = [
  { itemLabel: "מתנות", itemEmoji: "🎁" },
  { itemLabel: "סוכריות", itemEmoji: "🍬" },
  { itemLabel: "מדבקות", itemEmoji: "⭐" },
  { itemLabel: "כוכבים", itemEmoji: "🌟" },
  { itemLabel: "ממתקים", itemEmoji: "🍭" },
];

/** @param {number} min @param {number} max */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @typedef {0 | 1 | 2} GiftsSessionBand */

/** @param {DifficultyId} difficulty @param {GiftsSessionBand} band */
function giftsBandConfig(difficulty, band) {
  if (difficulty === "easy") {
    if (band === 0) return { childrenMin: 2, childrenMax: 4, maxTotal: 20, allowRemainder: false };
    if (band === 1) return { childrenMin: 2, childrenMax: 5, maxTotal: 32, allowRemainder: false };
    return { childrenMin: 3, childrenMax: 6, maxTotal: 40, allowRemainder: false };
  }
  if (difficulty === "medium") {
    if (band === 0) return { childrenMin: 3, childrenMax: 5, maxTotal: 30, allowRemainder: false };
    if (band === 1) return { childrenMin: 4, childrenMax: 8, maxTotal: 56, allowRemainder: true };
    return { childrenMin: 5, childrenMax: 10, maxTotal: 80, allowRemainder: true };
  }
  if (band === 0) return { childrenMin: 4, childrenMax: 6, maxTotal: 42, allowRemainder: true };
  if (band === 1) return { childrenMin: 5, childrenMax: 8, maxTotal: 72, allowRemainder: true };
  return { childrenMin: 6, childrenMax: 10, maxTotal: 100, allowRemainder: true };
}

/** @param {DifficultyId} difficulty @param {GiftsSessionBand} band @param {number} [salt] */
function generateGiftsPoolForBand(difficulty, band, salt = 0) {
  const cfg = giftsBandConfig(difficulty, band);
  const seen = new Set();
  /** @type {GiftsTask[]} */
  const pool = [];

  for (let children = cfg.childrenMin; children <= cfg.childrenMax; children += 1) {
    for (let per = 2; per <= Math.max(2, Math.floor(cfg.maxTotal / children)); per += 1) {
      const totalEven = per * children;
      if (totalEven <= cfg.maxTotal) {
        for (let itemIdx = 0; itemIdx < ITEM_TYPES.length; itemIdx += 1) {
          const item = ITEM_TYPES[(itemIdx + salt) % ITEM_TYPES.length];
          const key = `${totalEven}x${children}-${item.itemLabel}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pool.push({
            id: `g-${difficulty}-b${band}-${pool.length}-${key}`,
            total: totalEven,
            children,
            itemLabel: item.itemLabel,
            itemEmoji: item.itemEmoji,
          });
        }
      }
      if (cfg.allowRemainder) {
        for (let rem = 1; rem < children; rem += 1) {
          const total = per * children + rem;
          if (total > cfg.maxTotal || total < children * 2) continue;
          for (let itemIdx = 0; itemIdx < ITEM_TYPES.length; itemIdx += 1) {
            const item = ITEM_TYPES[(itemIdx + salt) % ITEM_TYPES.length];
            const key = `${total}x${children}-${item.itemLabel}`;
            if (seen.has(key)) continue;
            seen.add(key);
            pool.push({
              id: `g-${difficulty}-b${band}-${pool.length}-${key}`,
              total,
              children,
              itemLabel: item.itemLabel,
              itemEmoji: item.itemEmoji,
            });
          }
        }
      }
    }
  }

  return shuffle(pool);
}

/** @param {GiftsTask} task */
export function giftsTaskDifficultyScore(task) {
  const rem = task.total % task.children;
  return task.children * 3 + task.total * 0.15 + (rem > 0 ? 8 : 0);
}

/** @param {DifficultyId} difficulty */
export function buildGiftsSessionRun(difficulty) {
  const salt = Math.floor(Math.random() * 10000);
  const opening = generateGiftsPoolForBand(difficulty, 0, salt)
    .sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));
  const mid = generateGiftsPoolForBand(difficulty, 1, salt + 1)
    .sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));
  const final = generateGiftsPoolForBand(difficulty, 2, salt + 2)
    .sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));

  const run = pickSessionFromBands(opening, mid, final, giftsTaskKey, TASKS_PER_SESSION);
  return run.map((task, i) => ({
    ...task,
    id: `g-${difficulty}-run-${i}`,
  }));
}

/** @param {DifficultyId} difficulty @param {number} taskIndex0 */
export function giftsTimeLimitForTask(difficulty, taskIndex0) {
  const limits = GIFTS_TIME_LIMITS_BY_BAND[difficulty] ?? GIFTS_TIME_LIMITS_BY_BAND.easy;
  return timeLimitForSessionIndex(taskIndex0, limits);
}

/** @param {number} successful @param {number} total @param {number} mistakes @param {number} maxMistakes */
export function isGiftsWin(successful, total, mistakes, maxMistakes) {
  if (mistakes >= maxMistakes) return false;
  return successful >= total;
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number, stage?: number, band?: GiftsSessionBand }} [opts]
 */
export function generateGiftsPool(difficulty, opts = {}) {
  const salt = opts.salt ?? 0;
  /** @type {GiftsTask[]} */
  let pool = [];
  const seen = new Set();
  for (const band of /** @type {GiftsSessionBand[]} */ ([0, 1, 2])) {
    for (const task of generateGiftsPoolForBand(difficulty, band, salt + band)) {
      const key = giftsTaskKey(task);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(task);
    }
  }

  let guard = 0;
  while (pool.length < PRODUCTION_MIN_POOL + 10 && guard < 1200) {
    guard += 1;
    const band = /** @type {GiftsSessionBand} */ (guard % 3);
    for (const task of generateGiftsPoolForBand(difficulty, band, salt + guard)) {
      const key = giftsTaskKey(task);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(task);
      if (pool.length >= PRODUCTION_MIN_POOL + 10) break;
    }
  }

  return shuffle(pool);
}

/** @param {GiftsTask} task */
export function giftsTaskKey(task) {
  return `${task.total}x${task.children}-${task.itemLabel}`;
}

/** @param {GiftsTask} task @param {number} perChild @param {number} remainder */
export function validateGiftsDivision(task, perChild, remainder) {
  const { total, children } = task;
  if (perChild < 0 || remainder < 0) return { ok: false };
  if (perChild * children + remainder !== total) return { ok: false };
  if (remainder >= children) return { ok: false };
  const expectedPer = Math.floor(total / children);
  const expectedRem = total % children;
  if (perChild !== expectedPer || remainder !== expectedRem) return { ok: false };
  return { ok: true, expectedPer, expectedRem };
}

/** @param {GiftsTask} task */
export function giftsPrompt(task) {
  const remainder = task.total % task.children;
  if (remainder > 0) {
    return `לליאו יש ${task.total} ${task.itemLabel}. הגיעו ${task.children} ילדים. כמה כל ילד מקבל וכמה נשאר לליאו?`;
  }
  return `לליאו יש ${task.total} ${task.itemLabel}. הגיעו ${task.children} ילדים. כמה יקבל כל ילד?`;
}

/** @param {boolean} ok @param {number} perChild @param {number} remainder */
export function giftsFeedback(ok, perChild, remainder) {
  if (ok) {
    if (remainder > 0) {
      return `יפה! כל ילד קיבל ${perChild} ולליאו נשארו ${remainder}.`;
    }
    return "מעולה! כל ילד קיבל אותו מספר.";
  }
  return "כמעט! בדקו שכל הילדים קיבלו שווה בשווה ושלא נשאר יותר מדי לליאו.";
}

const CHILD_EMOJIS = ["👧", "👦", "🧒", "👧🏽", "👦🏽", "🧒🏻", "👧🏻", "👦🏻", "🧒🏽", "👧🏼", "👦🏼", "🧒🏼"];

/** @param {number} index */
export function childEmojiAt(index) {
  return CHILD_EMOJIS[index % CHILD_EMOJIS.length];
}

/** @param {number} childCount */
export function childrenGridClass(childCount) {
  if (childCount <= 4) return "gridFew";
  if (childCount <= 8) return "gridMedium";
  return "gridMany";
}
