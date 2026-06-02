/**
 * Grade 6 English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/g6/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} EnglishG6Batch */

/** @type {EnglishG6Batch[]} */
export const ENGLISH_G6_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "אוצר מילים — המשך",
    "pages": [
      "vocab_animals",
      "vocab_community",
      "vocab_emotions",
      "vocab_environment",
      "vocab_health",
      "vocab_technology",
      "vocab_travel"
    ]
  },
  {
    "id": "b",
    "titleHe": "אוצר מילים חדש — תרבות, עולם, היסטוריה",
    "pages": [
      "vocab_culture",
      "vocab_global_issues",
      "vocab_history"
    ]
  },
  {
    "id": "c",
    "titleHe": "דקדוק — זמנים מורכבים, תנאי, מודאליים",
    "pages": [
      "grammar_complex_tenses",
      "grammar_conditionals",
      "grammar_modals",
      "grammar_comparatives"
    ]
  },
  {
    "id": "d",
    "titleHe": "משפטים מורחבים",
    "pages": [
      "sentence_advanced"
    ]
  },
  {
    "id": "e",
    "titleHe": "תרגום — טכנולוגיה ועולם",
    "pages": [
      "translation_technology",
      "translation_global"
    ]
  }
];

export const ENGLISH_G6_PAGE_ORDER = ENGLISH_G6_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_G6_BOOK_META = Object.freeze({
  subject: "english",
  grade: "g6",
  routeBase: "/learning/book/english/g6",
  bookTitleHe: "ספר אנגלית — כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/english/g6/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglishG6PageNeighbors(pageId) {
  const index = ENGLISH_G6_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_G6_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_G6_PAGE_ORDER.length - 1
        ? ENGLISH_G6_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglishG6PageId(pageId) {
  return ENGLISH_G6_PAGE_ORDER.includes(pageId);
}
