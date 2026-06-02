/**
 * Grade 4 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g4/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG4Batch */

/** @type {HebrewG4Batch[]} */
export const HEBREW_G4_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "קריאה — סוגות ואוריינות מידע",
    "pages": [
      "g4.genre_mix",
      "g4.info_lit_intro",
      "meaning"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא — סיכום, מבנה ועומק",
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
    "titleHe": "דקדוק — שורש, תבנית ושגיאות",
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
    "titleHe": "אוצר מילים — ספרותי, ביטויים ודיוק",
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
    "titleHe": "כתיבה — מבנה, סוגה וסיום",
    "pages": [
      "g4.intro_body_conclusion_choice",
      "g4.genre_appropriate_language",
      "conclusion",
      "polite_phrase"
    ]
  },
  {
    "id": "f",
    "titleHe": "דיבור — הצגה ובקשת עזרה",
    "pages": [
      "g4.present_text_based_choice",
      "request"
    ]
  }
];

export const HEBREW_G4_PAGE_ORDER = HEBREW_G4_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const HEBREW_G4_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g4",
  routeBase: "/learning/book/hebrew/g4",
  bookTitleHe: "ספר עברית — כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/hebrew/g4/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG4PageNeighbors(pageId) {
  const index = HEBREW_G4_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? HEBREW_G4_PAGE_ORDER[index - 1] : null,
    next:
      index < HEBREW_G4_PAGE_ORDER.length - 1
        ? HEBREW_G4_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidHebrewG4PageId(pageId) {
  return HEBREW_G4_PAGE_ORDER.includes(pageId);
}
