/**
 * Word → illustration mapping for writing worksheets (HE + EN).
 * Derived from plan v3.1 §12–13; shared 77-SVG pool.
 * @module data/writing/word-illustration-map
 */

import { HEBREW_WORD_PACKS } from "./word-packs.he.js";
import { ENGLISH_WORD_PACKS } from "./word-packs.en.js";

/**
 * @typedef {Object} WordIllustrationEntry
 * @property {string} word
 * @property {string} illustrationId
 * @property {"he" | "en"} language
 * @property {string} [wordPackId]
 * @property {string} [colorInstructionHe]
 */

/** @type {Map<string, WordIllustrationEntry>} */
const WORD_ILLUSTRATION_MAP = new Map();

/**
 * @param {"he" | "en"} language
 * @param {string} packId
 * @param {Array<{ text: string, illustrationId: string, colorInstructionHe?: string }>} entries
 */
function registerPack(language, packId, entries) {
  for (const entry of entries) {
    const key = `${language}:${entry.text}`;
    WORD_ILLUSTRATION_MAP.set(key, {
      word: entry.text,
      illustrationId: entry.illustrationId,
      language,
      wordPackId: packId,
      ...(entry.colorInstructionHe ? { colorInstructionHe: entry.colorInstructionHe } : {}),
    });
  }
}

for (const [packId, pack] of Object.entries(HEBREW_WORD_PACKS)) {
  registerPack("he", packId, pack.words);
}

for (const [packId, pack] of Object.entries(ENGLISH_WORD_PACKS)) {
  registerPack("en", packId, pack.words);
}

/**
 * @param {"he" | "en"} language
 * @param {string} word
 * @returns {WordIllustrationEntry | null}
 */
export function getWordIllustration(language, word) {
  const key = `${language}:${String(word || "").trim()}`;
  return WORD_ILLUSTRATION_MAP.get(key) || null;
}

/**
 * @param {string} illustrationId
 * @returns {WordIllustrationEntry[]}
 */
export function getWordsForIllustration(illustrationId) {
  const id = String(illustrationId || "").trim();
  return [...WORD_ILLUSTRATION_MAP.values()].filter((entry) => entry.illustrationId === id);
}

/** @type {ReadonlyMap<string, WordIllustrationEntry>} */
export const WORD_ILLUSTRATION_ENTRIES = WORD_ILLUSTRATION_MAP;

/**
 * @returns {string[]}
 */
export function listIllustrationIdsUsedByWords() {
  return [...new Set([...WORD_ILLUSTRATION_MAP.values()].map((e) => e.illustrationId))].sort();
}
