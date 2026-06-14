/**
 * Source of truth — כיתה ב׳ (g2) בלבד.
 * נושאי UI קיימים עם תתי נושאים, משקלים, מצבים מותרים ודגלים עתידיים.
 */

const ALL_MODES = ["learning", "challenge", "speed", "marathon", "practice"];

const G2_FLAGS_DEFAULT = {
  scoring: "full",
  niqqud: "inherit",
  audio: "off",
  speaking: "off",
};

/**
 * @typedef {{ id: string, weight: number, order: number, modesAllowed: string[], flags: Record<string, string> }} G2SubtopicSpec
 */

/** @type {Record<string, { subtopics: G2SubtopicSpec[] }>} */
export const HEBREW_G2_CONTENT_MAP = {
  reading: {
    subtopics: [
      { id: "g2.fluent_words", weight: 8, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.short_sentence", weight: 10, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT, niqqud: "inherit" } },
      { id: "g2.simple_punctuation_read", weight: 4, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
  comprehension: {
    subtopics: [
      { id: "g2.detail_main_idea", weight: 10, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.simple_sequence", weight: 4, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.light_inference", weight: 9, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
  writing: {
    subtopics: [
      { id: "g2.sentence_wellformed", weight: 10, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.short_paragraph_choice", weight: 7, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.punctuation_choice", weight: 6, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
  grammar: {
    subtopics: [
      { id: "g2.pos_basic", weight: 8, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.simple_tense", weight: 5, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.number_gender_light", weight: 7, order: 3, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
  vocabulary: {
    subtopics: [
      { id: "g2.synonyms_basic", weight: 8, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.context_clue_easy", weight: 8, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
  speaking: {
    subtopics: [
      { id: "g2.situation_register", weight: 7, order: 1, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
      { id: "g2.describe_prompt_choice", weight: 6, order: 2, modesAllowed: [...ALL_MODES], flags: { ...G2_FLAGS_DEFAULT } },
    ],
  },
};

/**
 * @param {string} topicKey
 * @returns {string}
 */
export function pickG2SubtopicId(topicKey) {
  const block = HEBREW_G2_CONTENT_MAP[topicKey];
  const list = block?.subtopics;
  if (!Array.isArray(list) || list.length === 0) {
    return "g2.fluent_words";
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
 * @returns {G2SubtopicSpec|null}
 */
export function getG2SubtopicSpec(topicKey, subtopicId) {
  const list = HEBREW_G2_CONTENT_MAP[topicKey]?.subtopics;
  if (!Array.isArray(list)) return null;
  return list.find((s) => s.id === subtopicId) || null;
}

export { G2_FLAGS_DEFAULT };
