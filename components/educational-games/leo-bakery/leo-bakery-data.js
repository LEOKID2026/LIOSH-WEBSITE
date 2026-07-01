/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'build' | 'findTrays' | 'findPerTray' | 'findTotal'} BakeryMode */

import { PRODUCTION_MIN_POOL } from "../../../lib/educational-games/educational-task-picker.js";
import {
  pickSessionFromBands,
  TASKS_PER_SESSION,
  timeLimitForSessionIndex,
} from "../../../lib/educational-games/educational-session-standard.js";

/** @typedef {{
 *   id: string
 *   mode: BakeryMode
 *   trays?: number
 *   perTray?: number
 *   total?: number
 *   itemLabel: string
 *   itemEmoji: string
 * }} BakeryTask */

export { TASKS_PER_SESSION };

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל" },
  medium: { id: "medium", label: "בינוני" },
  hard: { id: "hard", label: "קשה" },
};

/** @type {Record<DifficultyId, [number, number, number]>} */
export const BAKERY_TIME_LIMITS_BY_BAND = {
  easy: [45, 40, 35],
  medium: [40, 35, 30],
  hard: [35, 30, 25],
};

const ITEM_TYPES = [
  { itemLabel: "עוגיות", itemEmoji: "🍪" },
  { itemLabel: "קאפקייקס", itemEmoji: "🧁" },
  { itemLabel: "לחמניות", itemEmoji: "🥖" },
  { itemLabel: "מאפינס", itemEmoji: "🧁" },
  { itemLabel: "קרואסונים", itemEmoji: "🥐" },
];

/** @param {unknown[]} arr */
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** @param {number} min @param {number} max */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @typedef {0 | 1 | 2} BakerySessionBand */

/**
 * @param {DifficultyId} difficulty
 * @param {BakerySessionBand} band
 */
function bakeryBandConfig(difficulty, band) {
  if (difficulty === "easy") {
    return { traysMin: 2, traysMax: band === 0 ? 4 : band === 1 ? 5 : 6, perMin: 2, perMax: band === 0 ? 4 : band === 1 ? 5 : 6, maxTotal: band === 0 ? 16 : band === 1 ? 25 : 36, allowFindTotal: false, allowInverse: false };
  }
  if (difficulty === "medium") {
    return {
      traysMin: 2,
      traysMax: band === 0 ? 5 : band === 1 ? 8 : 10,
      perMin: 2,
      perMax: band === 0 ? 6 : band === 1 ? 8 : 10,
      maxTotal: band === 0 ? 30 : band === 1 ? 64 : 100,
      allowFindTotal: band >= 1,
      allowInverse: false,
    };
  }
  return {
    traysMin: band === 0 ? 3 : 4,
    traysMax: band === 0 ? 6 : band === 1 ? 9 : 10,
    perMin: 3,
    perMax: band === 0 ? 6 : band === 1 ? 8 : 10,
    maxTotal: band === 0 ? 36 : band === 1 ? 72 : 100,
    allowFindTotal: band >= 1,
    allowInverse: band >= 2,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {BakerySessionBand} band
 * @param {number} [salt]
 */
function generateBakeryPoolForBand(difficulty, band, salt = 0) {
  const cfg = bakeryBandConfig(difficulty, band);
  const seen = new Set();
  /** @type {BakeryTask[]} */
  const pool = [];

  for (let trays = cfg.traysMin; trays <= cfg.traysMax; trays += 1) {
    for (let perTray = cfg.perMin; perTray <= cfg.perMax; perTray += 1) {
      const total = trays * perTray;
      if (total > cfg.maxTotal || total < 4) continue;
      for (let itemIdx = 0; itemIdx < ITEM_TYPES.length; itemIdx += 1) {
        const item = ITEM_TYPES[(itemIdx + salt) % ITEM_TYPES.length];
        const key = `bd-${trays}-${perTray}-${item.itemLabel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push({
          id: `b-${difficulty}-b${band}-${pool.length}`,
          mode: "build",
          trays,
          perTray,
          itemLabel: item.itemLabel,
          itemEmoji: item.itemEmoji,
        });
      }
    }
  }

  if (cfg.allowFindTotal) {
    for (let trays = cfg.traysMin; trays <= cfg.traysMax; trays += 1) {
      for (let perTray = cfg.perMin; perTray <= cfg.perMax; perTray += 1) {
        const total = trays * perTray;
        if (total > cfg.maxTotal || total < 4) continue;
        for (let itemIdx = 0; itemIdx < ITEM_TYPES.length; itemIdx += 1) {
          const item = ITEM_TYPES[(itemIdx + salt + 1) % ITEM_TYPES.length];
          const key = `fx-${trays}-${perTray}-${item.itemLabel}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pool.push({
            id: `b-${difficulty}-b${band}-ft-${pool.length}`,
            mode: "findTotal",
            trays,
            perTray,
            itemLabel: item.itemLabel,
            itemEmoji: item.itemEmoji,
          });
        }
      }
    }
  }

  if (cfg.allowInverse) {
    let guard = 0;
    while (pool.filter((t) => t.mode !== "build" && t.mode !== "findTotal").length < 40 && guard < 400) {
      guard += 1;
      const item = ITEM_TYPES[(pool.length + salt + guard) % ITEM_TYPES.length];
      const modeRoll = guard % 2;
      const mode = modeRoll === 0 ? /** @type {BakeryMode} */ ("findTrays") : "findPerTray";
      let trays = randInt(cfg.traysMin, cfg.traysMax);
      let perTray = randInt(cfg.perMin, cfg.perMax);
      let total = trays * perTray;
      if (total > cfg.maxTotal) {
        perTray = Math.max(cfg.perMin, Math.floor(cfg.maxTotal / trays));
        total = trays * perTray;
      }
      if (total < 4) continue;

      let key;
      /** @type {BakeryTask} */
      let task;
      if (mode === "findTrays") {
        key = `ft-${total}-${perTray}-${item.itemLabel}`;
        if (seen.has(key)) continue;
        task = { id: `b-${difficulty}-b${band}-inv-${pool.length}`, mode, total, perTray, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
      } else {
        trays = randInt(cfg.traysMin, cfg.traysMax);
        total = trays * perTray;
        if (total > cfg.maxTotal) continue;
        key = `fp-${total}-${trays}-${item.itemLabel}`;
        if (seen.has(key)) continue;
        task = { id: `b-${difficulty}-b${band}-inv-${pool.length}`, mode, trays, total, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
      }
      seen.add(key);
      pool.push(task);
    }
  }

  return shuffle(pool);
}

/** @param {BakeryTask} task */
export function bakeryTaskDifficultyScore(task) {
  const e = bakeryExpected(task);
  let score = e.total + e.trays * 2;
  if (task.mode === "findTotal") score += 10;
  if (task.mode === "findTrays" || task.mode === "findPerTray") score += 25;
  return score;
}

/** @param {DifficultyId} difficulty */
export function buildBakerySessionRun(difficulty) {
  const salt = Math.floor(Math.random() * 10000);
  const opening = generateBakeryPoolForBand(difficulty, 0, salt)
    .sort((a, b) => bakeryTaskDifficultyScore(a) - bakeryTaskDifficultyScore(b));
  const mid = generateBakeryPoolForBand(difficulty, 1, salt + 1)
    .sort((a, b) => bakeryTaskDifficultyScore(a) - bakeryTaskDifficultyScore(b));
  const final = generateBakeryPoolForBand(difficulty, 2, salt + 2)
    .sort((a, b) => bakeryTaskDifficultyScore(a) - bakeryTaskDifficultyScore(b));

  const run = pickSessionFromBands(opening, mid, final, bakeryTaskKey, TASKS_PER_SESSION);
  return run.map((task, i) => ({
    ...task,
    id: `b-${difficulty}-run-${i}`,
  }));
}

/** @param {DifficultyId} difficulty @param {number} taskIndex0 */
export function bakeryTimeLimitForTask(difficulty, taskIndex0) {
  const limits = BAKERY_TIME_LIMITS_BY_BAND[difficulty] ?? BAKERY_TIME_LIMITS_BY_BAND.easy;
  return timeLimitForSessionIndex(taskIndex0, limits);
}

/** @param {number} successful @param {number} total @param {number} mistakes @param {number} maxMistakes */
export function isBakeryWin(successful, total, mistakes, maxMistakes) {
  if (mistakes >= maxMistakes) return false;
  return successful >= total;
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number, band?: BakerySessionBand }} [opts]
 */
export function generateBakeryPool(difficulty, opts = {}) {
  const salt = opts.salt ?? 0;
  /** @type {BakeryTask[]} */
  let pool = [];
  const seen = new Set();
  for (const band of /** @type {BakerySessionBand[]} */ ([0, 1, 2])) {
    for (const task of generateBakeryPoolForBand(difficulty, band, salt + band)) {
      const key = bakeryTaskKey(task);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(task);
    }
  }

  let guard = 0;
  while (pool.length < PRODUCTION_MIN_POOL + 10 && guard < 1200) {
    guard += 1;
    const band = /** @type {BakerySessionBand} */ (guard % 3);
    for (const task of generateBakeryPoolForBand(difficulty, band, salt + guard)) {
      const key = bakeryTaskKey(task);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(task);
      if (pool.length >= PRODUCTION_MIN_POOL + 10) break;
    }
  }

  return shuffle(pool);
}

/** @param {BakeryTask} task */
export function bakeryTaskKey(task) {
  const e = bakeryExpected(task);
  return `${task.mode}-${e.trays}-${e.perTray}-${e.total}-${task.itemLabel}`;
}

/** @param {BakeryTask} task */
export function bakeryPrompt(task) {
  if (task.mode === "build") {
    return `הגדירו ${task.trays} מגשים עם ${task.perTray} ${task.itemLabel} בכל מגש`;
  }
  if (task.mode === "findTrays") {
    return `יש ${task.total} ${task.itemLabel}. בכל מגש ${task.perTray}. כמה מגשים צריך?`;
  }
  if (task.mode === "findPerTray") {
    return `יש ${task.total} ${task.itemLabel} ל-${task.trays} מגשים. כמה בכל מגש?`;
  }
  return `יש ${task.trays} מגשים, בכל מגש ${task.perTray} ${task.itemLabel}. כמה סך הכול?`;
}

/** @param {BakeryTask} task */
export function bakeryInfoBar(task) {
  if (task.mode === "findTrays") {
    return `${task.total} ${task.itemLabel} · בכל מגש ${task.perTray}`;
  }
  if (task.mode === "findPerTray") {
    return `${task.total} ${task.itemLabel} · ${task.trays} מגשים`;
  }
  if (task.mode === "findTotal") {
    return `${task.trays} מגשים · בכל מגש ${task.perTray} ${task.itemLabel}`;
  }
  return `${task.trays} מגשים · בכל מגש ${task.perTray} ${task.itemLabel}`;
}

/** @param {BakeryTask} task */
export function bakeryExpected(task) {
  if (task.mode === "build") {
    const trays = task.trays ?? 0;
    const perTray = task.perTray ?? 0;
    return { trays, perTray, total: trays * perTray };
  }
  if (task.mode === "findTrays") {
    const total = task.total ?? 0;
    const perTray = task.perTray ?? 1;
    return { trays: Math.floor(total / perTray), perTray, total };
  }
  if (task.mode === "findPerTray") {
    const trays = task.trays ?? 1;
    const total = task.total ?? 0;
    return { trays, perTray: Math.floor(total / trays), total };
  }
  const trays = task.trays ?? 0;
  const perTray = task.perTray ?? 0;
  return { trays, perTray, total: trays * perTray };
}

/** @param {BakeryTask} task @param {{ trays: number, perTray: number, total: number }} answer */
export function validateBakery(task, answer) {
  const expected = bakeryExpected(task);
  const ok =
    answer.trays === expected.trays &&
    answer.perTray === expected.perTray &&
    answer.total === expected.total;
  return { ok, expected };
}

/** @param {boolean} ok */
export function bakeryFeedback(ok) {
  return ok ? "מעולה! הכנתם בדיוק את ההזמנה." : "כמעט! בדקו כמה מגשים יש וכמה יש בכל מגש.";
}

/** @param {number} count @param {string} emoji */
export function trayItemDisplay(count, emoji) {
  if (count <= 4) return { type: "icons", text: emoji.repeat(count) };
  return { type: "multiply", text: `${emoji} × ${count}` };
}
