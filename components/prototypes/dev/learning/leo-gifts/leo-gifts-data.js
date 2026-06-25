/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

import { MIN_POOL_SIZE, randInt, shuffle } from "../shared/task-session.js";

/** @typedef {{
 *   id: string
 *   total: number
 *   children: number
 *   itemLabel: string
 *   itemEmoji: string
 *   imageSrc?: string
 * }} GiftsTask */

const ITEM_TYPES = [
  { itemLabel: "מתנות", itemEmoji: "🎁" },
  { itemLabel: "סוכריות", itemEmoji: "🍬" },
  { itemLabel: "מדבקות", itemEmoji: "⭐" },
  { itemLabel: "כוכבים", itemEmoji: "🌟" },
  { itemLabel: "ממתקים", itemEmoji: "🍭" },
];

/** @type {Record<DifficultyId, { childrenMin: number, childrenMax: number, maxTotal: number, allowRemainder: boolean }>} */
const LEVEL = {
  easy: { childrenMin: 2, childrenMax: 6, maxTotal: 40, allowRemainder: false },
  medium: { childrenMin: 3, childrenMax: 10, maxTotal: 80, allowRemainder: true },
  hard: { childrenMin: 6, childrenMax: 12, maxTotal: 120, allowRemainder: true },
};

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number }} [opts]
 * @returns {GiftsTask[]}
 */
export function generateGiftsPool(difficulty, opts = {}) {
  const cfg = LEVEL[difficulty];
  const salt = opts.salt ?? 0;
  const seen = new Set();
  /** @type {GiftsTask[]} */
  const pool = [];
  let guard = 0;

  for (let children = cfg.childrenMin; children <= cfg.childrenMax; children += 1) {
    for (let per = 2; per <= Math.max(2, Math.floor(cfg.maxTotal / children)); per += 1) {
      const total = per * children;
      if (total > cfg.maxTotal) break;
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

  while (pool.length < MIN_POOL_SIZE + 10 && guard < 800) {
    guard += 1;
    const children = randInt(cfg.childrenMin, cfg.childrenMax);
    const item = ITEM_TYPES[(pool.length + salt + guard) % ITEM_TYPES.length];
    let total;

    if (!cfg.allowRemainder) {
      const per = randInt(2, Math.max(2, Math.floor(cfg.maxTotal / children)));
      total = per * children;
    } else if (difficulty === "medium") {
      const base = randInt(children * 2, cfg.maxTotal);
      total = base;
    } else {
      const rough = randInt(children * 3, cfg.maxTotal);
      const bump = guard % 7 === 0 ? randInt(1, children - 1) : 0;
      total = Math.min(cfg.maxTotal, rough + bump);
    }

    if (total > cfg.maxTotal || total < children * 2) continue;
    const key = `${total}x${children}`;
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

/** @param {DifficultyId} difficulty */
export function giftsPoolSizeEstimate(difficulty) {
  return generateGiftsPool(difficulty, { salt: 0 }).length;
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
