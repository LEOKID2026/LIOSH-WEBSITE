/**
 * English word packs (plan v3.1 §13.2).
 * @module data/writing/word-packs.en
 */

/**
 * @typedef {Object} EnglishWordPackEntry
 * @property {string} text
 * @property {string} illustrationId
 * @property {string} [colorInstructionHe]
 */

/**
 * @typedef {Object} EnglishWordPack
 * @property {string} id
 * @property {string} titleHe
 * @property {EnglishWordPackEntry[]} words
 */

/** @type {Record<string, EnglishWordPack>} */
export const ENGLISH_WORD_PACKS = {
  colors: {
    id: "colors",
    titleHe: "צבעים",
    words: [
      { text: "red", illustrationId: "ill-pencil", colorInstructionHe: "צבעו באדום" },
      { text: "blue", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בכחול" },
      { text: "green", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בירוק" },
      { text: "yellow", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בצהוב" },
      { text: "orange", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בכתום" },
      { text: "purple", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בסגול" },
      { text: "pink", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בוורוד" },
      { text: "black", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בשחור" },
    ],
  },
  animals: {
    id: "animals",
    titleHe: "בעלי חיים",
    words: [
      { text: "cat", illustrationId: "ill-cat" },
      { text: "dog", illustrationId: "ill-dog" },
      { text: "bird", illustrationId: "ill-bird" },
      { text: "fish", illustrationId: "ill-fish" },
      { text: "rabbit", illustrationId: "ill-rabbit" },
      { text: "horse", illustrationId: "ill-horse" },
      { text: "cow", illustrationId: "ill-cow" },
      { text: "lion", illustrationId: "ill-lion" },
    ],
  },
  family: {
    id: "family",
    titleHe: "משפחה",
    words: [
      { text: "mom", illustrationId: "ill-mom" },
      { text: "dad", illustrationId: "ill-dad" },
      { text: "boy", illustrationId: "ill-boy" },
      { text: "girl", illustrationId: "ill-girl" },
      { text: "baby", illustrationId: "ill-baby" },
      { text: "grandma", illustrationId: "ill-grandma" },
      { text: "brother", illustrationId: "ill-boy" },
      { text: "sister", illustrationId: "ill-girl" },
    ],
  },
  food: {
    id: "food",
    titleHe: "אוכל",
    words: [
      { text: "apple", illustrationId: "ill-apple" },
      { text: "banana", illustrationId: "ill-banana" },
      { text: "bread", illustrationId: "ill-bread" },
      { text: "milk", illustrationId: "ill-milk" },
      { text: "egg", illustrationId: "ill-egg" },
      { text: "cake", illustrationId: "ill-cake" },
      { text: "cheese", illustrationId: "ill-milk" },
      { text: "rice", illustrationId: "ill-bread" },
    ],
  },
  school: {
    id: "school",
    titleHe: "בית הספר",
    words: [
      { text: "book", illustrationId: "ill-book" },
      { text: "pencil", illustrationId: "ill-pencil" },
      { text: "backpack", illustrationId: "ill-backpack" },
      { text: "clock", illustrationId: "ill-clock" },
      { text: "desk", illustrationId: "ill-desk" },
      { text: "notebook", illustrationId: "ill-book" },
      { text: "teacher", illustrationId: "ill-book" },
      { text: "class", illustrationId: "ill-desk" },
    ],
  },
  body: {
    id: "body",
    titleHe: "גוף",
    words: [
      { text: "hand", illustrationId: "ill-hand" },
      { text: "foot", illustrationId: "ill-foot" },
      { text: "eye", illustrationId: "ill-eye" },
      { text: "ear", illustrationId: "ill-ear" },
      { text: "nose", illustrationId: "ill-nose" },
      { text: "mouth", illustrationId: "ill-mouth" },
      { text: "head", illustrationId: "ill-hand" },
      { text: "heart", illustrationId: "ill-hand" },
    ],
  },
  home: {
    id: "home",
    titleHe: "בית",
    words: [
      { text: "house", illustrationId: "ill-house" },
      { text: "door", illustrationId: "ill-door" },
      { text: "window", illustrationId: "ill-house" },
      { text: "bed", illustrationId: "ill-bed" },
      { text: "table", illustrationId: "ill-table" },
      { text: "chair", illustrationId: "ill-chair" },
      { text: "fridge", illustrationId: "ill-house" },
      { text: "lamp", illustrationId: "ill-house" },
    ],
  },
  nature: {
    id: "nature",
    titleHe: "טבע",
    words: [
      { text: "sun", illustrationId: "ill-sun" },
      { text: "tree", illustrationId: "ill-tree" },
      { text: "flower", illustrationId: "ill-flower" },
      { text: "cloud", illustrationId: "ill-cloud" },
      { text: "rain", illustrationId: "ill-rain" },
      { text: "mountain", illustrationId: "ill-mountain" },
      { text: "sea", illustrationId: "ill-rain" },
      { text: "grass", illustrationId: "ill-tree" },
    ],
  },
  transport: {
    id: "transport",
    titleHe: "תחבורה",
    words: [
      { text: "car", illustrationId: "ill-car" },
      { text: "bus", illustrationId: "ill-bus" },
      { text: "bike", illustrationId: "ill-bike" },
      { text: "train", illustrationId: "ill-train" },
      { text: "plane", illustrationId: "ill-plane" },
      { text: "boat", illustrationId: "ill-train" },
      { text: "truck", illustrationId: "ill-car" },
      { text: "motorcycle", illustrationId: "ill-bike" },
    ],
  },
  numbers: {
    id: "numbers",
    titleHe: "מספרים",
    words: [
      { text: "one", illustrationId: "qty-01" },
      { text: "two", illustrationId: "qty-02" },
      { text: "three", illustrationId: "qty-03" },
      { text: "four", illustrationId: "qty-04" },
      { text: "five", illustrationId: "qty-05" },
      { text: "six", illustrationId: "qty-06" },
      { text: "seven", illustrationId: "qty-07" },
      { text: "eight", illustrationId: "qty-08" },
    ],
  },
  cvc: {
    id: "cvc",
    titleHe: "מילים קצרות",
    words: [
      { text: "cat", illustrationId: "ill-cat" },
      { text: "dog", illustrationId: "ill-dog" },
      { text: "sun", illustrationId: "ill-sun" },
      { text: "bus", illustrationId: "ill-bus" },
      { text: "pen", illustrationId: "ill-pencil" },
      { text: "hat", illustrationId: "ill-hat" },
      { text: "bed", illustrationId: "ill-bed" },
      { text: "cup", illustrationId: "ill-cup" },
    ],
  },
  sight: {
    id: "sight",
    titleHe: "מילות תדירות",
    words: [
      { text: "the", illustrationId: "ill-book" },
      { text: "and", illustrationId: "ill-book" },
      { text: "is", illustrationId: "ill-book" },
      { text: "it", illustrationId: "ill-book" },
      { text: "me", illustrationId: "ill-boy" },
      { text: "go", illustrationId: "ill-ball" },
      { text: "we", illustrationId: "ill-girl" },
      { text: "see", illustrationId: "ill-eye" },
      { text: "can", illustrationId: "ill-cup" },
      { text: "you", illustrationId: "ill-girl" },
      { text: "my", illustrationId: "ill-hand" },
      { text: "at", illustrationId: "ill-house" },
    ],
  },
};

/** Catalog uses 11 English packs (excludes sight) for W-241–W-262. */
/** @type {string[]} */
export const ENGLISH_WORD_PACK_IDS = [
  "colors",
  "animals",
  "family",
  "food",
  "school",
  "body",
  "home",
  "nature",
  "transport",
  "numbers",
  "cvc",
];

/** @type {string[]} */
export const ENGLISH_WORD_PACK_IDS_ALL = Object.keys(ENGLISH_WORD_PACKS);

/**
 * @param {string} packId
 * @returns {EnglishWordPack | null}
 */
export function getEnglishWordPack(packId) {
  return ENGLISH_WORD_PACKS[String(packId || "").trim()] || null;
}
