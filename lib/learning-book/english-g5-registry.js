/**
 * Grade 5 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g5/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG5Batch */

/** @type {EnglishG5Batch[]} */
const ENGLISH_G5_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "אוצר מילים - המשך",
    "pages": [
      "vocab_animals",
      "vocab_community",
      "vocab_emotions",
      "vocab_environment",
      "vocab_family",
      "vocab_food",
      "vocab_school",
      "vocab_sports",
      "vocab_travel"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים חדש - בריאות וטכנולוגיה",
    "pages": [
      "vocab_health",
      "vocab_technology"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק - עבר, עתיד, מודאליים, השוואה",
    "pages": [
      "grammar_past_simple",
      "grammar_future_forms",
      "grammar_modals",
      "grammar_comparatives",
      "grammar_quantifiers"
    ]
  },
  {
    "id": "d",
    "titleHe": "משפטים",
    "pages": [
      "sentence_narrative",
      "sentence_advanced"
    ]
  },
  {
    "id": "e",
    "titleHe": "תרגום",
    "pages": [
      "translation_community",
      "translation_technology",
      "translation_global"
    ]
  }
];


const _ENGLISH_G5_SEQUENCE = createSequencedBookExports("english", "g5", ENGLISH_G5_BOOK_BATCHES_RAW);
export const ENGLISH_G5_PAGE_ORDER = _ENGLISH_G5_SEQUENCE.pageOrder;
export const ENGLISH_G5_BOOK_BATCHES = _ENGLISH_G5_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG5PageNeighbors(pageId) {
  return _ENGLISH_G5_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidEnglishG5PageId(pageId) {
  return _ENGLISH_G5_SEQUENCE.isValidPageId(pageId);
}

export const ENGLISH_G5_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g5",
  routeBase: "/student/learning/book/english/g5",
  bookTitleHe: "ספר אנגלית - כיתה ה׳",
  gradeShortLabel: "כיתה ה׳",
  draftsDir: "docs/learning-book/english/g5/drafts",
});

