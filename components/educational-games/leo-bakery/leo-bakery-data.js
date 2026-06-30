/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'build' | 'findTrays' | 'findPerTray' | 'findTotal'} BakeryMode */

import { PRODUCTION_MIN_POOL } from "../../../lib/educational-games/educational-task-picker.js";

/** @typedef {{
 *   id: string
 *   mode: BakeryMode
 *   trays?: number
 *   perTray?: number
 *   total?: number
 *   itemLabel: string
 *   itemEmoji: string
 * }} BakeryTask */

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל" },
  medium: { id: "medium", label: "בינוני" },
  hard: { id: "hard", label: "קשה" },
};

const ITEM_TYPES = [
  { itemLabel: "עוגיות", itemEmoji: "🍪" },
  { itemLabel: "קאפקייקס", itemEmoji: "🧁" },
  { itemLabel: "לחמניות", itemEmoji: "🥖" },
  { itemLabel: "מאפינס", itemEmoji: "🧁" },
  { itemLabel: "קרואסונים", itemEmoji: "🥐" },
];

/** @type {Record<DifficultyId, { traysMin: number, traysMax: number, perMin: number, perMax: number, maxTotal: number, inverseRatio: number }>} */
const BASE_LEVEL = {
  easy: { traysMin: 2, traysMax: 6, perMin: 2, perMax: 6, maxTotal: 36, inverseRatio: 0 },
  medium: { traysMin: 2, traysMax: 10, perMin: 2, perMax: 10, maxTotal: 100, inverseRatio: 0 },
  hard: { traysMin: 3, traysMax: 12, perMin: 3, perMax: 12, maxTotal: 144, inverseRatio: 0.55 },
};

/** @param {number} min @param {number} max */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @param {DifficultyId} difficulty @param {number} stage */
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** @param {DifficultyId} difficulty @param {number} stage */
function levelForStage(difficulty, stage) {
  const base = BASE_LEVEL[difficulty];
  const boost = Math.floor(Math.max(0, stage - 1) / 2);
  return {
    traysMin: base.traysMin,
    traysMax: Math.min(base.traysMax + boost, 12),
    perMin: base.perMin,
    perMax: Math.min(base.perMax + boost, 12),
    maxTotal: Math.min(base.maxTotal + boost * 12, difficulty === "hard" ? 144 : difficulty === "medium" ? 100 : 36),
    inverseRatio: base.inverseRatio + (stage >= 3 && difficulty !== "easy" ? 0.1 : 0),
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number, stage?: number }} [opts]
 */
export function generateBakeryPool(difficulty, opts = {}) {
  const stage = opts.stage ?? 1;
  const cfg = levelForStage(difficulty, stage);
  const salt = opts.salt ?? 0;
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
          id: `b-${difficulty}-${pool.length}`,
          mode: "build",
          trays,
          perTray,
          itemLabel: item.itemLabel,
          itemEmoji: item.itemEmoji,
        });
      }
    }
  }

  let guard = 0;
  while (pool.length < PRODUCTION_MIN_POOL + 10 && guard < 1200) {
    guard += 1;
    const item = ITEM_TYPES[(pool.length + salt + guard) % ITEM_TYPES.length];
    const roll = (guard + salt) % 100;
    let mode = /** @type {BakeryMode} */ ("build");
    if (difficulty !== "easy" && stage >= 2 && roll < 15) mode = "findTotal";
    if (difficulty === "hard" && roll < cfg.inverseRatio * 100) {
      mode = roll % 3 === 0 ? "findTrays" : roll % 3 === 1 ? "findTotal" : "findPerTray";
    } else if (difficulty === "hard" && roll < cfg.inverseRatio * 100 + 15) {
      mode = "findTrays";
    }

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
      key = `ft-${total}-${perTray}`;
      if (seen.has(key)) continue;
      task = { id: `b-${difficulty}-${pool.length}`, mode, total, perTray, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
    } else if (mode === "findTotal") {
      key = `fx-${trays}-${perTray}`;
      if (seen.has(key)) continue;
      task = { id: `b-${difficulty}-${pool.length}`, mode, trays, perTray, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
    } else if (mode === "findPerTray") {
      trays = randInt(cfg.traysMin, Math.min(10, cfg.traysMax));
      total = randInt(trays * cfg.perMin, Math.min(cfg.maxTotal, trays * cfg.perMax));
      if (total % trays !== 0) total -= total % trays;
      perTray = total / trays;
      if (perTray < cfg.perMin || perTray > cfg.perMax) continue;
      key = `fp-${total}-${trays}`;
      if (seen.has(key)) continue;
      task = { id: `b-${difficulty}-${pool.length}`, mode, trays, total, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
    } else {
      key = `bd-${trays}-${perTray}`;
      if (seen.has(key)) continue;
      task = { id: `b-${difficulty}-${pool.length}`, mode, trays, perTray, itemLabel: item.itemLabel, itemEmoji: item.itemEmoji };
    }

    seen.add(key);
    pool.push(task);
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
