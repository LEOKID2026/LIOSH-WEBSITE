/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'share_equally' | 'make_groups' | 'find_remainder'} GiftsMode */

import {
  createMathTask,
  pickBalancedSession,
  randInt,
  shuffledCopy,
} from "../../../lib/educational-games/math-task-schema.js";
import {
  pickSessionFromBands,
  TASKS_PER_SESSION,
  timeLimitForSessionIndex,
} from "../../../lib/educational-games/educational-session-standard.js";

/**
 * @typedef {{
 *   id: string
 *   gameKey: 'leo-gifts'
 *   difficulty: DifficultyId
 *   skillId: string
 *   variant: GiftsMode
 *   operands: { total: number, divisor: number, mode: GiftsMode, itemLabel: string, itemEmoji: string }
 *   expectedAnswer: { quotient: number, remainder: number }
 *   representationType: string
 *   total: number
 *   children?: number
 *   groupSize?: number
 *   mode: GiftsMode
 *   itemLabel: string
 *   itemEmoji: string
 * }} GiftsTask
 */

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

const ITEM_FORMS = Object.freeze({
  gifts: { singular: "מתנה", plural: "מתנות", emoji: "🎁" },
  candies: { singular: "סוכרייה", plural: "סוכריות", emoji: "🍬" },
  stickers: { singular: "מדבקה", plural: "מדבקות", emoji: "⭐" },
  stars: { singular: "כוכב", plural: "כוכבים", emoji: "🌟" },
  sweets: { singular: "ממתק", plural: "ממתקים", emoji: "🍭" },
});

const ITEM_KEYS = Object.keys(ITEM_FORMS);

/**
 * @param {keyof typeof ITEM_FORMS | string} key
 * @param {number} count
 */
export function giftsItemLabel(key, count) {
  const forms = ITEM_FORMS[key];
  if (!forms) return String(key);
  return count === 1 ? forms.singular : forms.plural;
}

/** @param {keyof typeof ITEM_FORMS | string} key */
export function giftsItemEmoji(key) {
  return ITEM_FORMS[key]?.emoji || "🎁";
}

/** @param {number} count */
export function remainingItemsText(count) {
  if (count === 0) return "לא נשארו פריטים.";
  if (count === 1) return "נשאר פריט אחד.";
  return `נשארו ${count} פריטים.`;
}

/** @param {DifficultyId} difficulty */
function giftsQuotas(difficulty) {
  if (difficulty === "easy") {
    return {
      "division.equal_sharing": 12,
      "division.make_groups": 6,
      "division.remainder": 2,
    };
  }
  if (difficulty === "medium") {
    return {
      "division.equal_sharing": 7,
      "division.make_groups": 7,
      "division.remainder": 6,
    };
  }
  return {
    "division.equal_sharing": 6,
    "division.make_groups": 6,
    "division.remainder": 5,
    "division.relation_to_multiplication": 3,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {GiftsMode} mode
 * @param {boolean} allowRemainder
 * @param {number} salt
 * @returns {GiftsTask[]}
 */
function generateGiftsPoolForMode(difficulty, mode, allowRemainder, salt = 0) {
  const cfg =
    difficulty === "easy"
      ? { divisorMin: 2, divisorMax: 5, maxTotal: 30, quotMax: 6 }
      : difficulty === "medium"
        ? { divisorMin: 2, divisorMax: 8, maxTotal: 72, quotMax: 10 }
        : { divisorMin: 3, divisorMax: 10, maxTotal: 120, quotMax: 12 };

  /** @type {GiftsTask[]} */
  const pool = [];
  const seen = new Set();

  for (let divisor = cfg.divisorMin; divisor <= cfg.divisorMax; divisor += 1) {
    for (let quot = 1; quot <= cfg.quotMax; quot += 1) {
      const remOptions = allowRemainder ? [0, ...Array.from({ length: divisor - 1 }, (_, i) => i + 1)] : [0];
      for (const rem of remOptions) {
        if (difficulty === "easy" && rem > 0 && pool.filter((t) => t.expectedAnswer.remainder > 0).length >= 8) {
          continue;
        }
        const total = quot * divisor + rem;
        if (total < divisor || total > cfg.maxTotal) continue;
        if (rem >= divisor) continue;

        for (let itemIdx = 0; itemIdx < ITEM_KEYS.length; itemIdx += 1) {
          const itemKey = ITEM_KEYS[(itemIdx + salt) % ITEM_KEYS.length];
          const itemLabel = giftsItemLabel(itemKey, total);
          const itemEmoji = giftsItemEmoji(itemKey);
          const key = `${mode}-${total}-${divisor}-${itemKey}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const skillId =
            mode === "find_remainder" || rem > 0
              ? rem > 0
                ? "division.remainder"
                : mode === "make_groups"
                  ? "division.make_groups"
                  : "division.equal_sharing"
              : mode === "make_groups"
                ? "division.make_groups"
                : "division.equal_sharing";

          const useRelation =
            difficulty === "hard" && rem === 0 && (pool.length + salt) % 7 === 0;

          /** @type {GiftsTask} */
          const task = {
            ...createMathTask({
              id: `g-${difficulty}-${mode}-${pool.length}`,
              gameKey: "leo-gifts",
              difficulty,
              skillId: useRelation ? "division.relation_to_multiplication" : skillId,
              variant: mode,
              operands: {
                total,
                divisor,
                mode,
                itemKey,
                itemLabel,
                itemEmoji,
              },
              expectedAnswer: { quotient: quot, remainder: rem },
              representationType: difficulty === "easy" ? "visual" : "mixed",
            }),
            total,
            mode,
            itemKey,
            itemLabel,
            itemEmoji,
          };

          if (mode === "share_equally" || mode === "find_remainder") {
            task.children = divisor;
          } else {
            task.groupSize = divisor;
          }

          pool.push(task);
        }
      }
    }
  }

  return shuffledCopy(pool);
}

/** @param {GiftsTask} task */
export function giftsTaskKey(task) {
  return `${task.mode}-${task.total}-${task.operands.divisor}-${task.itemLabel}`;
}

/** @param {GiftsTask} task */
export function giftsTaskDifficultyScore(task) {
  const rem = task.expectedAnswer.remainder;
  return task.operands.divisor * 3 + task.total * 0.12 + (rem > 0 ? 10 : 0) + (task.mode === "make_groups" ? 4 : 0);
}

/** @param {DifficultyId} difficulty */
export function buildGiftsSessionRun(difficulty) {
  const salt = Math.floor(Math.random() * 10000);
  const allowRemEarly = difficulty !== "easy";
  const sharePool = generateGiftsPoolForMode(difficulty, "share_equally", allowRemEarly || difficulty === "easy", salt);
  const groupsPool = generateGiftsPoolForMode(difficulty, "make_groups", allowRemEarly, salt + 1);
  const remPool = generateGiftsPoolForMode(
    difficulty,
    difficulty === "hard" ? "find_remainder" : "share_equally",
    true,
    salt + 2,
  ).filter((t) => t.expectedAnswer.remainder > 0);

  /** @type {Record<string, GiftsTask[]>} */
  const pools = {
    "division.equal_sharing": sharePool.filter((t) => t.skillId === "division.equal_sharing" || t.mode === "share_equally"),
    "division.make_groups": groupsPool,
    "division.remainder": remPool.length ? remPool : sharePool.filter((t) => t.expectedAnswer.remainder > 0),
    "division.relation_to_multiplication": sharePool.filter((t) => t.expectedAnswer.remainder === 0),
  };

  const quotas = giftsQuotas(difficulty);
  let run = pickBalancedSession(pools, quotas, giftsTaskKey, TASKS_PER_SESSION);

  if (run.length < TASKS_PER_SESSION) {
    const opening = sharePool.sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));
    const mid = shuffledCopy([...sharePool, ...groupsPool]);
    const final = shuffledCopy([...groupsPool, ...remPool, ...sharePool]);
    run = pickSessionFromBands(opening, mid, final, giftsTaskKey, TASKS_PER_SESSION);
  }

  // Easy: force share_equally early, make_groups late
  if (difficulty === "easy") {
    const shares = run.filter((t) => t.mode === "share_equally").slice(0, 12);
    const groups = run.filter((t) => t.mode === "make_groups").slice(0, 6);
    const rem = run.filter((t) => t.expectedAnswer.remainder > 0).slice(0, 2);
    run = [...shares.slice(0, 10), ...groups.slice(0, 4), ...shares.slice(10), ...groups.slice(4), ...rem].slice(
      0,
      TASKS_PER_SESSION,
    );
    while (run.length < TASKS_PER_SESSION && shares.length) {
      run.push(shares[run.length % shares.length]);
    }
  }

  // Gradual difficulty: sort lightly within halves
  const mid = Math.floor(run.length / 2);
  const first = run.slice(0, mid).sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));
  const second = run.slice(mid).sort((a, b) => giftsTaskDifficultyScore(a) - giftsTaskDifficultyScore(b));
  run = [...first, ...second];

  const used = new Set();
  run = run.filter((t) => {
    const k = giftsTaskKey(t);
    if (used.has(k)) return false;
    used.add(k);
    return true;
  });

  while (run.length < TASKS_PER_SESSION) {
    const extra = generateGiftsPoolForMode(difficulty, "share_equally", difficulty !== "easy", salt + run.length);
    for (const t of extra) {
      if (run.length >= TASKS_PER_SESSION) break;
      const k = giftsTaskKey(t);
      if (used.has(k)) continue;
      used.add(k);
      run.push(t);
    }
    break;
  }

  return run.slice(0, TASKS_PER_SESSION).map((task, i) => ({
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

/** @param {GiftsTask} task @param {number} quotient @param {number} remainder */
export function validateGiftsDivision(task, quotient, remainder) {
  const divisor = task.operands.divisor;
  const total = task.total;
  if (quotient < 0 || remainder < 0) return { ok: false };
  if (remainder >= divisor) return { ok: false };
  if (quotient * divisor + remainder !== total) return { ok: false };
  const expectedQuot = Math.floor(total / divisor);
  const expectedRem = total % divisor;
  if (quotient !== expectedQuot || remainder !== expectedRem) return { ok: false };
  return { ok: true, expectedPer: expectedQuot, expectedRem };
}

/** @param {GiftsTask} task */
export function giftsPrompt(task) {
  const total = task.total;
  const itemLabel =
    task.itemKey != null ? giftsItemLabel(task.itemKey, total) : task.itemLabel;
  if (task.mode === "make_groups") {
    const size = task.groupSize ?? task.operands.divisor;
    if (task.expectedAnswer.remainder > 0 || task.skillId === "division.remainder") {
      return `יש ${total} ${itemLabel}. שמים ${size} בכל שקית. כמה שקיות מלאות אפשר להכין וכמה יישארו?`;
    }
    return `יש ${total} ${itemLabel}. שמים ${size} בכל שקית. כמה שקיות מלאות אפשר להכין?`;
  }
  const children = task.children ?? task.operands.divisor;
  if (task.expectedAnswer.remainder > 0 || task.mode === "find_remainder") {
    return `חלקו ${total} ${itemLabel} שווה בשווה בין ${children} ילדים. כמה יקבל כל ילד וכמה יישארו?`;
  }
  return `חלקו ${total} ${itemLabel} שווה בשווה בין ${children} ילדים. כמה יקבל כל ילד?`;
}

/**
 * @param {GiftsTask} task
 * @returns {{ text: string, equation: string }}
 */
export function giftsSolutionParts(task) {
  const q = task.expectedAnswer.quotient;
  const r = task.expectedAnswer.remainder;
  const d = task.operands.divisor;
  if (task.mode === "make_groups") {
    const size = task.groupSize ?? d;
    if (r > 0) {
      return {
        text: `פתרון: אפשר להכין ${q} שקיות מלאות. ${remainingItemsText(r)}`,
        equation: `${q} × ${size} + ${r} = ${task.total}`,
      };
    }
    return {
      text: `פתרון: אפשר להכין ${q} שקיות מלאות.`,
      equation: `${q} × ${size} = ${task.total}`,
    };
  }
  const children = task.children ?? d;
  if (r > 0) {
    return {
      text: `פתרון: כל ילד מקבל ${q}. ${remainingItemsText(r)}`,
      equation: `${children} × ${q} + ${r} = ${task.total}`,
    };
  }
  return {
    text: `פתרון: כל ילד מקבל ${q}.`,
    equation: `${children} × ${q} = ${task.total}`,
  };
}

/** @param {GiftsTask} task */
export function giftsSolutionText(task) {
  const parts = giftsSolutionParts(task);
  return `${parts.text}\n${parts.equation}`;
}

/**
 * @param {boolean} ok
 * @param {GiftsTask} [task]
 */
export function giftsFeedback(ok, task) {
  if (ok) return "מעולה! החלוקה נכונה.";
  if (task?.mode === "make_groups") {
    return "בדקו שוב כמה שקיות מלאות אפשר להכין וכמה יישארו.";
  }
  return "בדקו שוב כמה יקבל כל ילד וכמה יישארו.";
}

const CHILD_EMOJIS = ["👧", "👦", "🧒", "👧🏻", "👦🏻", "🧑🏻", "👧🏼", "👦🏼", "🧑🏼", "👧", "👦", "🧒"];

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

/** @param {GiftsTask} task */
export function giftsDivisorLabel(task) {
  return task.mode === "make_groups" ? "שקיות" : "ילדים";
}

/** @param {GiftsTask} task */
export function giftsQuotientLabel(task) {
  return task.mode === "make_groups" ? "שקיות מלאות" : "לכל ילד";
}

/** Compatibility: old field name */
export function generateGiftsPool(difficulty, opts = {}) {
  return generateGiftsPoolForMode(difficulty, "share_equally", difficulty !== "easy", opts.salt ?? 0);
}
