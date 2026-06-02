/**
 * Grade 6 Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/g6/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} HebrewG6Batch */

/** @type {HebrewG6Batch[]} */
export const HEBREW_G6_BOOK_BATCHES = [
  {
    "id": "a",
    "titleHe": "קריאה — סוגות וניתוח טקסט",
    "pages": [
      "g6.compare_genres",
      "g6.complex_text_analysis",
      "paragraph_role"
    ]
  },
  {
    "id": "b",
    "titleHe": "הבנת הנקרא — ביקורת, ראיה ועומק",
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
    "titleHe": "דקדוק — תחביר, שייכות והתאמה",
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
    "titleHe": "אוצר מילים — אקדמי, מקצועי ורישום",
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
    "titleHe": "כתיבה — טיעון, מחקר וניסוח",
    "pages": [
      "g6.argumentative_full_scaffold",
      "g6.research_literacy_choice",
      "rephrase"
    ]
  },
  {
    "id": "f",
    "titleHe": "דיבור — דיבייט והצגת עמדה",
    "pages": [
      "g6.debate_scaffold_choice"
    ]
  }
];

export const HEBREW_G6_PAGE_ORDER = HEBREW_G6_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const HEBREW_G6_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "g6",
  routeBase: "/learning/book/hebrew/g6",
  bookTitleHe: "ספר עברית — כיתה ו׳",
  gradeShortLabel: "כיתה ו׳",
  draftsDir: "docs/learning-book/hebrew/g6/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrewG6PageNeighbors(pageId) {
  const index = HEBREW_G6_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? HEBREW_G6_PAGE_ORDER[index - 1] : null,
    next:
      index < HEBREW_G6_PAGE_ORDER.length - 1
        ? HEBREW_G6_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidHebrewG6PageId(pageId) {
  return HEBREW_G6_PAGE_ORDER.includes(pageId);
}
