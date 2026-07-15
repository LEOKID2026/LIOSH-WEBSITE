/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{ id: string, emoji: string, name: string }} PizzaTopping */

/**
 * @typedef {{
 *   requirements: Record<string, number>
 *   filledSlices: number
 *   allowEmpty: boolean
 * }} OrderSpec
 */

/**
 * @typedef {{
 *   id: string
 *   customerName: string
 *   customerEmoji: string
 *   greeting: string
 *   ticketLine: string
 *   sliceCount: number
 *   spec: OrderSpec
 *   timeLimitSec: number
 * }} PizzeriaCustomerOrder
 */

export const CUSTOMERS_PER_LEVEL = 20;

/** @type {PizzaTopping[]} */
export const TOPPINGS = [
  { id: "cheese", emoji: "🧀", name: "גבינה" },
  { id: "tomato", emoji: "🍅", name: "עגבניה" },
  { id: "olive", emoji: "🫒", name: "זיתים" },
  { id: "mushroom", emoji: "🍄", name: "פטריות" },
  { id: "pepper", emoji: "🫑", name: "פלפל" },
  { id: "basil", emoji: "🌿", name: "בזיליקום" },
];

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    sliceCount: 4,
    hint: "שלם, חצי ורבע על פיצה ב-4 חלקים",
    maxMistakes: 5,
    timeLimitsByBand: [45, 40, 35],
  },
  medium: {
    id: "medium",
    label: "בינוני",
    sliceCount: 8,
    hint: "חצי, רבע, שלושה רבעים על 8 חלקים",
    maxMistakes: 4,
    timeLimitsByBand: [35, 30, 25],
  },
  hard: {
    id: "hard",
    label: "קשה",
    sliceCount: 8,
    hint: "שמיניות, שילובים והשלמה לשלם",
    maxMistakes: 3,
    timeLimitsByBand: [30, 25, 20],
  },
};

export const SCORE = {
  correct: 30,
  streak3: 15,
  streak5: 30,
  fastService: 5,
  timeout: -5,
};

const SUCCESS_MESSAGES = [
  "כל הכבוד! הפיצה מוכנה ללקוח.",
  "מעולה! הכנתם בדיוק לפי ההזמנה.",
];

const THIRD_RE = /שליש|1\s*\/\s*3|2\s*\/\s*3|⅓|⅔/u;

/** @param {Record<string, number>} requirements @param {number} sliceCount @param {boolean} [fullPizza] */
function spec(requirements, sliceCount, fullPizza = false) {
  const sum = Object.values(requirements).reduce((a, b) => a + b, 0);
  return {
    requirements,
    filledSlices: fullPizza ? sliceCount : sum,
    allowEmpty: !fullPizza && sum < sliceCount,
  };
}

/** @param {Omit<PizzeriaCustomerOrder, 'sliceCount'|'spec'> & { spec: OrderSpec, sliceCount?: number }} order */
function easyOrder(order) {
  return { ...order, sliceCount: 4 };
}

/** @param {Omit<PizzeriaCustomerOrder, 'sliceCount'|'spec'> & { spec: OrderSpec, sliceCount?: number }} order */
function eightSliceOrder(order) {
  return { ...order, sliceCount: 8 };
}

/** @type {PizzeriaCustomerOrder[]} */
const EASY_ORDERS = [
  easyOrder({
    id: "easy-01",
    customerName: "גל",
    customerEmoji: "👧",
    greeting: "שימו גבינה על כל הפיצה, בבקשה!",
    ticketLine: "גבינה 🧀 - על כל הפיצה",
    spec: spec({ cheese: 4 }, 4, true),
  }),
  easyOrder({
    id: "easy-02",
    customerName: "אורי",
    customerEmoji: "👦",
    greeting: "שימו עגבנייה על חצי פיצה.",
    ticketLine: "עגבניה 🍅 - חצי (2 מתוך 4)",
    spec: spec({ tomato: 2 }, 4),
  }),
  easyOrder({
    id: "easy-03",
    customerName: "נועה",
    customerEmoji: "👧🏻",
    greeting: "שימו זיתים על רבע פיצה.",
    ticketLine: "זיתים 🫒 - רבע (1 מתוך 4)",
    spec: spec({ olive: 1 }, 4),
  }),
  easyOrder({
    id: "easy-04",
    customerName: "עמית",
    customerEmoji: "🧒",
    greeting: "חצי פיצה גבינה וחצי פיצה עגבניה.",
    ticketLine: "חצי 🧀 + חצי 🍅",
    spec: spec({ cheese: 2, tomato: 2 }, 4, true),
  }),
  easyOrder({
    id: "easy-05",
    customerName: "מיה",
    customerEmoji: "👧🏽",
    greeting: "רבע פיצה זיתים והשאר גבינה.",
    ticketLine: "1 זיתים 🫒 + 3 גבינה 🧀",
    spec: spec({ olive: 1, cheese: 3 }, 4, true),
  }),
  easyOrder({
    id: "easy-06",
    customerName: "דניאל",
    customerEmoji: "👦🏻",
    greeting: "שימו פטריות על חצי פיצה.",
    ticketLine: "פטריות 🍄 - חצי (2 מתוך 4)",
    spec: spec({ mushroom: 2 }, 4),
  }),
  easyOrder({
    id: "easy-07",
    customerName: "שיר",
    customerEmoji: "👧",
    greeting: "שימו פלפל על כל הפיצה!",
    ticketLine: "פלפל 🫑 - על כל הפיצה",
    spec: spec({ pepper: 4 }, 4, true),
  }),
  easyOrder({
    id: "easy-08",
    customerName: "יואב",
    customerEmoji: "👦",
    greeting: "שימו בזיליקום על רבע פיצה.",
    ticketLine: "בזיליקום 🌿 - רבע (1 מתוך 4)",
    spec: spec({ basil: 1 }, 4),
  }),
  easyOrder({
    id: "easy-09",
    customerName: "תמר",
    customerEmoji: "👧🏻",
    greeting: "חצי פיצה גבינה וחצי פיצה פטריות.",
    ticketLine: "חצי 🧀 + חצי 🍄",
    spec: spec({ cheese: 2, mushroom: 2 }, 4, true),
  }),
  easyOrder({
    id: "easy-10",
    customerName: "איתי",
    customerEmoji: "🧒",
    greeting: "שימו עגבניה על כל הפיצה.",
    ticketLine: "עגבניה 🍅 - על כל הפיצה",
    spec: spec({ tomato: 4 }, 4, true),
  }),
  easyOrder({
    id: "easy-11",
    customerName: "הילה",
    customerEmoji: "👧",
    greeting: "רבע פיצה עגבניה והשאר גבינה.",
    ticketLine: "1 עגבניה 🍅 + 3 גבינה 🧀",
    spec: spec({ tomato: 1, cheese: 3 }, 4, true),
  }),
  easyOrder({
    id: "easy-12",
    customerName: "ניר",
    customerEmoji: "👦🏽",
    greeting: "שימו גבינה על חצי פיצה.",
    ticketLine: "גבינה 🧀 - חצי (2 מתוך 4)",
    spec: spec({ cheese: 2 }, 4),
  }),
  easyOrder({
    id: "easy-13",
    customerName: "\u05E8\u05D5\u05E0\u05D9",
    customerEmoji: "👧🏻",
    greeting: "שימו זיתים על כל הפיצה.",
    ticketLine: "זיתים 🫒 - על כל הפיצה",
    spec: spec({ olive: 4 }, 4, true),
  }),
  easyOrder({
    id: "easy-14",
    customerName: "עידן",
    customerEmoji: "👦",
    greeting: "חצי פיצה פלפל וחצי פיצה גבינה.",
    ticketLine: "חצי 🫑 + חצי 🧀",
    spec: spec({ pepper: 2, cheese: 2 }, 4, true),
  }),
  easyOrder({
    id: "easy-15",
    customerName: "ליאור",
    customerEmoji: "🧑",
    greeting: "שימו בזיליקום על חצי פיצה.",
    ticketLine: "בזיליקום 🌿 - חצי (2 מתוך 4)",
    spec: spec({ basil: 2 }, 4),
  }),
  easyOrder({
    id: "easy-16",
    customerName: "מעיין",
    customerEmoji: "👧🏽",
    greeting: "רבע פיצה פטריות והשאר גבינה.",
    ticketLine: "1 פטריות 🍄 + 3 גבינה 🧀",
    spec: spec({ mushroom: 1, cheese: 3 }, 4, true),
  }),
  easyOrder({
    id: "easy-17",
    customerName: "אלון",
    customerEmoji: "👦🏻",
    greeting: "שימו פטריות על כל הפיצה.",
    ticketLine: "פטריות 🍄 - על כל הפיצה",
    spec: spec({ mushroom: 4 }, 4, true),
  }),
  easyOrder({
    id: "easy-18",
    customerName: "יעל",
    customerEmoji: "👧",
    greeting: "חצי פיצה זיתים וחצי פיצה עגבניה.",
    ticketLine: "חצי 🫒 + חצי 🍅",
    spec: spec({ olive: 2, tomato: 2 }, 4, true),
  }),
  easyOrder({
    id: "easy-19",
    customerName: "אדם",
    customerEmoji: "🧒",
    greeting: "רבע פיצה פלפל והשאר עגבניה.",
    ticketLine: "1 פלפל 🫑 + 3 עגבניה 🍅",
    spec: spec({ pepper: 1, tomato: 3 }, 4, true),
  }),
  easyOrder({
    id: "easy-20",
    customerName: "נגה",
    customerEmoji: "👧🏻",
    greeting: "רבע פיצה בזיליקום והשאר גבינה.",
    ticketLine: "1 בזיליקום 🌿 + 3 גבינה 🧀",
    spec: spec({ basil: 1, cheese: 3 }, 4, true),
  }),
];

/** @type {PizzeriaCustomerOrder[]} */
const MEDIUM_ORDERS = [
  eightSliceOrder({
    id: "med-01",
    customerName: "שרה",
    customerEmoji: "👩",
    greeting: "שימו פטריות על חצי פיצה.",
    ticketLine: "פטריות 🍄 - חצי (4 מתוך 8)",
    spec: spec({ mushroom: 4 }, 8),
  }),
  eightSliceOrder({
    id: "med-02",
    customerName: "דן",
    customerEmoji: "👨",
    greeting: "שימו זיתים על רבע פיצה.",
    ticketLine: "זיתים 🫒 - רבע (2 מתוך 8)",
    spec: spec({ olive: 2 }, 8),
  }),
  eightSliceOrder({
    id: "med-03",
    customerName: "מאיה",
    customerEmoji: "👧🏽",
    greeting: "שימו גבינה על שלושה רבעים מהפיצה.",
    ticketLine: "גבינה 🧀 - 6 מתוך 8",
    spec: spec({ cheese: 6 }, 8),
  }),
  eightSliceOrder({
    id: "med-04",
    customerName: "יוני",
    customerEmoji: "👦🏻",
    greeting: "חצי פיצה גבינה וחצי פיצה עגבניה.",
    ticketLine: "חצי 🧀 + חצי 🍅",
    spec: spec({ cheese: 4, tomato: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-05",
    customerName: "נועם",
    customerEmoji: "👦",
    greeting: "רבע פיצה זיתים ושלושה רבעים גבינה.",
    ticketLine: "2 זיתים 🫒 + 6 גבינה 🧀",
    spec: spec({ olive: 2, cheese: 6 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-06",
    customerName: "הדס",
    customerEmoji: "👧",
    greeting: "שימו פלפל על חצי פיצה.",
    ticketLine: "פלפל 🫑 - חצי (4 מתוך 8)",
    spec: spec({ pepper: 4 }, 8),
  }),
  eightSliceOrder({
    id: "med-07",
    customerName: "גיא",
    customerEmoji: "👨🏻",
    greeting: "שימו בזיליקום על רבע פיצה.",
    ticketLine: "בזיליקום 🌿 - רבע (2 מתוך 8)",
    spec: spec({ basil: 2 }, 8),
  }),
  eightSliceOrder({
    id: "med-08",
    customerName: "\u05E8\u05D5\u05E0\u05D9",
    customerEmoji: "👧🏻",
    greeting: "שימו עגבניה על שלושה רבעים מהפיצה.",
    ticketLine: "עגבניה 🍅 - 6 מתוך 8",
    spec: spec({ tomato: 6 }, 8),
  }),
  eightSliceOrder({
    id: "med-09",
    customerName: "אבי",
    customerEmoji: "👦🏽",
    greeting: "חצי פיצה זיתים וחצי פיצה עגבניה.",
    ticketLine: "חצי 🫒 + חצי 🍅",
    spec: spec({ olive: 4, tomato: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-10",
    customerName: "ליה",
    customerEmoji: "👧",
    greeting: "שימו גבינה על כל הפיצה.",
    ticketLine: "גבינה 🧀 - על כל הפיצה",
    spec: spec({ cheese: 8 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-11",
    customerName: "עומר",
    customerEmoji: "👦",
    greeting: "שימו פטריות על רבע פיצה.",
    ticketLine: "פטריות 🍄 - רבע (2 מתוך 8)",
    spec: spec({ mushroom: 2 }, 8),
  }),
  eightSliceOrder({
    id: "med-12",
    customerName: "טלי",
    customerEmoji: "👩",
    greeting: "שימו זיתים על שלושה רבעים מהפיצה.",
    ticketLine: "זיתים 🫒 - 6 מתוך 8",
    spec: spec({ olive: 6 }, 8),
  }),
  eightSliceOrder({
    id: "med-13",
    customerName: "אור",
    customerEmoji: "👧🏽",
    greeting: "חצי פיצה פטריות וחצי פיצה גבינה.",
    ticketLine: "חצי 🍄 + חצי 🧀",
    spec: spec({ mushroom: 4, cheese: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-14",
    customerName: "יובל",
    customerEmoji: "👦🏻",
    greeting: "רבע פיצה פלפל והשאר גבינה.",
    ticketLine: "2 פלפל 🫑 + 6 גבינה 🧀",
    spec: spec({ pepper: 2, cheese: 6 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-15",
    customerName: "מור",
    customerEmoji: "👧",
    greeting: "שימו עגבניה על חצי פיצה.",
    ticketLine: "עגבניה 🍅 - חצי (4 מתוך 8)",
    spec: spec({ tomato: 4 }, 8),
  }),
  eightSliceOrder({
    id: "med-16",
    customerName: "\u05D0\u05D9\u05EA\u05DE\u05E8",
    customerEmoji: "👨",
    greeting: "חצי פיצה בזיליקום וחצי פיצה פלפל.",
    ticketLine: "חצי 🌿 + חצי 🫑",
    spec: spec({ basil: 4, pepper: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-17",
    customerName: "שקד",
    customerEmoji: "👧🏻",
    greeting: "שימו פטריות על שלושה רבעים מהפיצה.",
    ticketLine: "פטריות 🍄 - 6 מתוך 8",
    spec: spec({ mushroom: 6 }, 8),
  }),
  eightSliceOrder({
    id: "med-18",
    customerName: "רועי",
    customerEmoji: "👦",
    greeting: "רבע פיצה עגבניה ושלושה רבעים זיתים.",
    ticketLine: "2 עגבניה 🍅 + 6 זיתים 🫒",
    spec: spec({ tomato: 2, olive: 6 }, 8, true),
  }),
  eightSliceOrder({
    id: "med-19",
    customerName: "ענבל",
    customerEmoji: "👧🏽",
    greeting: "שימו פלפל על שלושה רבעים מהפיצה.",
    ticketLine: "פלפל 🫑 - 6 מתוך 8",
    spec: spec({ pepper: 6 }, 8),
  }),
  eightSliceOrder({
    id: "med-20",
    customerName: "\u05D0\u05DC\u05DE\u05D5\u05D2",
    customerEmoji: "👦🏻",
    greeting: "חצי פיצה גבינה וחצי פיצה בזיליקום.",
    ticketLine: "חצי 🧀 + חצי 🌿",
    spec: spec({ cheese: 4, basil: 4 }, 8, true),
  }),
];

/** @type {PizzeriaCustomerOrder[]} */
const HARD_ORDERS = [
  eightSliceOrder({
    id: "hard-01",
    customerName: "ליה",
    customerEmoji: "👧🏻",
    greeting: "שימו זיתים על שמינית מהפיצה.",
    ticketLine: "זיתים 🫒 - שמינית (1 מתוך 8)",
    spec: spec({ olive: 1 }, 8),
  }),
  eightSliceOrder({
    id: "hard-02",
    customerName: "עידו",
    customerEmoji: "👦",
    greeting: "שימו פטריות על חמישה שמיניות מהפיצה.",
    ticketLine: "פטריות 🍄 - 5 מתוך 8",
    spec: spec({ mushroom: 5 }, 8),
  }),
  eightSliceOrder({
    id: "hard-03",
    customerName: "\u05E0\u05D5\u05E2\u05D4",
    customerEmoji: "👧",
    greeting: "שלושה שמיניות עגבניה וחמישה שמיניות גבינה.",
    ticketLine: "3 עגבניה 🍅 + 5 גבינה 🧀",
    spec: spec({ tomato: 3, cheese: 5 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-04",
    customerName: "טל",
    customerEmoji: "🧑",
    greeting: "רבע פיצה זיתים, רבע פיצה פטריות, וחצי פיצה גבינה.",
    ticketLine: "2 זיתים 🫒 + 2 פטריות 🍄 + 4 גבינה 🧀",
    spec: spec({ olive: 2, mushroom: 2, cheese: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-05",
    customerName: "מיקה",
    customerEmoji: "👧🏽",
    greeting: "שימו גבינה על כל החלקים שלא קיבלו עגבניה. עגבניה על שלושה שמיניות.",
    ticketLine: "3 עגבניה 🍅 + 5 גבינה 🧀",
    spec: spec({ tomato: 3, cheese: 5 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-06",
    customerName: "רון",
    customerEmoji: "👨🏻",
    greeting: "שימו בזיליקום על שמינית מהפיצה.",
    ticketLine: "בזיליקום 🌿 - שמינית (1 מתוך 8)",
    spec: spec({ basil: 1 }, 8),
  }),
  eightSliceOrder({
    id: "hard-07",
    customerName: "אלה",
    customerEmoji: "👧",
    greeting: "שימו גבינה על שבעה שמיניות מהפיצה.",
    ticketLine: "גבינה 🧀 - 7 מתוך 8",
    spec: spec({ cheese: 7 }, 8),
  }),
  eightSliceOrder({
    id: "hard-08",
    customerName: "יונתן",
    customerEmoji: "👦",
    greeting: "שלושה שמיניות פלפל וחמישה שמיניות גבינה.",
    ticketLine: "3 פלפל 🫑 + 5 גבינה 🧀",
    spec: spec({ pepper: 3, cheese: 5 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-09",
    customerName: "\u05D3\u05E4\u05E0\u05D4",
    customerEmoji: "👩",
    greeting: "שימו עגבניה על שני שמיניות מהפיצה.",
    ticketLine: "עגבניה 🍅 - 2 מתוך 8",
    spec: spec({ tomato: 2 }, 8),
  }),
  eightSliceOrder({
    id: "hard-10",
    customerName: "אסף",
    customerEmoji: "👦🏻",
    greeting: "שמינית פטריות והשאר גבינה.",
    ticketLine: "1 פטריות 🍄 + 7 גבינה 🧀",
    spec: spec({ mushroom: 1, cheese: 7 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-11",
    customerName: "קורן",
    customerEmoji: "👧🏻",
    greeting: "שימו זיתים על שישה שמיניות מהפיצה.",
    ticketLine: "זיתים 🫒 - 6 מתוך 8",
    spec: spec({ olive: 6 }, 8),
  }),
  eightSliceOrder({
    id: "hard-12",
    customerName: "עמית",
    customerEmoji: "🧒",
    greeting: "שני שמיניות בזיליקום ושישה שמיניות פטריות.",
    ticketLine: "2 בזיליקום 🌿 + 6 פטריות 🍄",
    spec: spec({ basil: 2, mushroom: 6 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-13",
    customerName: "שירה",
    customerEmoji: "👧",
    greeting: "שימו גבינה על חמישה שמיניות מהפיצה.",
    ticketLine: "גבינה 🧀 - 5 מתוך 8",
    spec: spec({ cheese: 5 }, 8),
  }),
  eightSliceOrder({
    id: "hard-14",
    customerName: "\u05E0\u05D3\u05D1",
    customerEmoji: "👦🏽",
    greeting: "שמינית פלפל, שני שמיניות עגבניה, והשאר גבינה.",
    ticketLine: "1 פלפל 🫑 + 2 עגבניה 🍅 + 5 גבינה 🧀",
    spec: spec({ pepper: 1, tomato: 2, cheese: 5 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-15",
    customerName: "עדי",
    customerEmoji: "👧🏽",
    greeting: "שלושה שמיניות זיתים, שני שמיניות פלפל, והשאר גבינה.",
    ticketLine: "3 זיתים 🫒 + 2 פלפל 🫑 + 3 גבינה 🧀",
    spec: spec({ olive: 3, pepper: 2, cheese: 3 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-16",
    customerName: "אורי",
    customerEmoji: "👦",
    greeting: "שימו פטריות על שלושה שמיניות מהפיצה.",
    ticketLine: "פטריות 🍄 - 3 מתוך 8",
    spec: spec({ mushroom: 3 }, 8),
  }),
  eightSliceOrder({
    id: "hard-17",
    customerName: "\u05DE\u05D0\u05D9\u05D4",
    customerEmoji: "👧🏻",
    greeting: "שימו עגבניה על \u05E9\u05DE\u05D9\u05E0\u05D9\u05EA אחת מהפיצה.",
    ticketLine: "עגבניה 🍅 - \u05E9\u05DE\u05D9\u05E0\u05D9\u05EA (1 מתוך 8)",
    spec: spec({ tomato: 1 }, 8),
  }),
  eightSliceOrder({
    id: "hard-18",
    customerName: "גל",
    customerEmoji: "👧",
    greeting: "ארבעה שמיניות בזיליקום וארבעה שמיניות גבינה.",
    ticketLine: "4 בזיליקום 🌿 + 4 גבינה 🧀",
    spec: spec({ basil: 4, cheese: 4 }, 8, true),
  }),
  eightSliceOrder({
    id: "hard-19",
    customerName: "איתי",
    customerEmoji: "👦🏻",
    greeting: "שימו פלפל על חמישה שמיניות מהפיצה.",
    ticketLine: "פלפל 🫑 - 5 מתוך 8",
    spec: spec({ pepper: 5 }, 8),
  }),
  eightSliceOrder({
    id: "hard-20",
    customerName: "נועה",
    customerEmoji: "👧🏻",
    greeting: "שני שמיניות זיתים, שני שמיניות פטריות, וארבעה שמיניות עגבניה.",
    ticketLine: "2 זיתים 🫒 + 2 פטריות 🍄 + 4 עגבניה 🍅",
    spec: spec({ olive: 2, mushroom: 2, tomato: 4 }, 8, true),
  }),
];

/** @type {Record<DifficultyId, PizzeriaCustomerOrder[]>} */
export const CUSTOMERS_BY_DIFFICULTY = {
  easy: EASY_ORDERS,
  medium: MEDIUM_ORDERS,
  hard: HARD_ORDERS,
};

/** @param {Record<number, string>} sliceMap */
function countByTopping(sliceMap) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const toppingId of Object.values(sliceMap)) {
    if (!toppingId) continue;
    counts[toppingId] = (counts[toppingId] || 0) + 1;
  }
  return counts;
}

/** @param {Record<number, string>} sliceMap */
function filledCount(sliceMap) {
  return Object.values(sliceMap).filter(Boolean).length;
}

/** @param {number} n */
function successMessage(n) {
  return SUCCESS_MESSAGES[n % SUCCESS_MESSAGES.length];
}

/**
 * @param {OrderSpec} orderSpec
 * @param {number} sliceCount
 * @param {Record<number, string>} sliceMap
 */
export function validateOrderSpec(orderSpec, sliceCount, sliceMap) {
  const counts = countByTopping(sliceMap);
  const filled = filledCount(sliceMap);
  const { requirements, filledSlices, allowEmpty } = orderSpec;

  for (const toppingId of Object.values(sliceMap)) {
    if (toppingId && requirements[toppingId] == null) {
      return { ok: false, message: "שימו לב: יש תוספת מיותרת על הפיצה." };
    }
  }

  for (const [toppingId, required] of Object.entries(requirements)) {
    const actual = counts[toppingId] || 0;
    if (actual > required) {
      return { ok: false, message: "שימו לב: יש תוספת מיותרת על הפיצה." };
    }
  }

  let missingTotal = 0;
  for (const [toppingId, required] of Object.entries(requirements)) {
    const actual = counts[toppingId] || 0;
    if (actual < required) missingTotal += required - actual;
  }

  if (missingTotal > 0) {
    if (missingTotal === 1) {
      return { ok: false, message: "חסר עוד חלק אחד לפי ההזמנה." };
    }
    return { ok: false, message: "כמעט! בדקו כמה חלקים קיבלו כל תוספת." };
  }

  if (filled > filledSlices) {
    return { ok: false, message: "שימו לב: יש תוספת מיותרת על הפיצה." };
  }

  if (!allowEmpty && filled < sliceCount) {
    const gap = sliceCount - filled;
    if (gap === 1) {
      return { ok: false, message: "חסר עוד חלק אחד לפי ההזמנה." };
    }
    return { ok: false, message: "כמעט! בדקו כמה חלקים קיבלו כל תוספת." };
  }

  if (allowEmpty && filled > filledSlices) {
    return { ok: false, message: "שימו לב: יש תוספת מיותרת על הפיצה." };
  }

  return { ok: true, message: successMessage(filled) };
}

/** @param {PizzeriaCustomerOrder} order @param {Record<number, string>} sliceMap */
export function validateCustomerOrder(order, sliceMap) {
  return validateOrderSpec(order.spec, order.sliceCount, sliceMap);
}

/** @param {DifficultyId} difficultyId @param {number} index 0-based */
export function getCustomerTimeLimit(difficultyId, index) {
  const diff = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.easy;
  const band = index < 5 ? 0 : index < 15 ? 1 : 2;
  return diff.timeLimitsByBand[band];
}

/** Difficulty weight for ordering validation (lower = opening). */
export function pizzeriaOrderDifficultyScore(order) {
  const reqSum = Object.values(order.spec.requirements).reduce((a, b) => a + b, 0);
  const toppingCount = Object.keys(order.spec.requirements).length;
  let score = reqSum + toppingCount * 2;
  if (order.spec.allowEmpty && reqSum < order.sliceCount) score -= 1;
  const text = `${order.greeting} ${order.ticketLine}`;
  if (/שלא קיבלו|השאר|שלושה|חמישה|שישה|שבעה/.test(text)) score += 8;
  if (/שמינית|5 מתוך|6 מתוך|7 מתוך/.test(text)) score += 4;
  return score;
}

/** @param {DifficultyId} difficulty */
export function pickCustomersForRun(difficulty) {
  const pool = CUSTOMERS_BY_DIFFICULTY[difficulty] ?? CUSTOMERS_BY_DIFFICULTY.easy;
  return pool.slice(0, CUSTOMERS_PER_LEVEL).map((order, index) => ({
    ...order,
    timeLimitSec: getCustomerTimeLimit(difficulty, index),
  }));
}

/**
 * @param {number} successfulCustomers
 * @param {number} customersTotal
 * @param {number} mistakes
 * @param {number} maxMistakes
 */
export function isPizzeriaWin(successfulCustomers, customersTotal, mistakes, maxMistakes) {
  if (mistakes > maxMistakes) return false;
  return successfulCustomers >= customersTotal;
}

/** @param {string | null} toppingId */
export function toppingById(toppingId) {
  return TOPPINGS.find((t) => t.id === toppingId);
}

/** @param {number} index @param {number} total @param {number} radius @param {number} cx @param {number} cy */
export function wedgePath(index, total, radius, cx, cy) {
  const start = ((index * 360) / total - 90) * (Math.PI / 180);
  const end = (((index + 1) * 360) / total - 90) * (Math.PI / 180);
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = 360 / total > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/** @param {number} index @param {number} total @param {number} radius @param {number} cx @param {number} cy */
export function wedgeCenter(index, total, radius, cx, cy) {
  const mid = ((index + 0.5) * 360) / total - 90;
  const rad = (mid * Math.PI) / 180;
  const dist = radius * 0.68;
  return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
}

/** @returns {{ ok: boolean, issues: string[] }} */
export function auditPizzeriaContent() {
  /** @type {string[]} */
  const issues = [];

  for (const [diff, orders] of Object.entries(CUSTOMERS_BY_DIFFICULTY)) {
    if (orders.length < CUSTOMERS_PER_LEVEL) {
      issues.push(`${diff}: pool has only ${orders.length} orders (need ${CUSTOMERS_PER_LEVEL})`);
    }

    const expectedSlices = DIFFICULTIES[/** @type {DifficultyId} */ (diff)].sliceCount;

    for (const order of orders) {
      const text = `${order.greeting} ${order.ticketLine}`;
      if (THIRD_RE.test(text)) {
        issues.push(`${order.id}: contains forbidden third-fraction wording`);
      }
      if (order.sliceCount !== expectedSlices) {
        issues.push(`${order.id}: sliceCount ${order.sliceCount} != ${expectedSlices}`);
      }

      const reqSum = Object.values(order.spec.requirements).reduce((a, b) => a + b, 0);
      if (reqSum > order.sliceCount) {
        issues.push(`${order.id}: requirements sum ${reqSum} exceeds sliceCount`);
      }
      if (!order.spec.allowEmpty && order.spec.filledSlices !== order.sliceCount) {
        issues.push(`${order.id}: full pizza spec mismatch`);
      }
      if (order.spec.allowEmpty && order.spec.filledSlices !== reqSum) {
        issues.push(`${order.id}: partial pizza filledSlices mismatch`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Sample orders for docs/tests — first 5 per level. */
export function sampleOrdersByDifficulty() {
  return {
    easy: EASY_ORDERS.slice(0, 5).map((o) => ({
      greeting: o.greeting,
      requirements: o.spec.requirements,
      sliceCount: o.sliceCount,
    })),
    medium: MEDIUM_ORDERS.slice(0, 5).map((o) => ({
      greeting: o.greeting,
      requirements: o.spec.requirements,
      sliceCount: o.sliceCount,
    })),
    hard: HARD_ORDERS.slice(0, 5).map((o) => ({
      greeting: o.greeting,
      requirements: o.spec.requirements,
      sliceCount: o.sliceCount,
    })),
  };
}
