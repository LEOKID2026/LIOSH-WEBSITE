/** @typedef {'easy'|'medium'|'hard'} DifficultyId */

/**
 * @typedef {Object} GroceryProduct
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} requestIcon — fixed emoji in customer request line
 * @property {string} shelfIcon — fallback icon on shelf when no imageSrc
 * @property {string} [imageSrc] — optional real image on shelf only
 */

/**
 * @typedef {Object} SupermarketCustomer
 * @property {string} id
 * @property {string} avatar
 * @property {GroceryProduct[]} items
 * @property {string[]} requestedIds
 * @property {number} total
 * @property {number} paid
 * @property {number} correctChange
 * @property {number} timeLimitSec
 */

/** @type {GroceryProduct[]} */
export const PRODUCTS = [
  { id: "apple", name: "תפוח", price: 3, requestIcon: "🍎", shelfIcon: "🍎" },
  { id: "banana", name: "בננה", price: 4, requestIcon: "🍌", shelfIcon: "🍌" },
  { id: "tomato", name: "עגבניה", price: 4, requestIcon: "🍅", shelfIcon: "🍅" },
  { id: "water", name: "מים", price: 2, requestIcon: "💧", shelfIcon: "💧" },
  { id: "bread", name: "לחם", price: 5, requestIcon: "🍞", shelfIcon: "🍞" },
  { id: "milk", name: "חלב", price: 6, requestIcon: "🥛", shelfIcon: "🥛" },
  {
    id: "juice",
    name: "מיץ",
    price: 7,
    requestIcon: "🧃",
    shelfIcon: "🧃",
    imageSrc: "/images/grocery-items/juice.svg",
  },
  { id: "eggs", name: "ביצים", price: 8, requestIcon: "🥚", shelfIcon: "🥚" },
  { id: "cookies", name: "עוגיות", price: 9, requestIcon: "🍪", shelfIcon: "🍪" },
  { id: "rice", name: "אורז", price: 10, requestIcon: "🍚", shelfIcon: "🍚" },
  { id: "cheese", name: "גבינה", price: 12, requestIcon: "🧀", shelfIcon: "🧀" },
  { id: "fish", name: "דג", price: 15, requestIcon: "🐟", shelfIcon: "🐟" },
];

export const CUSTOMER_AVATARS = ["👧", "👦", "🧒", "👨", "👩", "🧑", "👴", "👵"];

export const CUSTOMERS_PER_LEVEL = 20;

/** @type {Record<DifficultyId, object>} */
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    customerCount: CUSTOMERS_PER_LEVEL,
    maxPrice: 15,
    baseProductCount: 1,
    extraProductChanceMid: 0.35,
    extraProductChanceLate: 0.5,
    paymentOptions: [5, 10, 20],
    denoms: [1, 2, 5, 10],
    timeLimitsByBand: [45, 40, 35],
    maxMistakes: 5,
  },
  medium: {
    id: "medium",
    label: "בינוני",
    customerCount: CUSTOMERS_PER_LEVEL,
    maxPrice: 20,
    baseProductCount: 2,
    extraProductChanceMid: 0.35,
    extraProductChanceLate: 0.5,
    paymentOptions: [10, 20, 50],
    denoms: [1, 2, 5, 10, 20],
    timeLimitsByBand: [35, 30, 25],
    maxMistakes: 4,
  },
  hard: {
    id: "hard",
    label: "קשה",
    customerCount: CUSTOMERS_PER_LEVEL,
    maxPrice: 50,
    baseProductCount: 3,
    extraProductChanceMid: 0.35,
    extraProductChanceLate: 0.5,
    paymentOptions: [20, 50, 100],
    denoms: [1, 2, 5, 10, 20, 50],
    timeLimitsByBand: [30, 25, 20],
    maxMistakes: 3,
  },
};

export const SCORE = {
  correctProduct: 10,
  correctChange: 25,
  firstTryBonus: 10,
  fastService: 5,
  customerComplete: 30,
  wrongProduct: -5,
  wrongChange: -5,
  timeout: -5,
};

/** @param {DifficultyId} difficultyId @param {number} index 0-based */
export function getCustomerBandConfig(difficultyId, index) {
  const diff = DIFFICULTIES[difficultyId];
  const band = index < 5 ? 0 : index < 15 ? 1 : 2;
  const extraChance = band === 0 ? 0 : band === 1 ? diff.extraProductChanceMid : diff.extraProductChanceLate;
  const itemCount =
    extraChance > 0 && Math.random() < extraChance ? diff.baseProductCount + 1 : diff.baseProductCount;
  return {
    itemCount,
    timeLimitSec: diff.timeLimitsByBand[band],
  };
}

/** @param {number} customersCompleted @param {number} customersTotal @param {number} mistakes @param {number} maxMistakes */
export function isSupermarketWin(customersCompleted, customersTotal, mistakes, maxMistakes) {
  if (mistakes > maxMistakes) return false;
  return customersCompleted >= customersTotal;
}

/** @param {number} total @param {number[]} options */
export function pickPayment(total, options) {
  const valid = options.filter((o) => o >= total);
  if (valid.length) {
    return valid[Math.floor(Math.random() * valid.length)];
  }
  return options[options.length - 1];
}

/** @param {SupermarketCustomer} customer */
export function supermarketCustomerKey(customer) {
  const ids = [...customer.requestedIds].sort().join("+");
  return `${ids}|${customer.total}|${customer.paid}`;
}

/** @param {GroceryProduct[]} catalog @param {number} count */
function pickRandomDistinct(catalog, count) {
  const shuffled = [...catalog].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** @param {typeof DIFFICULTIES.easy} diffConfig @param {number} index @param {DifficultyId} difficultyId @param {Set<string>} [usedKeys] */
export function generateCustomer(diffConfig, index, difficultyId, usedKeys) {
  const catalog = PRODUCTS.filter((p) => p.price <= diffConfig.maxPrice);
  const { itemCount, timeLimitSec } = getCustomerBandConfig(difficultyId, index);
  const avatar = CUSTOMER_AVATARS[index % CUSTOMER_AVATARS.length];

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const items = pickRandomDistinct(catalog, itemCount);
    const total = items.reduce((s, p) => s + p.price, 0);
    const paid = pickPayment(total, diffConfig.paymentOptions);
    if (total > 0 && paid >= total && paid - total <= 80) {
      const candidate = {
        id: `c-${index}`,
        avatar,
        items,
        requestedIds: items.map((p) => p.id),
        total,
        paid,
        correctChange: paid - total,
        timeLimitSec,
      };
      if (!usedKeys || !usedKeys.has(supermarketCustomerKey(candidate))) {
        return candidate;
      }
    }
  }

  const fallback = catalog.find((p) => p.price <= diffConfig.paymentOptions[0]) || catalog[0];
  const paid = pickPayment(fallback.price, diffConfig.paymentOptions);
  return {
    id: `c-${index}`,
    avatar,
    items: [fallback],
    requestedIds: [fallback.id],
    total: fallback.price,
    paid,
    correctChange: paid - fallback.price,
    timeLimitSec,
  };
}

/** @param {DifficultyId} difficulty */
export function generateCustomers(difficulty) {
  const diffConfig = DIFFICULTIES[difficulty];
  const usedKeys = new Set();
  /** @type {SupermarketCustomer[]} */
  const customers = [];

  for (let i = 0; i < diffConfig.customerCount; i += 1) {
    let customer = generateCustomer(diffConfig, i, difficulty, usedKeys);
    if (usedKeys.has(supermarketCustomerKey(customer))) {
      usedKeys.clear();
      customer = generateCustomer(diffConfig, i, difficulty, usedKeys);
    }
    usedKeys.add(supermarketCustomerKey(customer));
    customers.push(customer);
  }

  return customers;
}

/** @param {SupermarketCustomer} customer */
export function customerRequestText(customer) {
  const items = customer.items;
  if (items.length === 1) {
    const item = items[0];
    return `אני רוצה ${item.name} ${item.requestIcon}`;
  }
  const parts = items.map((item) => `${item.name} ${item.requestIcon}`);
  const last = parts.pop();
  return `אני רוצה ${parts.join(", ")} ו-${last}`;
}

/** @param {SupermarketCustomer} customer */
export function getExpectedChange(customer) {
  const paid = Number(customer?.paid) || 0;
  const total = Number(customer?.total) || 0;
  return paid - total;
}

/** @param {number[]} changeDenoms */
export function sumChangeDenoms(changeDenoms) {
  return (changeDenoms || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/** @param {SupermarketCustomer} customer @param {number[]} changeDenoms */
export function isChangeAmountCorrect(customer, changeDenoms) {
  return sumChangeDenoms(changeDenoms) === getExpectedChange(customer);
}

/** @param {number} value */
export function formatShekel(value) {
  return `${value} ₪`;
}

export const LEO_CASHIER_IMAGE = "/images/leo-supermarket/leo-cashier.png";

/** @type {Record<number, { label: string, color: string, text: string }>} */
export const DENOM_STYLES = {
  1: { label: "1₪", color: "#fde68a", text: "#78350f" },
  2: { label: "2₪", color: "#fcd34d", text: "#78350f" },
  5: { label: "5₪", color: "#86efac", text: "#14532d" },
  10: { label: "10₪", color: "#93c5fd", text: "#1e3a8a" },
  20: { label: "20₪", color: "#c4b5fd", text: "#4c1d95" },
  50: { label: "50₪", color: "#fda4af", text: "#881337" },
};
