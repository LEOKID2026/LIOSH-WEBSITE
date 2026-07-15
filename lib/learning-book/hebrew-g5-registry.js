/**
 * Grade 5 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g5/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG5Batch */

/** @type {HebrewG5Batch[]} */
const HEBREW_G5_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "קריאה - שכבות ומבנה",
    "pages": [
      "g5.multi_layer_read",
      "g5.position_in_text",
      "reading_structural_paragraph_role"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא - הסקה, רעיון ונימה",
    "pages": [
      "g5.inference",
      "g5.multiple_perspectives_light",
      "comprehension_main_idea_summary",
      "comprehension_supporting_detail_evidence",
      "comprehension_compare_statements_contrast",
      "comprehension_implicit_tone_attitude",
      "comprehension_reference_pronoun",
      "comprehension_sequence_order"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק - התאמה, תיקון וצורת פועל",
    "pages": [
      "g5.syntax_agreement",
      "g5.verb_patterns",
      "grammar_sentence_correction_choose_correct",
      "grammar_sentence_correction_sv_agreement_plural",
      "grammar_verb_agreement_plural_subject",
      "grammar_tense_shift_past_present",
      "grammar_transform_negation",
      "grammar_binary_grammar_tf"
    ]
  },
  {
    "id": "d",
    "titleHe": "אוצר מילים",
    "pages": [
      "g5.academic_starter_words",
      "g5.semantic_fields",
      "vocabulary_collocation_verb_noun_fit",
      "vocabulary_category_exclusion_odd_out",
      "vocabulary_context_fit_register"
    ]
  },
  {
    "id": "e",
    "titleHe": "כתיבה - חיבור, סוגות וניסוח",
    "pages": [
      "g5.full_composition_scaffold_choice",
      "g5.genre_variety",
      "writing_rephrase_clarity"
    ]
  },
  {
    "id": "f",
    "titleHe": "טיעון והבעה",
    "pages": [
      "g5.argument_scaffold_choice"
    ]
  }
];


const _HEBREW_G5_SEQUENCE = createSequencedBookExports("hebrew", "g5", HEBREW_G5_BOOK_BATCHES_RAW);
export const HEBREW_G5_PAGE_ORDER = _HEBREW_G5_SEQUENCE.pageOrder;
export const HEBREW_G5_BOOK_BATCHES = _HEBREW_G5_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG5PageNeighbors(pageId) {
  return _HEBREW_G5_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG5PageId(pageId) {
  return _HEBREW_G5_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G5_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g5",
  routeBase: "/student/learning/book/hebrew/g5",
  bookTitleHe: "ספר עברית - כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/hebrew/g5/drafts",
});

