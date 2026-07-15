/**
 * Grade 4 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g4/drafts/{pageId}.md
 */

import { createSequencedBookExports } from "./learning-book-sequence.js";
/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG4Batch */

/** @type {HebrewG4Batch[]} */
const HEBREW_G4_BOOK_BATCHES_RAW = [
  {
    "id": "a",
    "titleHe": "קריאה - סוגות ואוריינות מידע",
    "pages": [
      "g4.genre_mix",
      "g4.info_lit_intro",
      "meaning"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא - סיכום, מבנה ועומק",
    "pages": [
      "g4.summary_intro",
      "g4.text_structure",
      "detail",
      "implied",
      "because",
      "parallel",
      "tf",
      "context_clue"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק - שורש, תבנית ושגיאות",
    "pages": [
      "g4.root_pattern_intro",
      "g4.dictation_spot_error",
      "plural",
      "binyan_fit",
      "verb_noun",
      "collocation"
    ]
  },
  {
    "id": "d",
    "titleHe": "אוצר מילים - ספרותי, ביטויים ודיוק",
    "pages": [
      "g4.literary_lexicon_light",
      "g4.idiom_light",
      "near_meaning",
      "opposite",
      "best_word",
      "education_lexicon"
    ]
  },
  {
    "id": "e",
    "titleHe": "כתיבה - מבנה, סוגה וסיום",
    "pages": [
      "g4.intro_body_conclusion_choice",
      "g4.genre_appropriate_language",
      "conclusion",
      "polite_phrase"
    ]
  },
  {
    "id": "f",
    "titleHe": "דיבור - הצגה ובקשת עזרה",
    "pages": [
      "g4.present_text_based_choice",
      "request"
    ]
  }
];


const _HEBREW_G4_SEQUENCE = createSequencedBookExports("hebrew", "g4", HEBREW_G4_BOOK_BATCHES_RAW);
export const HEBREW_G4_PAGE_ORDER = _HEBREW_G4_SEQUENCE.pageOrder;
export const HEBREW_G4_BOOK_BATCHES = _HEBREW_G4_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG4PageNeighbors(pageId) {
  return _HEBREW_G4_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHebrewG4PageId(pageId) {
  return _HEBREW_G4_SEQUENCE.isValidPageId(pageId);
}

export const HEBREW_G4_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g4",
  routeBase: "/student/learning/book/hebrew/g4",
  bookTitleHe: "ספר עברית - כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/hebrew/g4/drafts",
});

