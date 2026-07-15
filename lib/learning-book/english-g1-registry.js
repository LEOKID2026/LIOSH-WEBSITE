/**
 * Grade 1 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g1/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG1Batch */

/** @type {EnglishG1Batch[]} */
const ENGLISH_G1_BOOK_BATCHES_RAW = [
  {
    id: "phonics-a",
    titleHe: "אותיות - גדולות, קטנות, התאמה, שמות",
    pages: [
      "letters_upper",
      "letters_lower",
      "letters_match",
      "letter_names",
    ],
  },
  {
    id: "phonics-b",
    titleHe: "צלילים - צלילי אותיות והצליל הראשון",
    pages: [
      "phonics_sounds",
      "phonics_first_sound",
    ],
  },
  {
    id: "phonics-c",
    titleHe: "מילים ראשונות - כיתה, מילים פשוטות, CVC",
    pages: [
      "classroom_words",
      "first_words_simple",
      "first_words_cvc",
    ],
  },
  {
    id: "phonics-d",
    titleHe: "האזנה - תמונה ומילה, הוראות כיתה",
    pages: [
      "picture_word_match",
      "listening_classroom",
      "listening_commands",
    ],
  },
  {
    "id": "a",
    "titleHe": "אוצר מילים - צבעים, מספרים, משפחה",
    "pages": [
      "vocab_colors",
      "vocab_numbers",
      "vocab_family"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים - חיות, רגשות, פעולות, בית ספר",
    "pages": [
      "vocab_animals",
      "vocab_emotions",
      "vocab_actions",
      "vocab_school"
    ]
  },
  {
    "id": "c",
    "titleHe": "תבניות בסיסיות - be, משפטים, כיתה",
    "pages": [
      "grammar_be",
      "sentence_base",
      "translation_classroom"
    ]
  }
];


const _ENGLISH_G1_SEQUENCE = createSequencedBookExports("english", "g1", ENGLISH_G1_BOOK_BATCHES_RAW);
export const ENGLISH_G1_PAGE_ORDER = _ENGLISH_G1_SEQUENCE.pageOrder;
export const ENGLISH_G1_BOOK_BATCHES = _ENGLISH_G1_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG1PageNeighbors(pageId) {
  return _ENGLISH_G1_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidEnglishG1PageId(pageId) {
  return _ENGLISH_G1_SEQUENCE.isValidPageId(pageId);
}

export const ENGLISH_G1_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g1",
  routeBase: "/student/learning/book/english/g1",
  bookTitleHe: "ספר אנגלית - כיתה א׳",
  gradeShortLabel: "כיתה א׳",
  draftsDir: "docs/learning-book/english/g1/drafts",
});

