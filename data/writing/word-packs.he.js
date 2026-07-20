/**
 * Hebrew word packs — 12 packs with full nikud (plan v3.1 §13.1).
 * @module data/writing/word-packs.he
 */

/**
 * @typedef {Object} HebrewWordPackEntry
 * @property {string} text — word with full nikud
 * @property {string} illustrationId
 * @property {string} [colorInstructionHe]
 */

/**
 * @typedef {Object} HebrewWordPack
 * @property {string} id
 * @property {string} titleHe
 * @property {HebrewWordPackEntry[]} words
 */

/** @type {Record<string, HebrewWordPack>} */
export const HEBREW_WORD_PACKS = {
  family: {
    id: "family",
    titleHe: "משפחה",
    words: [
      { text: "אִמָּא", illustrationId: "ill-mom" },
      { text: "אַבָּא", illustrationId: "ill-dad" },
      { text: "יֶלֶד", illustrationId: "ill-boy" },
      { text: "יַלְדָּה", illustrationId: "ill-girl" },
      { text: "סָבְתָא", illustrationId: "ill-grandma" },
      { text: "סָבָא", illustrationId: "ill-grandma" },
      { text: "תִּינוֹק", illustrationId: "ill-baby" },
      { text: "אָח", illustrationId: "ill-boy" },
    ],
  },
  animals: {
    id: "animals",
    titleHe: "חיות",
    words: [
      { text: "חָתוּל", illustrationId: "ill-cat" },
      { text: "כֶּלֶב", illustrationId: "ill-dog" },
      { text: "סוּס", illustrationId: "ill-horse" },
      { text: "פָּרָה", illustrationId: "ill-cow" },
      { text: "צִפּוֹר", illustrationId: "ill-bird" },
      { text: "דָּג", illustrationId: "ill-fish" },
      { text: "אַרְיֵה", illustrationId: "ill-lion" },
      { text: "אַרְנֵב", illustrationId: "ill-rabbit" },
    ],
  },
  colors: {
    id: "colors",
    titleHe: "צבעים",
    words: [
      { text: "אָדֹם", illustrationId: "ill-pencil", colorInstructionHe: "צבעו באדום" },
      { text: "כָּחֹל", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בכחול" },
      { text: "יָרֹק", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בירוק" },
      { text: "צָהֹב", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בצהוב" },
      { text: "כָּתֹם", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בכתום" },
      { text: "סָגֹל", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בסגול" },
      { text: "וָרֹד", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בוורוד" },
      { text: "שָׁחֹר", illustrationId: "ill-pencil", colorInstructionHe: "צבעו בשחור" },
    ],
  },
  food: {
    id: "food",
    titleHe: "אוכל",
    words: [
      { text: "תַּפּוּחַ", illustrationId: "ill-apple" },
      { text: "בָּנָנָה", illustrationId: "ill-banana" },
      { text: "לֶחֶם", illustrationId: "ill-bread" },
      { text: "חָלָב", illustrationId: "ill-milk" },
      { text: "בֵּיצָה", illustrationId: "ill-egg" },
      { text: "עוּגָה", illustrationId: "ill-cake" },
      { text: "גְּבִינָה", illustrationId: "ill-milk" },
      { text: "אֹרֶז", illustrationId: "ill-bread" },
    ],
  },
  home: {
    id: "home",
    titleHe: "בית",
    words: [
      { text: "בַּיִת", illustrationId: "ill-house" },
      { text: "דֶּלֶת", illustrationId: "ill-door" },
      { text: "חַלּוֹן", illustrationId: "ill-house" },
      { text: "מִטָּה", illustrationId: "ill-bed" },
      { text: "שֻׁלְחָן", illustrationId: "ill-table" },
      { text: "כִּסֵּא", illustrationId: "ill-chair" },
      { text: "מְקָרֵר", illustrationId: "ill-house" },
      { text: "מְנוֹרָה", illustrationId: "ill-house" },
    ],
  },
  school: {
    id: "school",
    titleHe: "בית ספר",
    words: [
      { text: "סֵפֶר", illustrationId: "ill-book" },
      { text: "עִפָּרוֹן", illustrationId: "ill-pencil" },
      { text: "תִּיק", illustrationId: "ill-backpack" },
      { text: "שָׁעוֹן", illustrationId: "ill-clock" },
      { text: "מַחְבֶּרֶת", illustrationId: "ill-book" },
      { text: "לוּחַ", illustrationId: "ill-desk" },
      { text: "מוֹרָה", illustrationId: "ill-book" },
      { text: "כִּיתָה", illustrationId: "ill-desk" },
    ],
  },
  nature: {
    id: "nature",
    titleHe: "טבע",
    words: [
      { text: "שֶׁמֶשׁ", illustrationId: "ill-sun" },
      { text: "עֵץ", illustrationId: "ill-tree" },
      { text: "פֶּרַח", illustrationId: "ill-flower" },
      { text: "עָנָן", illustrationId: "ill-cloud" },
      { text: "גֶּשֶׁם", illustrationId: "ill-rain" },
      { text: "הַר", illustrationId: "ill-mountain" },
      { text: "יָם", illustrationId: "ill-rain" },
      { text: "דֶּשֶׁא", illustrationId: "ill-tree" },
    ],
  },
  body: {
    id: "body",
    titleHe: "גוף",
    words: [
      { text: "יָד", illustrationId: "ill-hand" },
      { text: "רֶגֶל", illustrationId: "ill-foot" },
      { text: "עַיִן", illustrationId: "ill-eye" },
      { text: "אֹזֶן", illustrationId: "ill-ear" },
      { text: "אַף", illustrationId: "ill-nose" },
      { text: "פֶּה", illustrationId: "ill-mouth" },
      { text: "רֹאשׁ", illustrationId: "ill-hand" },
      { text: "לֵב", illustrationId: "ill-hand" },
    ],
  },
  transport: {
    id: "transport",
    titleHe: "תחבורה",
    words: [
      { text: "מְכוֹנִית", illustrationId: "ill-car" },
      { text: "אוֹטוֹבּוּס", illustrationId: "ill-bus" },
      { text: "אוֹפַנַּיִם", illustrationId: "ill-bike" },
      { text: "רַכֶּבֶת", illustrationId: "ill-train" },
      { text: "מָטוֹס", illustrationId: "ill-plane" },
      { text: "סִירָה", illustrationId: "ill-train" },
      { text: "מַשָּׂאִית", illustrationId: "ill-car" },
      { text: "אוֹפַנוֹעַ", illustrationId: "ill-bike" },
    ],
  },
  holidays: {
    id: "holidays",
    titleHe: "חגים",
    words: [
      { text: "חֲנוּכָּה", illustrationId: "ill-menorah" },
      { text: "סֻכָּה", illustrationId: "ill-flag" },
      { text: "מַתָּנָה", illustrationId: "ill-gift" },
      { text: "דֶּגֶל", illustrationId: "ill-flag" },
      { text: "נֵר", illustrationId: "ill-candle" },
      { text: "תַּפּוּחַ", illustrationId: "ill-apple" },
      { text: "אוֹר", illustrationId: "ill-star-shape" },
      { text: "שָׂמֵחַ", illustrationId: "ill-star-shape" },
    ],
  },
  daily: {
    id: "daily",
    titleHe: "יום-יום",
    words: [
      { text: "כַּדּוּר", illustrationId: "ill-ball" },
      { text: "כּוֹס", illustrationId: "ill-cup" },
      { text: "כּוֹבַע", illustrationId: "ill-hat" },
      { text: "נַעַל", illustrationId: "ill-shoe" },
      { text: "מַפְתֵּחַ", illustrationId: "ill-key" },
      { text: "שָׁעוֹן", illustrationId: "ill-clock" },
      { text: "מִטְרִיָּה", illustrationId: "ill-ball" },
      { text: "תִּיק", illustrationId: "ill-backpack" },
    ],
  },
  fruits_vegetables: {
    id: "fruits_vegetables",
    titleHe: "פירות וירקות",
    words: [
      { text: "תַּפּוּחַ", illustrationId: "ill-apple" },
      { text: "בָּנָנָה", illustrationId: "ill-banana" },
      { text: "תַּפּוּז", illustrationId: "ill-orange-fruit" },
      { text: "עֲנָבִים", illustrationId: "ill-grape" },
      { text: "אֲבַטִּיחַ", illustrationId: "ill-watermelon" },
      { text: "תּוּת", illustrationId: "ill-strawberry" },
      { text: "גֶּזֶר", illustrationId: "ill-carrot" },
      { text: "עַגְבָנִיָּה", illustrationId: "ill-tomato" },
    ],
  },
};

/** @type {string[]} */
export const HEBREW_WORD_PACK_IDS = Object.keys(HEBREW_WORD_PACKS);

/**
 * @param {string} packId
 * @returns {HebrewWordPack | null}
 */
export function getHebrewWordPack(packId) {
  return HEBREW_WORD_PACKS[String(packId || "").trim()] || null;
}
