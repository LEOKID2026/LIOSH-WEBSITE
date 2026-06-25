/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'build' | 'findTrays' | 'findTotal'} BakeryMode */

/** @typedef {{
 *   id: string
 *   mode: BakeryMode
 *   trays?: number
 *   perTray?: number
 *   total?: number
 *   itemLabel: string
 *   itemEmoji: string
 *   imageSrc?: string
 * }} BakeryTask */

/** @type {Record<DifficultyId, BakeryTask[]>} */
export const BAKERY_TASKS = {
  easy: [
    { id: "e1", mode: "build", trays: 3, perTray: 4, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "e2", mode: "build", trays: 5, perTray: 2, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "e3", mode: "build", trays: 4, perTray: 5, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "e4", mode: "build", trays: 2, perTray: 5, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "e5", mode: "build", trays: 3, perTray: 3, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "e6", mode: "build", trays: 5, perTray: 4, itemLabel: "לחמניות", itemEmoji: "🥐" },
    { id: "e7", mode: "build", trays: 4, perTray: 2, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "e8", mode: "build", trays: 2, perTray: 4, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "e9", mode: "build", trays: 5, perTray: 5, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "e10", mode: "build", trays: 3, perTray: 2, itemLabel: "עוגיות", itemEmoji: "🍪" },
  ],
  medium: [
    { id: "m1", mode: "build", trays: 6, perTray: 7, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "m2", mode: "build", trays: 8, perTray: 5, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "m3", mode: "build", trays: 9, perTray: 4, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "m4", mode: "build", trays: 7, perTray: 6, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "m5", mode: "build", trays: 5, perTray: 8, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "m6", mode: "build", trays: 10, perTray: 3, itemLabel: "לחמניות", itemEmoji: "🥐" },
    { id: "m7", mode: "build", trays: 6, perTray: 5, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "m8", mode: "build", trays: 8, perTray: 4, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "m9", mode: "build", trays: 9, perTray: 5, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "m10", mode: "build", trays: 7, perTray: 7, itemLabel: "עוגיות", itemEmoji: "🍪" },
  ],
  hard: [
    { id: "h1", mode: "findTrays", total: 36, perTray: 6, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "h2", mode: "findTrays", total: 48, perTray: 8, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "h3", mode: "findTotal", trays: 7, perTray: 9, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "h4", mode: "findTrays", total: 54, perTray: 6, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "h5", mode: "findTotal", trays: 8, perTray: 7, itemLabel: "לחמניות", itemEmoji: "🥐" },
    { id: "h6", mode: "findTrays", total: 63, perTray: 9, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "h7", mode: "findTotal", trays: 9, perTray: 6, itemLabel: "עוגיות", itemEmoji: "🍪" },
    { id: "h8", mode: "findTrays", total: 72, perTray: 8, itemLabel: "לחמניות", itemEmoji: "🥖" },
    { id: "h9", mode: "findTotal", trays: 6, perTray: 11, itemLabel: "קאפקייקס", itemEmoji: "🧁" },
    { id: "h10", mode: "findTrays", total: 80, perTray: 10, itemLabel: "עוגיות", itemEmoji: "🍪" },
  ],
};

export function bakeryPrompt(task) {
  if (task.mode === "build") {
    return `הכינו ${task.trays} תבניות. בכל תבנית ${task.perTray} ${task.itemLabel}. כמה ${task.itemLabel} צריך?`;
  }
  if (task.mode === "findTrays") {
    return `יש ${task.total} ${task.itemLabel}. בכל תבנית ${task.perTray}. כמה תבניות צריך?`;
  }
  return `יש ${task.trays} מגשים, בכל מגש ${task.perTray} ${task.itemLabel}. כמה סך הכול?`;
}

/** @param {BakeryTask} task @param {{ trays: number, perTray: number, total: number }} answer */
export function validateBakery(task, answer) {
  let expected = { trays: 0, perTray: 0, total: 0 };
  if (task.mode === "build") {
    expected = { trays: task.trays ?? 0, perTray: task.perTray ?? 0, total: (task.trays ?? 0) * (task.perTray ?? 0) };
  } else if (task.mode === "findTrays") {
    expected = {
      trays: Math.floor((task.total ?? 0) / (task.perTray ?? 1)),
      perTray: task.perTray ?? 0,
      total: task.total ?? 0,
    };
  } else {
    expected = {
      trays: task.trays ?? 0,
      perTray: task.perTray ?? 0,
      total: (task.trays ?? 0) * (task.perTray ?? 0),
    };
  }

  const ok =
    answer.trays === expected.trays &&
    answer.perTray === expected.perTray &&
    answer.total === expected.total;
  return { ok, expected };
}

export function bakeryFeedback(ok) {
  return ok ? "מעולה! הכנתם בדיוק את ההזמנה." : "כמעט! בדקו כמה יש בכל תבנית וכמה תבניות יש.";
}
