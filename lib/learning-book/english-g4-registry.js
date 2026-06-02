/**
 * Grade 4 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g4/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG4Batch */

/** @type {EnglishG4Batch[]} */
export const ENGLISH_G4_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "אוצר מילים — המשך",
    "pages": [
      "vocab_animals",
      "vocab_body",
      "vocab_emotions",
      "vocab_family",
      "vocab_food",
      "vocab_school",
      "vocab_sports",
      "vocab_weather"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים חדש — קהילה, סביבה, נסיעות",
    "pages": [
      "vocab_community",
      "vocab_environment",
      "vocab_travel"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק — זמנים, כמות, שייכות",
    "pages": [
      "grammar_present_simple",
      "grammar_simple_continuous",
      "grammar_quantifiers"
    ]
  },
  {
    "id": "d",
    "titleHe": "משפטים",
    "pages": [
      "sentence_descriptive",
      "sentence_routine",
      "sentence_narrative"
    ]
  },
  {
    "id": "e",
    "titleHe": "תרגום",
    "pages": [
      "translation_hobbies",
      "translation_community"
    ]
  }
];

export const ENGLISH_G4_PAGE_ORDER = ENGLISH_G4_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_G4_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g4",
  routeBase: "/learning/book/english/g4",
  bookTitleHe: "ספר אנגלית — כיתה ד׳",
  gradeShortLabel: "כיתה ד׳",
  draftsDir: "docs/learning-book/english/g4/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG4PageNeighbors(pageId) {
  const index = ENGLISH_G4_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_G4_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_G4_PAGE_ORDER.length - 1
        ? ENGLISH_G4_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglishG4PageId(pageId) {
  return ENGLISH_G4_PAGE_ORDER.includes(pageId);
}
