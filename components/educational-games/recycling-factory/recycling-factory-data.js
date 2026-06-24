/** @typedef {'paper'|'plastic'|'glass'|'metal'|'trash'} BinId */
/** @typedef {'easy'|'medium'|'hard'} DifficultyId */

/**
 * @typedef {Object} RecyclingItem
 * @property {string} id
 * @property {string} emoji
 * @property {string} name
 * @property {BinId} bin
 * @property {string} [imageSrc] — optional product image; falls back to emoji
 */

/** @type {Record<BinId, { id: BinId, label: string, emoji: string, accent: string, lid: string, body: string }>} */
export const BINS = {
  paper: {
    id: "paper",
    label: "נייר",
    emoji: "📄",
    accent: "#2563eb",
    lid: "#1d4ed8",
    body: "#3b82f6",
  },
  plastic: {
    id: "plastic",
    label: "פלסטיק",
    emoji: "🧴",
    accent: "#ca8a04",
    lid: "#a16207",
    body: "#facc15",
  },
  glass: {
    id: "glass",
    label: "זכוכית",
    emoji: "🫙",
    accent: "#16a34a",
    lid: "#15803d",
    body: "#4ade80",
  },
  metal: {
    id: "metal",
    label: "מתכת",
    emoji: "🥫",
    accent: "#64748b",
    lid: "#475569",
    body: "#94a3b8",
  },
  trash: {
    id: "trash",
    label: "רגיל",
    emoji: "🗑️",
    accent: "#dc2626",
    lid: "#991b1b",
    body: "#f87171",
  },
};

/** @type {RecyclingItem[]} */
export const ITEMS = [
  {
    id: "newspaper",
    emoji: "📰",
    name: "עיתון",
    bin: "paper",
    imageSrc: "/images/recycling-items/newspaper.svg",
  },
  {
    id: "page",
    emoji: "📄",
    name: "דף",
    bin: "paper",
    imageSrc: "/images/recycling-items/paper-page.svg",
  },
  {
    id: "box",
    emoji: "📦",
    name: "קרטון",
    bin: "paper",
    imageSrc: "/images/recycling-items/cardboard-box.svg",
  },
  { id: "notebook", emoji: "📓", name: "מחברת", bin: "paper" },
  {
    id: "bottle-plastic",
    emoji: "🧴",
    name: "בקבוק פלסטיק",
    bin: "plastic",
    imageSrc: "/images/recycling-items/plastic-bottle.svg",
  },
  {
    id: "bag",
    emoji: "🛍️",
    name: "שקית",
    bin: "plastic",
    imageSrc: "/images/recycling-items/plastic-bag.svg",
  },
  { id: "yogurt", emoji: "🥛", name: "גביע יוגורט", bin: "plastic" },
  { id: "plastic-box", emoji: "📦", name: "קופסת פלסטיק", bin: "plastic" },
  { id: "bottle-glass", emoji: "🍾", name: "בקבוק זכוכית", bin: "glass" },
  {
    id: "jar",
    emoji: "🫙",
    name: "צנצנת",
    bin: "glass",
    imageSrc: "/images/recycling-items/glass-jar.svg",
  },
  { id: "cup", emoji: "🥃", name: "כוס זכוכית", bin: "glass" },
  {
    id: "can",
    emoji: "🥫",
    name: "פחית",
    bin: "metal",
    imageSrc: "/images/recycling-items/metal-can.svg",
  },
  { id: "tin", emoji: "🥫", name: "קופסת שימורים", bin: "metal" },
  { id: "lid", emoji: "⭕", name: "מכסה מתכת", bin: "metal" },
  {
    id: "banana",
    emoji: "🍌",
    name: "קליפת בננה",
    bin: "trash",
    imageSrc: "/images/recycling-items/banana-peel.svg",
  },
  { id: "tissue", emoji: "🧻", name: "טישו מלוכלך", bin: "trash" },
  { id: "toy", emoji: "🧸", name: "צעצוע שבור", bin: "trash" },
  { id: "food", emoji: "🍎", name: "שאריות אוכל", bin: "trash" },
];

/** @type {Record<DifficultyId, { id: DifficultyId, label: string, bins: BinId[], itemsTarget: number, maxMistakes: number, beltDurationMs: number, dualChance: number }>} */
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    bins: ["paper", "plastic", "trash"],
    itemsTarget: 20,
    maxMistakes: 5,
    beltDurationMs: 9000,
    dualChance: 0,
  },
  medium: {
    id: "medium",
    label: "בינוני",
    bins: ["paper", "plastic", "glass", "trash"],
    itemsTarget: 30,
    maxMistakes: 4,
    beltDurationMs: 6500,
    dualChance: 0,
  },
  hard: {
    id: "hard",
    label: "קשה",
    bins: ["paper", "plastic", "glass", "metal", "trash"],
    itemsTarget: 40,
    maxMistakes: 3,
    beltDurationMs: 4800,
    dualChance: 0.35,
  },
};

export const FACTS = [
  "נייר ממוחזר יכול להפוך שוב לנייר חדש.",
  "בקבוקי פלסטיק יכולים להפוך למוצרים חדשים.",
  "זכוכית אפשר למחזר הרבה פעמים.",
  "פחיות מתכת מתאימות למיחזור.",
  "מיון נכון עוזר לשמור על הסביבה.",
  "מיחזור חוסך משאבי טבע יקרים.",
  "כל פריט במקום הנכון עוזר לכדור הארץ.",
];

/** @param {BinId[]} activeBins */
export function pickRandomItem(activeBins) {
  const allowed = ITEMS.filter((item) => activeBins.includes(item.bin));
  return allowed[Math.floor(Math.random() * allowed.length)];
}

/** @param {BinId} binId */
export function pickFactForBin(binId) {
  const binFacts = {
    paper: "נייר ממוחזר יכול להפוך שוב לנייר חדש.",
    plastic: "בקבוקי פלסטיק יכולים להפוך למוצרים חדשים.",
    glass: "זכוכית אפשר למחזר הרבה פעמים.",
    metal: "פחיות מתכת מתאימות למיחזור.",
    trash: "מיון נכון עוזר לשמור על הסביבה.",
  };
  if (Math.random() < 0.65) return binFacts[binId];
  return FACTS[Math.floor(Math.random() * FACTS.length)];
}

export const SCORE = {
  correct: 10,
  fastBonus: 5,
  fastThreshold: 0.35,
  streak5: 20,
  streak10: 50,
  mistake: -5,
  miss: -5,
};
