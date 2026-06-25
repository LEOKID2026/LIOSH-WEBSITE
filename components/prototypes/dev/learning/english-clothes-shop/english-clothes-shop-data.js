/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'word' | 'color_item' | 'sentence'} ShopLevel */

/** @typedef {{
 *   id: string
 *   level: ShopLevel
 *   requestEn: string
 *   color?: string
 *   item?: string
 *   emoji: string
 *   imageSrc?: string
 * }} ShopTask */

export const COLORS = {
  red: { label: "red", labelHe: "אדום", emoji: "🔴" },
  blue: { label: "blue", labelHe: "כחול", emoji: "🔵" },
  green: { label: "green", labelHe: "ירוק", emoji: "🟢" },
  yellow: { label: "yellow", labelHe: "צהוב", emoji: "🟡" },
  black: { label: "black", labelHe: "שחור", emoji: "⚫" },
  white: { label: "white", labelHe: "לבן", emoji: "⚪" },
};

export const ITEMS = {
  hat: { label: "hat", labelHe: "כובע", emoji: "🎩" },
  shoes: { label: "shoes", labelHe: "נעליים", emoji: "👟" },
  shirt: { label: "shirt", labelHe: "חולצה", emoji: "👕" },
  bag: { label: "bag", labelHe: "תיק", emoji: "👜" },
  dress: { label: "dress", labelHe: "שמלה", emoji: "👗" },
  pants: { label: "pants", labelHe: "מכנסיים", emoji: "👖" },
};

/** @type {Record<DifficultyId, ShopTask[]>} */
export const SHOP_TASKS = {
  easy: [
    { id: "e1", level: "word", requestEn: "hat", item: "hat", emoji: "🎩" },
    { id: "e2", level: "word", requestEn: "shoes", item: "shoes", emoji: "👟" },
    { id: "e3", level: "word", requestEn: "shirt", item: "shirt", emoji: "👕" },
    { id: "e4", level: "word", requestEn: "bag", item: "bag", emoji: "👜" },
    { id: "e5", level: "word", requestEn: "red", color: "red", emoji: "🔴" },
    { id: "e6", level: "word", requestEn: "blue", color: "blue", emoji: "🔵" },
    { id: "e7", level: "word", requestEn: "dress", item: "dress", emoji: "👗" },
    { id: "e8", level: "word", requestEn: "pants", item: "pants", emoji: "👖" },
    { id: "e9", level: "word", requestEn: "green", color: "green", emoji: "🟢" },
    { id: "e10", level: "word", requestEn: "yellow", color: "yellow", emoji: "🟡" },
  ],
  medium: [
    { id: "m1", level: "color_item", requestEn: "red hat", color: "red", item: "hat", emoji: "🎩" },
    { id: "m2", level: "color_item", requestEn: "blue shoes", color: "blue", item: "shoes", emoji: "👟" },
    { id: "m3", level: "color_item", requestEn: "green shirt", color: "green", item: "shirt", emoji: "👕" },
    { id: "m4", level: "color_item", requestEn: "yellow bag", color: "yellow", item: "bag", emoji: "👜" },
    { id: "m5", level: "color_item", requestEn: "black hat", color: "black", item: "hat", emoji: "🎩" },
    { id: "m6", level: "color_item", requestEn: "white shirt", color: "white", item: "shirt", emoji: "👕" },
    { id: "m7", level: "color_item", requestEn: "red dress", color: "red", item: "dress", emoji: "👗" },
    { id: "m8", level: "color_item", requestEn: "blue pants", color: "blue", item: "pants", emoji: "👖" },
    { id: "m9", level: "color_item", requestEn: "green bag", color: "green", item: "bag", emoji: "👜" },
    { id: "m10", level: "color_item", requestEn: "yellow shoes", color: "yellow", item: "shoes", emoji: "👟" },
  ],
  hard: [
    { id: "h1", level: "sentence", requestEn: "I need a green shirt", color: "green", item: "shirt", emoji: "👕" },
    { id: "h2", level: "sentence", requestEn: "Give me the yellow bag", color: "yellow", item: "bag", emoji: "👜" },
    { id: "h3", level: "sentence", requestEn: "Please find blue shoes", color: "blue", item: "shoes", emoji: "👟" },
    { id: "h4", level: "sentence", requestEn: "I want a red hat", color: "red", item: "hat", emoji: "🎩" },
    { id: "h5", level: "sentence", requestEn: "Can I have a white shirt?", color: "white", item: "shirt", emoji: "👕" },
    { id: "h6", level: "sentence", requestEn: "I need black pants", color: "black", item: "pants", emoji: "👖" },
    { id: "h7", level: "sentence", requestEn: "Give me the green dress", color: "green", item: "dress", emoji: "👗" },
    { id: "h8", level: "sentence", requestEn: "Please find a yellow hat", color: "yellow", item: "hat", emoji: "🎩" },
    { id: "h9", level: "sentence", requestEn: "I need blue bag", color: "blue", item: "bag", emoji: "👜" },
    { id: "h10", level: "sentence", requestEn: "Can I get red shoes?", color: "red", item: "shoes", emoji: "👟" },
  ],
};

/** Shelf products for the shop */
export function shelfProducts() {
  /** @type {{ id: string, color: string, item: string, emoji: string, imageSrc?: string }[]} */
  const out = [];
  for (const colorKey of Object.keys(COLORS)) {
    for (const itemKey of Object.keys(ITEMS)) {
      const c = COLORS[/** @type {keyof typeof COLORS} */ (colorKey)];
      const it = ITEMS[/** @type {keyof typeof ITEMS} */ (itemKey)];
      out.push({
        id: `${colorKey}-${itemKey}`,
        color: colorKey,
        item: itemKey,
        emoji: it.emoji,
      });
    }
  }
  return out;
}

/** @param {ShopTask} task @param {{ color?: string, item?: string }} pick */
export function validateShopPick(task, pick) {
  if (task.level === "word") {
    if (task.color) return pick.color === task.color;
    return pick.item === task.item;
  }
  return pick.color === task.color && pick.item === task.item;
}

export function shopFeedback(ok) {
  return ok ? "Perfect! ✓ הפריט נכון." : "כמעט! בדקו צבע ופריט.";
}

export function productLabel(colorKey, itemKey) {
  const c = COLORS[/** @type {keyof typeof COLORS} */ (colorKey)];
  const it = ITEMS[/** @type {keyof typeof ITEMS} */ (itemKey)];
  return `${c?.label} ${it?.label}`;
}
