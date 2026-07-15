/**
 * Grade 2 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g2/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG2Batch */

/** @type {HebrewG2Batch[]} */
const HEBREW_G2_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "קריאה - מילים, משפטים ופיסוק",
    "pages": [
      "g2.fluent_words",
      "g2.short_sentence",
      "g2.simple_punctuation_read",
      "spelling_choice_niqqud"
    ]
  },
  {
    "id": "b",
    "titleHe": "דקדוק - סוגי מילים, זמן ומין/מספר",
    "pages": [
      "g2.pos_basic",
      "g2.simple_tense",
      "g2.number_gender_light",
      "agreement_boy_plural"
    ]
  },
  {
    "id": "c",
    "titleHe": "הבנת הנקרא - רעיון, הסקה ורצף",
    "pages": [
      "g2.detail_main_idea",
      "g2.light_inference",
      "g2.simple_sequence",
      "where_from_sentence"
    ]
  },
  {
    "id": "d",
    "titleHe": "אוצר מילים - נרדפות והקשר",
    "pages": [
      "g2.synonyms_basic",
      "g2.context_clue_easy",
      "cloze_school"
    ]
  },
  {
    "id": "e",
    "titleHe": "כתיבה - משפט, פיסוק ופסקה",
    "pages": [
      "g2.sentence_wellformed",
      "g2.punctuation_choice",
      "g2.short_paragraph_choice",
      "object_riddle",
      "role_meaning"
    ]
  },
  {
    "id": "f",
    "titleHe": "דיבור - תיאור, מצב ותגובה חברתית",
    "pages": [
      "g2.describe_prompt_choice",
      "g2.situation_register",
      "thanks_response"
    ]
  }
];


const _HEBREW_G2_SEQUENCE = createSequencedBookExports("hebrew", "g2", HEBREW_G2_BOOK_BATCHES_RAW);
export const HEBREW_G2_PAGE_ORDER = _HEBREW_G2_SEQUENCE.pageOrder;
export const HEBREW_G2_BOOK_BATCHES = _HEBREW_G2_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG2PageNeighbors(pageId) {
  return _HEBREW_G2_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG2PageId(pageId) {
  return _HEBREW_G2_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G2_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g2",
  routeBase: "/student/learning/book/hebrew/g2",
  bookTitleHe: "ספר עברית - כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/hebrew/g2/drafts",
});

