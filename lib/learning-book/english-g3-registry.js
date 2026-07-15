/**
 * Grade 3 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g3/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG3Batch */

/** @type {EnglishG3Batch[]} */
const ENGLISH_G3_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "אוצר מילים - המשך (חלק א׳)",
    "pages": [
      "vocab_actions",
      "vocab_animals",
      "vocab_colors",
      "vocab_emotions",
      "vocab_family"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים - המשך (חלק ב׳)",
    "pages": [
      "vocab_food",
      "vocab_house",
      "vocab_numbers",
      "vocab_school"
    ]
  },
  {
    "id": "c",
    "titleHe": "אוצר מילים חדש - גוף, ספורט, מזג אוויר",
    "pages": [
      "vocab_body",
      "vocab_sports",
      "vocab_weather"
    ]
  },
  {
    "id": "d",
    "titleHe": "דקדוק - Present Simple, a/an/the, מיקום",
    "pages": [
      "grammar_present_simple",
      "grammar_articles_prepositions",
      "grammar_question_frames"
    ]
  },
  {
    "id": "e",
    "titleHe": "משפטים ותרגום",
    "pages": [
      "sentence_routine",
      "sentence_descriptive",
      "translation_routines",
      "translation_hobbies"
    ]
  }
];


const _ENGLISH_G3_SEQUENCE = createSequencedBookExports("english", "g3", ENGLISH_G3_BOOK_BATCHES_RAW);
export const ENGLISH_G3_PAGE_ORDER = _ENGLISH_G3_SEQUENCE.pageOrder;
export const ENGLISH_G3_BOOK_BATCHES = _ENGLISH_G3_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG3PageNeighbors(pageId) {
  return _ENGLISH_G3_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidEnglishG3PageId(pageId) {
  return _ENGLISH_G3_SEQUENCE.isValidPageId(pageId);
}

export const ENGLISH_G3_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g3",
  routeBase: "/student/learning/book/english/g3",
  bookTitleHe: "ספר אנגלית - כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/english/g3/drafts",
});

