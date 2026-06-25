/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{
 *   id: string
 *   total: number
 *   children: number
 *   itemLabel: string
 *   itemEmoji: string
 *   imageSrc?: string
 * }} GiftsTask */

/** @type {Record<DifficultyId, GiftsTask[]>} */
export const GIFTS_TASKS = {
  easy: [
    { id: "e1", total: 12, children: 3, itemLabel: "מתנות", itemEmoji: "🎁" },
    { id: "e2", total: 20, children: 5, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "e3", total: 24, children: 6, itemLabel: "מדבקות", itemEmoji: "⭐" },
    { id: "e4", total: 16, children: 4, itemLabel: "סוכריות", itemEmoji: "🍭" },
    { id: "e5", total: 18, children: 3, itemLabel: "מתנות", itemEmoji: "🎀" },
    { id: "e6", total: 10, children: 2, itemLabel: "מדבקות", itemEmoji: "🌟" },
    { id: "e7", total: 28, children: 7, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "e8", total: 15, children: 5, itemLabel: "מתנות", itemEmoji: "🎁" },
    { id: "e9", total: 21, children: 3, itemLabel: "מדבקות", itemEmoji: "✨" },
    { id: "e10", total: 30, children: 6, itemLabel: "סוכריות", itemEmoji: "🍭" },
  ],
  medium: [
    { id: "m1", total: 31, children: 6, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "m2", total: 45, children: 8, itemLabel: "מדבקות", itemEmoji: "⭐" },
    { id: "m3", total: 52, children: 10, itemLabel: "כוכבים", itemEmoji: "🌟" },
    { id: "m4", total: 37, children: 7, itemLabel: "מתנות", itemEmoji: "🎁" },
    { id: "m5", total: 41, children: 5, itemLabel: "סוכריות", itemEmoji: "🍭" },
    { id: "m6", total: 53, children: 8, itemLabel: "מדבקות", itemEmoji: "✨" },
    { id: "m7", total: 29, children: 4, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "m8", total: 58, children: 9, itemLabel: "מתנות", itemEmoji: "🎀" },
    { id: "m9", total: 47, children: 6, itemLabel: "כוכבים", itemEmoji: "⭐" },
    { id: "m10", total: 35, children: 8, itemLabel: "מדבקות", itemEmoji: "🌟" },
  ],
  hard: [
    { id: "h1", total: 96, children: 12, itemLabel: "מתנות", itemEmoji: "🎁" },
    { id: "h2", total: 87, children: 9, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "h3", total: 74, children: 8, itemLabel: "מדבקות", itemEmoji: "⭐" },
    { id: "h4", total: 100, children: 10, itemLabel: "סוכריות", itemEmoji: "🍭" },
    { id: "h5", total: 91, children: 11, itemLabel: "מתנות", itemEmoji: "🎀" },
    { id: "h6", total: 83, children: 12, itemLabel: "כוכבים", itemEmoji: "🌟" },
    { id: "h7", total: 68, children: 7, itemLabel: "סוכריות", itemEmoji: "🍬" },
    { id: "h8", total: 95, children: 9, itemLabel: "מדבקות", itemEmoji: "✨" },
    { id: "h9", total: 77, children: 8, itemLabel: "מתנות", itemEmoji: "🎁" },
    { id: "h10", total: 88, children: 11, itemLabel: "סוכריות", itemEmoji: "🍭" },
  ],
};

/** @param {GiftsTask} task @param {number} perChild @param {number} remainder */
export function validateGiftsDivision(task, perChild, remainder) {
  const { total, children } = task;
  if (perChild < 0 || remainder < 0) return { ok: false };
  if (perChild * children + remainder !== total) return { ok: false };
  const expectedPer = Math.floor(total / children);
  const expectedRem = total % children;
  if (perChild !== expectedPer || remainder !== expectedRem) return { ok: false };
  return { ok: true, expectedPer, expectedRem };
}

export function giftsPrompt(task) {
  return `לליאו יש ${task.total} ${task.itemLabel}. הגיעו ${task.children} ילדים. כמה יקבל כל ילד?`;
}

export function giftsFeedback(ok, task, perChild, remainder) {
  if (ok) {
    if (remainder > 0) {
      return `יפה! כל ילד קיבל ${perChild} ולליאו נשארו ${remainder}.`;
    }
    return "מעולה! כל ילד קיבל אותו מספר.";
  }
  return "כמעט! בדקו שכל הילדים קיבלו שווה בשווה.";
}

const CHILD_EMOJIS = ["👧", "👦", "🧒", "👧🏽", "👦🏽", "🧒🏻", "👧🏻", "👦🏻", "🧒🏽", "👧🏼", "👦🏼", "🧒🏼"];

export function childEmojiAt(index) {
  return CHILD_EMOJIS[index % CHILD_EMOJIS.length];
}
