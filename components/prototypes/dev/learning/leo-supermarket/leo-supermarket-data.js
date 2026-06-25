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

/** @type {Record<DifficultyId, object>} */
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    customerCount: 3,
    maxPrice: 10,
    twoProductChance: 0,
    paymentOptions: [5, 10],
    denoms: [1, 2, 5],
    timeLimitSec: 45,
    maxMistakes: 2,
    minCorrectToWin: 2,
  },
  medium: {
    id: "medium",
    label: "בינוני",
    customerCount: 4,
    maxPrice: 20,
    twoProductChance: 0,
    paymentOptions: [10, 20],
    denoms: [1, 2, 5, 10],
    timeLimitSec: 35,
    maxMistakes: 2,
    minCorrectToWin: 3,
  },
  hard: {
    id: "hard",
    label: "קשה",
    customerCount: 5,
    maxPrice: 50,
    twoProductChance: 0.5,
    paymentOptions: [20, 50],
    denoms: [1, 2, 5, 10, 20, 50],
    timeLimitSec: 25,
    maxMistakes: 2,
    minCorrectToWin: 4,
  },
};

/** @param {DifficultyId} difficultyId @param {number} correctCustomers @param {number} mistakes */
export function isSupermarketWin(difficultyId, correctCustomers, mistakes) {
  const diff = DIFFICULTIES[difficultyId];
  if (mistakes > diff.maxMistakes) return false;
  return correctCustomers >= diff.minCorrectToWin;
}

export const SCORE = {
  correctProduct: 10,
  correctChange: 20,
  firstTryBonus: 10,
  fastService: 5,
  customerComplete: 30,
  wrongProduct: -5,
  wrongChange: -5,
  timeout: -5,
};

/** @param {number} total @param {number[]} options */
export function pickPayment(total, options) {
  const valid = options.filter((o) => o >= total);
  if (valid.length) return valid[0];
  return options[options.length - 1];
}

/** @param {GroceryProduct[]} catalog @param {number} count */
function pickRandomDistinct(catalog, count) {
  const shuffled = [...catalog].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** @param {typeof DIFFICULTIES.easy} diffConfig @param {number} index */
export function generateCustomer(diffConfig, index) {
  const catalog = PRODUCTS.filter((p) => p.price <= diffConfig.maxPrice);
  const avatar = CUSTOMER_AVATARS[index % CUSTOMER_AVATARS.length];

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const itemCount =
      diffConfig.twoProductChance > 0 && Math.random() < diffConfig.twoProductChance ? 2 : 1;
    const items = pickRandomDistinct(catalog, itemCount);
    const total = items.reduce((s, p) => s + p.price, 0);
    const paid = pickPayment(total, diffConfig.paymentOptions);
    if (total > 0 && paid >= total) {
      return {
        id: `c-${index}`,
        avatar,
        items,
        requestedIds: items.map((p) => p.id),
        total,
        paid,
        correctChange: paid - total,
      };
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
  };
}

/** @param {DifficultyId} difficulty */
export function generateCustomers(difficulty) {
  const diffConfig = DIFFICULTIES[difficulty];
  return Array.from({ length: diffConfig.customerCount }, (_, i) => generateCustomer(diffConfig, i));
}

/** @param {SupermarketCustomer} customer */
export function customerRequestText(customer) {
  if (customer.items.length === 1) {
    const item = customer.items[0];
    return `אני רוצה ${item.name} ${item.requestIcon}`;
  }
  const [first, second] = customer.items;
  return `אני רוצה ${first.name} ${first.requestIcon} ו-${second.name} ${second.requestIcon}`;
}

/** @param {number} value */
export function formatShekel(value) {
  return `${value}₪`;
}

/** Placeholder cashier portrait — replace when final art is ready */
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
