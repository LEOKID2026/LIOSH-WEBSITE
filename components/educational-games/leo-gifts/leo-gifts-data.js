/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

import { PRODUCTION_MIN_POOL, shuffle } from "../../../lib/educational-games/educational-task-picker.js";

/** @typedef {{
 *   id: string
 *   total: number
 *   children: number
 *   itemLabel: string
 *   itemEmoji: string
 * }} GiftsTask */

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל" },
  medium: { id: "medium", label: "בינוני" },
  hard: { id: "hard", label: "קשה" },
};

const ITEM_TYPES = [
  { itemLabel: "מתנות", itemEmoji: "🎁" },
  { itemLabel: "סוכריות", itemEmoji: "🍬" },
  { itemLabel: "מדבקות", itemEmoji: "⭐" },
  { itemLabel: "כוכבים", itemEmoji: "🌟" },
  { itemLabel: "ממתקים", itemEmoji: "🍭" },
];

/** @type {Record<DifficultyId, { childrenMin: number, childrenMax: number, maxTotal: number, allowRemainder: boolean }>} */
const BASE_LEVEL = {
  easy: { childrenMin: 2, childrenMax: 6, maxTotal: 40, allowRemainder: false },
  medium: { childrenMin: 3, childrenMax: 10, maxTotal: 80, allowRemainder: true },
  hard: { childrenMin: 6, childrenMax: 12, maxTotal: 120, allowRemainder: true },
};

/** @param {number} min @param {number} max */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @param {DifficultyId} difficulty @param {number} stage */
function levelForStage(difficulty, stage) {
  const base = BASE_LEVEL[difficulty];
  const boost = Math.floor(Math.max(0, stage - 1) / 2);
  return {
    childrenMin: base.childrenMin,
    childrenMax: Math.min(base.childrenMax + boost, difficulty === "hard" ? 12 : 10),
    maxTotal: Math.min(base.maxTotal + boost * 12, difficulty === "hard" ? 120 : difficulty === "medium" ? 80 : 40),
    allowRemainder: base.allowRemainder,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number, stage?: number }} [opts]
 */
export function generateGiftsPool(difficulty, opts = {}) {
  const stage = opts.stage ?? 1;
  const cfg = levelForStage(difficulty, stage);
  const salt = opts.salt ?? 0;
  const seen = new Set();
  /** @type {GiftsTask[]} */
  const pool = [];
  let guard = 0;

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
            id: `g-${difficulty}-${pool.length}-${key}`,
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
              id: `g-${difficulty}-${pool.length}-${key}`,
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

  while (pool.length < PRODUCTION_MIN_POOL + 10 && guard < 1200) {
    guard += 1;
    const children = randInt(cfg.childrenMin, cfg.childrenMax);
    const item = ITEM_TYPES[(pool.length + salt + guard) % ITEM_TYPES.length];
    let total;

    if (!cfg.allowRemainder) {
      const per = randInt(2, Math.max(2, Math.floor(cfg.maxTotal / children)));
      total = per * children;
    } else {
      total = randInt(children * 2, cfg.maxTotal);
    }

    if (total > cfg.maxTotal || total < children * 2) continue;
    const key = `${total}x${children}-${item.itemLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    pool.push({
      id: `g-${difficulty}-${pool.length}-${key}`,
      total,
      children,
      itemLabel: item.itemLabel,
      itemEmoji: item.itemEmoji,
    });
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
