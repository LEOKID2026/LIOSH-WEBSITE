/**
 * Targeted spoken-script pronunciation corrections (niqqud) for learning book TTS.
 * Applied only in spokenScript — never in visible book markdown.
 *
 * Extend LEARNING_BOOK_PRONUNCIATION_ENTRIES after manual listening QA.
 */

/**
 * @typedef {{ id: string, spoken: string, nikud: string }} LearningBookPronunciationEntry
 * @typedef {{ id: string, spoken: string, nikud: string, count: number }} LearningBookPronunciationReplacement
 */

/** @type {readonly LearningBookPronunciationEntry[]} */
export const LEARNING_BOOK_PRONUNCIATION_ENTRIES = Object.freeze([
  { id: "alef_bet_maqaf", spoken: "אלף בית", nikud: "אָלֶף בֵּית" },
  { id: "alef_bet_hyphen", spoken: "אלף-בית", nikud: "אָלֶף בֵּית" },
  { id: "alef_bet_space", spoken: "אלף בית", nikud: "אָלֶף בֵּית" },
  { id: "shimu", spoken: "שימעו", nikud: "שִׁמְעוּ" },
  { id: "shmu", spoken: "שמעו", nikud: "שִׁמְעוּ" },
  { id: "otiyot", spoken: "אותיות", nikud: "אוֹתִיּוֹת" },
  { id: "targilim", spoken: "תרגילים", nikud: "תַּרְגִּילִים" },
  { id: "misparim", spoken: "מספרים", nikud: "מִסְפָּרִים" },
  { id: "mispar", spoken: "מספר", nikud: "מִסְפָּר" },
  { id: "targil", spoken: "תרגיל", nikud: "תַּרְגִּיל" },
  { id: "chibur", spoken: "חיבור", nikud: "חִבּוּר" },
  { id: "chisur", spoken: "חיסור", nikud: "חִסּוּר" },
  { id: "kita", spoken: "כיתה", nikud: "כִּתָּה" },
  { id: "shalom", spoken: "שלום", nikud: "שָׁלוֹם" },
  { id: "ot", spoken: "אות", nikud: "אוֹת" },
  { id: "sefer", spoken: "ספר", nikud: "סֵפֶר" },
  { id: "shama", spoken: "שמע", nikud: "שְׁמַע" },
  { id: "shaveh", spoken: "שווה", nikud: "שָׁוֶה" },
  { id: "veod", spoken: "ועוד", nikud: "וְעוֹד" },
  { id: "pachot", spoken: "פחות", nikud: "פָּחוֹת" },
]);

/** Longest phrases first so shorter entries do not break longer ones (e.g. שמע inside שימעו). */
const SORTED_ENTRIES = [...LEARNING_BOOK_PRONUNCIATION_ENTRIES].sort(
  (a, b) => b.spoken.length - a.spoken.length
);

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} spoken
 * @returns {RegExp}
 */
function buildSpokenRegex(spoken) {
  const escaped = escapeRegex(spoken);
  if (/[\s\u05BE\u002D\u2010\u2011\u2012\u2013\u2014]/.test(spoken)) {
    return new RegExp(escaped, "gu");
  }
  return new RegExp(`(?<![\\u0590-\\u05FF])${escaped}(?![\\u0590-\\u05FF])`, "gu");
}

/**
 * @param {string} text
 * @returns {{ text: string, pronunciationReplacementsApplied: LearningBookPronunciationReplacement[] }}
 */
export function applyLearningBookPronunciationCorrections(text) {
  let out = String(text || "");
  /** @type {LearningBookPronunciationReplacement[]} */
  const pronunciationReplacementsApplied = [];

  for (const entry of SORTED_ENTRIES) {
    const re = buildSpokenRegex(entry.spoken);
    let count = 0;
    out = out.replace(re, () => {
      count += 1;
      return entry.nikud;
    });
    if (count > 0) {
      pronunciationReplacementsApplied.push({
        id: entry.id,
        spoken: entry.spoken,
        nikud: entry.nikud,
        count,
      });
    }
  }

  return { text: out, pronunciationReplacementsApplied };
}
