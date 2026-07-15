/**
 * Grade 6 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g6/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG6Batch */

/** @type {HebrewG6Batch[]} */
const HEBREW_G6_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "קריאה - סוגות וניתוח טקסט",
    "pages": [
      "g6.compare_genres",
      "g6.complex_text_analysis",
      "paragraph_role"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא - ביקורת, ראיה ועומק",
    "pages": [
      "g6.critical_evaluation_light",
      "g6.evidence_from_text",
      "main_summary",
      "supporting_evidence",
      "contrast",
      "attitude",
      "pronoun",
      "order"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק - תחביר, שייכות והתאמה",
    "pages": [
      "g6.complex_syntax_spot",
      "g6.subject_verb_advanced",
      "g6.possession_prep",
      "choose_correct",
      "sv_agreement_plural",
      "plural_subject",
      "past_present",
      "negation",
      "grammar_tf"
    ]
  },
  {
    "id": "d",
    "titleHe": "אוצר מילים - אקדמי, מקצועי ורישום",
    "pages": [
      "g6.academic_vocab",
      "g6.discipline_words_light",
      "register",
      "verb_noun_fit",
      "odd_out"
    ]
  },
  {
    "id": "e",
    "titleHe": "כתיבה - טיעון, מחקר וניסוח",
    "pages": [
      "g6.argumentative_full_scaffold",
      "g6.research_literacy_choice",
      "rephrase"
    ]
  },
  {
    "id": "f",
    "titleHe": "דיבור - דיבייט והצגת עמדה",
    "pages": [
      "g6.debate_scaffold_choice"
    ]
  }
];


const _HEBREW_G6_SEQUENCE = createSequencedBookExports("hebrew", "g6", HEBREW_G6_BOOK_BATCHES_RAW);
export const HEBREW_G6_PAGE_ORDER = _HEBREW_G6_SEQUENCE.pageOrder;
export const HEBREW_G6_BOOK_BATCHES = _HEBREW_G6_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG6PageNeighbors(pageId) {
  return _HEBREW_G6_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG6PageId(pageId) {
  return _HEBREW_G6_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G6_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g6",
  routeBase: "/student/learning/book/hebrew/g6",
  bookTitleHe: "ספר עברית - כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/hebrew/g6/drafts",
});

