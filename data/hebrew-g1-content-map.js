/**
 * Source of truth — כיתה א׳ (g1) בלבד.
 * נושאי UI קיימים (reading, …) עם תתי נושאים, משקלים, מצבים מותרים ודגלים עתידיים.
 * אין תלות ב React; מיובא מ utils/hebrew-question-generator.
 */

const ALL_MODES = ["learning", "challenge", "speed", "marathon", "practice"];

/** דגלים ברירת מחדל לכיתה א׳ (תחרות מלאה + ניקוד תצוגה לפי כללי הדף הקיימים) */
const G1_FLAGS_DEFAULT = {
  scoring: "full",
  niqqud: "inherit",
  audio: "off",
  speaking: "off",
};

/**
 * @typedef {{ id: string, weight: number, order: number, modesAllowed: string[], flags: Record<string, string> }} G1SubtopicSpec
 */

/** @type {Record<string, { subtopics: G1SubtopicSpec[] }>} */
export const HEBREW_G1_CONTENT_MAP = {
  reading: {
    subtopics: [
      { id: "g1.phoneme_awareness", weight: 3, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.open_close_syllable", weight: 3, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.rhyme", weight: 3, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.syllables", weight: 4, order: 4, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.letters", weight: 10, order: 5, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.final_letters", weight: 5, order: 6, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.basic_niqqud", weight: 4, order: 7, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT, niqqud: "display_always" } },
      { id: "g1.sound_letter_match", weight: 4, order: 8, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.simple_words_read", weight: 12, order: 9, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT, niqqud: "inherit" } },
    ],
  },
  comprehension: {
    subtopics: [
      { id: "g1.word_meaning_concrete", weight: 10, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.one_sentence_who_what", weight: 7, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.simple_instruction", weight: 6, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
    ],
  },
  writing: {
    subtopics: [
      { id: "g1.copy_word", weight: 8, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.spell_word_choice", weight: 10, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
    ],
  },
  grammar: {
    subtopics: [
      { id: "g1.grammar_pos_roles", weight: 3, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_wellformed", weight: 4, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_agreement_light", weight: 4, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_cloze_deixis", weight: 2, order: 4, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_word_order", weight: 2, order: 5, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_odd_category", weight: 2, order: 6, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_punctuation", weight: 2, order: 7, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
      { id: "g1.grammar_connectors_time", weight: 3, order: 8, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
    ],
  },
  vocabulary: {
    subtopics: [
      { id: "g1.word_picture", weight: 6, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT, audio: "off" } },
      { id: "g1.word_meaning_concrete", weight: 10, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
    ],
  },
  speaking: {
    subtopics: [
      { id: "g1.phrase_appropriateness", weight: 10, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G1_FLAGS_DEFAULT } },
    ],
  },
};

/**
 * @param {string} topicKey
 * @returns {string}
 */
export function pickG1SubtopicId(topicKey) {
  const block = HEBREW_G1_CONTENT_MAP[topicKey];
  const list = block?.subtopics;
  if (!Array.isArray(list) || list.length === 0) {
    return "g1.simple_words_read";
  }
  const total = list.reduce((sum, s) => sum + (Number(s.weight) > 0 ? Number(s.weight) : 1), 0);
  let r = Math.random() * total;
  for (const s of list) {
    const w = Number(s.weight) > 0 ? Number(s.weight) : 1;
    r -= w;
    if (r <= 0) return s.id;
  }
  return list[list.length - 1].id;
}

/**
 * @param {string} topicKey
 * @param {string} subtopicId
 * @returns {G1SubtopicSpec|null}
 */
export function getG1SubtopicSpec(topicKey, subtopicId) {
  const list = HEBREW_G1_CONTENT_MAP[topicKey]?.subtopics;
  if (!Array.isArray(list)) return null;
  return list.find((s) => s.id === subtopicId) || null;
}

export { G1_FLAGS_DEFAULT };
