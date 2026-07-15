import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 1 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG1Batch */

/** @type {HebrewG1Batch[]} */
const HEBREW_G1_BOOK_BATCHES_RAW = [
  {
    id: "a",
    titleHe: "קריאה - צלילים, אותיות וניקוד",
    pages: [
      "g1.phoneme_awareness",
      "g1.open_close_syllable",
      "g1.rhyme",
      "g1.syllables",
      "g1.letters",
      "g1.final_letters",
      "g1.basic_niqqud",
      "g1.sound_letter_match",
      "g1.simple_words_read",
      "reading_word_level_early_g1_spelling_meaning_then_choice",
    ],
  },
  {
    id: "b",
    titleHe: "שפה - משפטים ודקדוק קל",
    pages: [
      "g1.grammar_pos_roles",
      "g1.grammar_wellformed",
      "g1.grammar_agreement_light",
      "g1.grammar_cloze_deixis",
      "g1.grammar_word_order",
      "g1.grammar_odd_category",
      "g1.grammar_punctuation",
      "g1.grammar_connectors_time",
      "grammar_gender_number_early_g1_agreement_girl_singular",
    ],
  },
  {
    id: "c",
    titleHe: "הבנה, אוצר מילים וכתיבה",
    pages: [
      "comprehension_g1.word_meaning_concrete",
      "g1.one_sentence_who_what",
      "g1.simple_instruction",
      "comprehension_binary_fact_early_g1_tf_science_simple",
      "vocabulary_g1.word_meaning_concrete",
      "g1.word_picture",
      "vocabulary_word_context_early_g1_cloze_morning",
      "g1.copy_word",
      "g1.spell_word_choice",
      "writing_spell_word_early_ab_writing_object_riddle",
      "writing_spell_word_early_ab_writing_role_meaning",
    ],
  },
  {
    id: "d",
    titleHe: "דיבור והבעה",
    pages: ["g1.phrase_appropriateness", "speaking_social_reply_early_g1_bump_sorry"],
  },
];


const _HEBREW_G1_SEQUENCE = createSequencedBookExports("hebrew", "g1", HEBREW_G1_BOOK_BATCHES_RAW);
export const HEBREW_G1_PAGE_ORDER = _HEBREW_G1_SEQUENCE.pageOrder;
export const HEBREW_G1_BOOK_BATCHES = _HEBREW_G1_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG1PageNeighbors(pageId) {
  return _HEBREW_G1_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG1PageId(pageId) {
  return _HEBREW_G1_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G1_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g1",
  routeBase: "/student/learning/book/hebrew/g1",
  bookTitleHe: "ספר עברית - כיתה א׳",
  gradeShortLabel: "כיתה א׳",
  draftsDir: "docs/learning-book/hebrew/g1/drafts",
});

