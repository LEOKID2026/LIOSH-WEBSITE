/**
 * Grade 2 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g2/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG2Batch */

/** @type {EnglishG2Batch[]} */
export const ENGLISH_G2_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "אוצר מילים — חזרה מעמיקה (כיתה א׳)",
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
    "titleHe": "אוצר מילים חדש — מזון ובית",
    "pages": [
      "vocab_food",
      "vocab_house"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק בסיסי — be, ריבוי, שאלות",
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

export const ENGLISH_G2_PAGE_ORDER = ENGLISH_G2_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_G2_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g2",
  routeBase: "/learning/book/english/g2",
  bookTitleHe: "ספר אנגלית — כיתה ב׳",
  gradeShortLabel: "כיתה ב׳",
  draftsDir: "docs/learning-book/english/g2/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG2PageNeighbors(pageId) {
  const index = ENGLISH_G2_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_G2_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_G2_PAGE_ORDER.length - 1
        ? ENGLISH_G2_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglishG2PageId(pageId) {
  return ENGLISH_G2_PAGE_ORDER.includes(pageId);
}
