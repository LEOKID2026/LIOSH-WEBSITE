/**
 * Grade 2 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G2EngBatch */

/** @type {G2EngBatch[]} */
export const ENGLISH_G2_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — חזרה מעמיקה (כיתה א׳)",
    pages: [
      "vocab_colors",
      "vocab_numbers",
      "vocab_family",
      "vocab_animals",
      "vocab_emotions",
      "vocab_actions",
      "vocab_school",
    ],
  },
  {
    id: "b",
    titleHe: "אוצר מילים חדש — מזון ובית",
    pages: ["vocab_food", "vocab_house"],
  },
  {
    id: "c",
    titleHe: "דקדוק בסיסי — be, ריבוי, שאלות",
    pages: ["grammar_be", "grammar_plural_questions"],
  },
  {
    id: "d",
    titleHe: "משפטים ותרגום",
    pages: [
      "sentence_base",
      "sentence_routine",
      "translation_classroom",
      "translation_routines",
    ],
  },
];

export const ENGLISH_G2_PAGE_ORDER = ENGLISH_G2_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors */
export const ENGLISH_G2_ALIGNMENT_ANCHORS = {
  vocab_colors: ["The book is red"],
  vocab_numbers: ["I am twelve"],
  vocab_family: ["This is my book"],
  vocab_animals: ["I see a cat"],
  vocab_emotions: ["I am happy"],
  vocab_actions: ["I run"],
  vocab_school: ["pen"],
  vocab_food: ["bread"],
  vocab_house: ["table"],
  grammar_be: ["He is sad"],
  grammar_plural_questions: ["dogs"],
  sentence_base: ["I have a book"],
  sentence_routine: ["I go to school"],
  translation_classroom: ["Hello"],
  translation_routines: ["I go to school"],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const ENGLISH_G2_PAGE_META = {
  vocab_colors: {
    skillId: "english:vocabulary:wordlist:colors",
    pageType: "vocabulary_theme",
    titleHe: "צבעים — שימוש במשפט",
    scope: "חזרה + מילים במשפט קצר; כתיבה ראשונית",
    continuing: true,
  },
  vocab_numbers: {
    skillId: "english:vocabulary:wordlist:numbers",
    pageType: "vocabulary_theme",
    titleHe: "מספרים — עד 20",
    scope: "eleven–twenty; שימוש במשפט",
    continuing: true,
  },
  vocab_family: {
    skillId: "english:vocabulary:wordlist:family",
    pageType: "vocabulary_theme",
    titleHe: "משפחה — מילים במשפט",
    scope: "This is my mom — תבנית קצרה",
    continuing: true,
  },
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות — שמות ומשפטים",
    scope: "I see a cat — תבנית קצרה",
    continuing: true,
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות — במשפט",
    scope: "I am happy / I am sad",
    continuing: true,
  },
  vocab_actions: {
    skillId: "english:vocabulary:wordlist:actions",
    pageType: "vocabulary_theme",
    titleHe: "פעולות — פועל במשפט",
    scope: "I run / I jump",
    continuing: true,
  },
  vocab_school: {
    skillId: "english:vocabulary:wordlist:school",
    pageType: "vocabulary_theme",
    titleHe: "בית ספר — חפצים במשפט",
    scope: "I have a book / My pen is blue",
    continuing: true,
  },
  vocab_food: {
    skillId: "english:vocabulary:wordlist:food",
    pageType: "vocabulary_theme",
    titleHe: "מזון באנגלית",
    scope: "apple, bread, milk, water — מילים + כתיבה",
  },
  vocab_house: {
    skillId: "english:vocabulary:wordlist:house",
    pageType: "vocabulary_theme",
    titleHe: "בית — חדרים וחפצים",
    scope: "bed, room, door, table — מילים בבית",
  },
  grammar_be: {
    skillId: "english:pool:grammar:be_basic",
    linkedSkillIds: ["english:grammar:line:חיזוק_to_be_am_is_are_וכינויי_גוף"],
    pageType: "concept_foundation",
    titleHe: "am / is / are — חיזוק",
    scope: "I am / You are / He is / She is — ללא מונחים פורמליים",
    continuing: true,
  },
  grammar_plural_questions: {
    skillId: "english:pool:grammar:question_frames",
    linkedSkillIds: [
      "english:grammar:line:ריבוי_שמות_עצם_והיכרות_עם_מבני_שאלות_פשוטים",
    ],
    pageType: "concept_foundation",
    titleHe: "ריבוי ושאלות פשוטות",
    scope: "cat/cats; What is this? — שאלות קצרות",
  },
  sentence_base: {
    skillId: "english:pool:sentence:base",
    pageType: "visual_intuition",
    titleHe: "משפטים קצרים — כיתה ב׳",
    scope: "3–4 מילים; סימן פיסוק בסיסי",
    continuing: true,
  },
  sentence_routine: {
    skillId: "english:pool:sentence:routine",
    pageType: "visual_intuition",
    titleHe: "שגרת יום — משפטים",
    scope: "I wake up / I go to school — שגרה יומית",
  },
  translation_classroom: {
    skillId: "english:pool:translation:classroom",
    pageType: "practice_bridge",
    titleHe: "ביטויי כיתה — משפטים",
    scope: "תרגום ביטוי קצר דו-כיווני",
    continuing: true,
  },
  translation_routines: {
    skillId: "english:pool:translation:routines",
    pageType: "practice_bridge",
    titleHe: "שגרת יום — תרגום",
    scope: "תרגום משפטי שגרה 3–4 מילים",
  },
};
