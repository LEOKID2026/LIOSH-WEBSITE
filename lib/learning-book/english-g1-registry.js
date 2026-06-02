/**
 * Grade 1 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g1/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG1Batch */

/** @type {EnglishG1Batch[]} */
export const ENGLISH_G1_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "אוצר מילים — צבעים, מספרים, משפחה",
    "pages": [
      "vocab_colors",
      "vocab_numbers",
      "vocab_family"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים — חיות, רגשות, פעולות, בית ספר",
    "pages": [
      "vocab_animals",
      "vocab_emotions",
      "vocab_actions",
      "vocab_school"
    ]
  },
  {
    "id": "c",
    "titleHe": "תבניות בסיסיות — be, משפטים, כיתה",
    "pages": [
      "grammar_be",
      "sentence_base",
      "translation_classroom"
    ]
  }
];

export const ENGLISH_G1_PAGE_ORDER = ENGLISH_G1_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_G1_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g1",
  routeBase: "/learning/book/english/g1",
  bookTitleHe: "ספר אנגלית — כיתה א׳",
  gradeShortLabel: "כיתה א׳",
  draftsDir: "docs/learning-book/english/g1/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG1PageNeighbors(pageId) {
  const index = ENGLISH_G1_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_G1_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_G1_PAGE_ORDER.length - 1
        ? ENGLISH_G1_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglishG1PageId(pageId) {
  return ENGLISH_G1_PAGE_ORDER.includes(pageId);
}
