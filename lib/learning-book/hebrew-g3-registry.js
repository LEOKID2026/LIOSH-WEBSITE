/**
 * Grade 3 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g3/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG3Batch */

/** @type {HebrewG3Batch[]} */
const HEBREW_G3_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "קריאה - כמה משפטים וסוגי טקסט",
    "pages": [
      "g3.multi_sentence",
      "g3.genre_tag_info_vs_story",
      "reading_sentence_read_meaning"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא - מפורש, סיבה והשוואה",
    "pages": [
      "g3.explicit_only",
      "comprehension_passage_explicit_detail",
      "g3.cause_effect",
      "comprehension_cause_effect_because",
      "g3.compare_light",
      "comprehension_passage_inference_implied",
      "comprehension_completion_context_clue",
      "comprehension_analogy_reasoning_parallel",
      "comprehension_binary_fact_mid_grammar_tf"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק - זמנים, קישור ופועל",
    "pages": [
      "g3.tense_system_intro",
      "g3.connectors",
      "g3.binyan_light",
      "grammar_morphology_binyan_fit",
      "grammar_part_of_speech_verb_noun",
      "grammar_gender_number_plural",
      "grammar_prep_choice_collocation"
    ]
  },
  {
    "id": "d",
    "titleHe": "אוצר מילים",
    "pages": [
      "g3.context_meaning",
      "g3.word_families",
      "vocabulary_synonym_near_meaning",
      "vocabulary_antonym_opposite",
      "vocabulary_semantic_field_education_lexicon",
      "vocabulary_precision_best_word"
    ]
  },
  {
    "id": "e",
    "titleHe": "כתיבה - משפטים ומבנה",
    "pages": [
      "g3.two_three_sentences_structure",
      "g3.connector_use_choice",
      "writing_logic_completion_conclusion",
      "writing_structured_completion_polite_phrase"
    ]
  },
  {
    "id": "f",
    "titleHe": "שיח והבעה",
    "pages": [
      "g3.discussion_prompt_choice",
      "speaking_social_reply_mid_help_request"
    ]
  }
];


const _HEBREW_G3_SEQUENCE = createSequencedBookExports("hebrew", "g3", HEBREW_G3_BOOK_BATCHES_RAW);
export const HEBREW_G3_PAGE_ORDER = _HEBREW_G3_SEQUENCE.pageOrder;
export const HEBREW_G3_BOOK_BATCHES = _HEBREW_G3_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG3PageNeighbors(pageId) {
  return _HEBREW_G3_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG3PageId(pageId) {
  return _HEBREW_G3_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G3_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g3",
  routeBase: "/student/learning/book/hebrew/g3",
  bookTitleHe: "ספר עברית - כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/hebrew/g3/drafts",
});

