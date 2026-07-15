/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{ id: string, emoji: string, name: string }} PizzaTopping */

/**
 * @typedef {{
 *   id: string
 *   customerName: string
 *   customerEmoji: string
 *   greeting: string
 *   ticketLine: string
 *   sliceCount: number
 *   validate: (sliceMap: Record<number, string>) => { ok: boolean, message: string }
 * }} PizzeriaCustomerOrder
 */

export const PROTOTYPE_CUSTOMER_COUNT = 4;

/** @type {PizzaTopping[]} */
export const TOPPINGS = [
  { id: "cheese", emoji: "🧀", name: "גבינה" },
  { id: "tomato", emoji: "🍅", name: "עגבניה" },
  { id: "olive", emoji: "🫒", name: "זיתים" },
  { id: "mushroom", emoji: "🍄", name: "פטריות" },
  { id: "pepper", emoji: "🫑", name: "פלפל" },
  { id: "basil", emoji: "🌿", name: "בזיליקום" },
];

export const DIFFICULTY_HINTS = {
  easy: "הזמנות פשוטות - שלם, חצי ורבע על פיצה ב-4 חלקים",
  medium: "יותר תוספות - רבעים, חצי ושלושה רבעים על 8 חלקים",
  hard: "הזמנות מורכבות יותר - שמיניות ושילובים (דוגמה זמנית)",
};

/** @param {Record<number, string>} sliceMap @param {string} toppingId */
function countTopping(sliceMap, toppingId) {
  return Object.values(sliceMap).filter((t) => t === toppingId).length;
}

/** @param {Record<number, string>} sliceMap */
function filledCount(sliceMap) {
  return Object.values(sliceMap).filter(Boolean).length;
}

/** @param {number} sliceCount @param {string} toppingId @param {number} count */
function exactly(sliceMap, sliceCount, toppingId, count) {
  const n = countTopping(sliceMap, toppingId);
  if (n === count) {
    return { ok: true, message: "מעולה! הלקוח מרוצה מאוד 😊🍕" };
  }
  return {
    ok: false,
    message: `עוד לא בדיוק - צריך ${count} חלקים עם ${toppingLabel(toppingId)} (יש ${n})`,
  };
}

/** @param {string} id */
function toppingLabel(id) {
  return TOPPINGS.find((t) => t.id === id)?.name ?? id;
}

/** @type {Record<DifficultyId, PizzeriaCustomerOrder[]>} */
export const CUSTOMERS_BY_DIFFICULTY = {
  easy: [
    {
      id: "easy-gal",
      customerName: "גל",
      customerEmoji: "👧",
      greeting: "שלום! אפשר פיצה עם גבינה על כל החלקים?",
      ticketLine: "גבינה 🧀 - על כל הפיצה",
      sliceCount: 4,
      validate: (m) => exactly(m, 4, "cheese", 4),
    },
    {
      id: "easy-ori",
      customerName: "אורי",
      customerEmoji: "👦",
      greeting: "אני רוצה זיתים על חצי מהפיצה, בבקשה!",
      ticketLine: "זיתים 🫒 - חצי מהפיצה (2 מתוך 4)",
      sliceCount: 4,
      validate: (m) => exactly(m, 4, "olive", 2),
    },
    {
      id: "easy-noa",
      customerName: "נועה",
      customerEmoji: "👧🏻",
      greeting: "חצי גבינה וחצי עגבניות - כמו שאתם אוהבים!",
      ticketLine: "חצי 🧀 + חצי 🍅",
      sliceCount: 4,
      validate: (m) => {
        const c = countTopping(m, "cheese");
        const t = countTopping(m, "tomato");
        if (c === 2 && t === 2 && filledCount(m) === 4) {
          return { ok: true, message: "מושלם! נועה אוהבת את זה 🍕" };
        }
        return { ok: false, message: "צריך 2 חלקים גבינה ו-2 חלקים עגבניה" };
      },
    },
    {
      id: "easy-amit",
      customerName: "עמית",
      customerEmoji: "🧒",
      greeting: "תשימו עגבניות על כל הפיצה - תודה!",
      ticketLine: "עגבניה 🍅 - על כל הפיצה",
      sliceCount: 4,
      validate: (m) => exactly(m, 4, "tomato", 4),
    },
  ],
  medium: [
    {
      id: "med-sara",
      customerName: "שרה",
      customerEmoji: "👩",
      greeting: "שלום! פלפל על חצי מהפיצה, בבקשה.",
      ticketLine: "פלפל 🫑 - חצי (4 מתוך 8)",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "pepper", 4),
    },
    {
      id: "med-dan",
      customerName: "דן",
      customerEmoji: "👨",
      greeting: "אפשר רבע פיצה עם פטריות?",
      ticketLine: "פטריות 🍄 - רבע (2 מתוך 8)",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "mushroom", 2),
    },
    {
      id: "med-maya",
      customerName: "מאיה",
      customerEmoji: "👧🏽",
      greeting: "גבינה על שלושה רבעים - כמעט הכל!",
      ticketLine: "גבינה 🧀 - 6 מתוך 8 חלקים",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "cheese", 6),
    },
    {
      id: "med-yoni",
      customerName: "יוני",
      customerEmoji: "👦🏻",
      greeting: "חצי זיתים וחצי עגבניות - תודה רבה!",
      ticketLine: "חצי 🫒 + חצי 🍅",
      sliceCount: 8,
      validate: (m) => {
        const o = countTopping(m, "olive");
        const t = countTopping(m, "tomato");
        if (o === 4 && t === 4 && filledCount(m) === 8) {
          return { ok: true, message: "הפיצה יצאה מדויק! 🎉" };
        }
        return { ok: false, message: "צריך 4 חלקים זיתים ו-4 חלקים עגבניה" };
      },
    },
  ],
  hard: [
    {
      id: "hard-lia",
      customerName: "ליה",
      customerEmoji: "👧🏻",
      greeting: "רק שמינית אחת עם בזיליקום - קטן ומדויק!",
      ticketLine: "בזיליקום 🌿 - שמינית (1 מתוך 8)",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "basil", 1),
    },
    {
      id: "hard-ido",
      customerName: "עידו",
      customerEmoji: "👦",
      greeting: "גבינה על חמישה שמיניות - זה הכמות שלי!",
      ticketLine: "גבינה 🧀 - 5 מתוך 8 חלקים",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "cheese", 5),
    },
    {
      id: "hard-tal",
      customerName: "טל",
      customerEmoji: "🧑",
      greeting: "רבע פטריות וחצי עגבניות - שילוב מיוחד!",
      ticketLine: "2 פטריות 🍄 + 4 עגבניות 🍅",
      sliceCount: 8,
      validate: (m) => {
        const mu = countTopping(m, "mushroom");
        const to = countTopping(m, "tomato");
        if (mu === 2 && to === 4 && filledCount(m) === 6) {
          return { ok: true, message: "שילוב מעולה! הלקוח מרוצה 🍕" };
        }
        return { ok: false, message: "צריך 2 חלקי פטריות ו-4 חלקי עגבניה" };
      },
    },
    {
      id: "hard-ron",
      customerName: "רון",
      customerEmoji: "👨🏻",
      greeting: "זיתים על שלושה רבעים - כמעט שלמה!",
      ticketLine: "זיתים 🫒 - 6 מתוך 8 חלקים",
      sliceCount: 8,
      validate: (m) => exactly(m, 8, "olive", 6),
    },
  ],
};

/** @param {DifficultyId} difficulty */
export function demoCustomersForDifficulty(difficulty) {
  return (CUSTOMERS_BY_DIFFICULTY[difficulty] ?? CUSTOMERS_BY_DIFFICULTY.easy).slice(
    0,
    PROTOTYPE_CUSTOMER_COUNT,
  );
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

/** @param {PizzeriaCustomerOrder} order @param {Record<number, string>} sliceMap */
export function validateCustomerOrder(order, sliceMap) {
  return order.validate(sliceMap);
}

export function serveOkMessage() {
  return "הפיצה הוגשה! הלקוח הולך מרוצה 🎉";
}

export function serveBadMessage() {
  return "עוד לא בדיוק כמו בפתק - תקנו ונסו שוב";
}
