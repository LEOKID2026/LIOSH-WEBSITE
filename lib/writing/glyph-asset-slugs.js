/**
 * Stable ASCII filenames for writing glyph assets (no Hebrew / percent-encoded names).
 * @module lib/writing/glyph-asset-slugs
 */

/** @type {readonly string[]} */
export const HEBREW_LETTERS_ORDER = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
  "ך", "ם", "ן", "ף", "ץ",
];

/**
 * Explicit Hebrew letter → public asset slug (never index-based).
 * @type {Record<string, string>}
 */
export const HEBREW_GLYPH_SLUGS = {
  א: "aleph",
  ב: "bet",
  ג: "gimel",
  ד: "dalet",
  ה: "he",
  ו: "vav",
  ז: "zayin",
  ח: "het",
  ט: "tet",
  י: "yod",
  כ: "kaf",
  ל: "lamed",
  מ: "mem",
  נ: "nun",
  ס: "samekh",
  ע: "ayin",
  פ: "pe",
  צ: "tsadi",
  ק: "qof",
  ר: "resh",
  ש: "shin",
  ת: "tav",
  ך: "final-kaf",
  ם: "final-mem",
  ן: "final-nun",
  ף: "final-pe",
  ץ: "final-tsadi",
};

/**
 * Explicit letter → JSON glyph slug in hebrew-print-glyphs-project.json.
 * @type {Record<string, string>}
 */
export const HEBREW_PRINT_JSON_SLUGS = {
  א: "alef",
  ב: "bet",
  ג: "gimel",
  ד: "dalet",
  ה: "he",
  ו: "vav",
  ז: "zayin",
  ח: "het",
  ט: "tet",
  י: "yod",
  כ: "kaf",
  ל: "lamed",
  מ: "mem",
  נ: "nun",
  ס: "samekh",
  ע: "ayin",
  פ: "pe",
  צ: "tsadi",
  ק: "qof",
  ר: "resh",
  ש: "shin",
  ת: "tav",
  ך: "final-kaf",
  ם: "final-mem",
  ן: "final-nun",
  ף: "final-pe",
  ץ: "final-tsadi",
};

/** @type {readonly { letter: string, jsonSlug: string, assetSlug: string }[]} */
export const HEBREW_PRINT_PUBLISH_ORDER = HEBREW_LETTERS_ORDER.map((letter) => ({
  letter,
  jsonSlug: HEBREW_PRINT_JSON_SLUGS[letter],
  assetSlug: HEBREW_GLYPH_SLUGS[letter],
}));

/**
 * @param {string} character
 * @returns {string}
 */
export function glyphAssetSlug(character) {
  const ch = String(character || "").trim();
  if (!ch) {
    throw new Error("glyphAssetSlug: empty character");
  }
  if (/^\d$/.test(ch)) {
    return `digit-${ch}`;
  }
  if (/^[A-Za-z]$/.test(ch)) {
    return ch;
  }
  const slug = HEBREW_GLYPH_SLUGS[ch];
  if (!slug) {
    throw new Error(`glyphAssetSlug: no ASCII slug for character "${ch}" (U+${ch.codePointAt(0)?.toString(16)})`);
  }
  return slug;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isLegacyEncodedGlyphFilename(name) {
  return /%[0-9A-Fa-f]{2}/.test(String(name || ""));
}

export function allGlyphCharactersForBuild() {
  return {
    hebrew: [...HEBREW_LETTERS_ORDER],
    englishUpper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    englishLower: "abcdefghijklmnopqrstuvwxyz".split(""),
    digits: "0123456789".split(""),
  };
}
