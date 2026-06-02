/**
 * Grade 3 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g3/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG3Batch */

/** @type {EnglishG3Batch[]} */
export const ENGLISH_G3_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "אוצר מילים — המשך (חלק א׳)",
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
    "titleHe": "אוצר מילים — המשך (חלק ב׳)",
    "pages": [
      "vocab_food",
      "vocab_house",
      "vocab_numbers",
      "vocab_school"
    ]
  },
  {
    "id": "c",
    "titleHe": "אוצר מילים חדש — גוף, ספורט, מזג אוויר",
    "pages": [
      "vocab_body",
      "vocab_sports",
      "vocab_weather"
    ]
  },
  {
    "id": "d",
    "titleHe": "דקדוק — Present Simple, a/an/the, מיקום",
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

export const ENGLISH_G3_PAGE_ORDER = ENGLISH_G3_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_G3_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g3",
  routeBase: "/learning/book/english/g3",
  bookTitleHe: "ספר אנגלית — כיתה ג׳",
  gradeShortLabel: "כיתה ג׳",
  draftsDir: "docs/learning-book/english/g3/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG3PageNeighbors(pageId) {
  const index = ENGLISH_G3_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_G3_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_G3_PAGE_ORDER.length - 1
        ? ENGLISH_G3_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglishG3PageId(pageId) {
  return ENGLISH_G3_PAGE_ORDER.includes(pageId);
}
