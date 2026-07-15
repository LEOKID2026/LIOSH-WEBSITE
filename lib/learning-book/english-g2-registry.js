/**
 * Grade 2 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g2/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG2Batch */

/** @type {EnglishG2Batch[]} */
const ENGLISH_G2_BOOK_BATCHES_RAW = [
  {
    id: "phonics-review",
    titleHe: "יסודות קריאה - חזרה, חיבור, האזנה",
    pages: [
      "letters_review",
      "letters_order",
      "phonics_sounds_review",
      "phonics_blending",
      "sound_letter_match",
      "first_word_reading",
      "word_families_cvc",
      "classroom_vocab_g2",
      "listening_comprehension",
      "picture_audio_word_match",
      "early_sentences_exposure",
    ],
  },
  {
    "id": "a",
    "titleHe": "אוצר מילים - חזרה מעמיקה (כיתה א׳)",
    "pages": [
      "vocab_colors",
      "vocab_numbers",
      "vocab_family",
      "vocab_animals",
      "vocab_emotions",
      "vocab_actions",
      "vocab_school"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים חדש - מזון ובית",
    "pages": [
      "vocab_food",
      "vocab_house"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק בסיסי - be, ריבוי, שאלות",
    "pages": [
      "grammar_be",
      "grammar_plural_questions"
    ]
  },
  {
    "id": "d",
    "titleHe": "משפטים ותרגום",
    "pages": [
      "sentence_base",
      "sentence_routine",
      "translation_classroom",
      "translation_routines"
    ]
  }
];


const _ENGLISH_G2_SEQUENCE = createSequencedBookExports("english", "g2", ENGLISH_G2_BOOK_BATCHES_RAW);
export const ENGLISH_G2_PAGE_ORDER = _ENGLISH_G2_SEQUENCE.pageOrder;
export const ENGLISH_G2_BOOK_BATCHES = _ENGLISH_G2_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG2PageNeighbors(pageId) {
  return _ENGLISH_G2_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidEnglishG2PageId(pageId) {
  return _ENGLISH_G2_SEQUENCE.isValidPageId(pageId);
}

export const ENGLISH_G2_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g2",
  routeBase: "/student/learning/book/english/g2",
  bookTitleHe: "ספר אנגלית - כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/english/g2/drafts",
});

