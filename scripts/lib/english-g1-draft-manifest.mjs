/**
 * Grade 1 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G1EngBatch */

/** @type {G1EngBatch[]} */
export const ENGLISH_G1_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — צבעים, מספרים, משפחה",
    pages: ["vocab_colors", "vocab_numbers", "vocab_family"],
  },
  {
    id: "b",
    titleHe: "אוצר מילים — חיות, רגשות, פעולות, בית ספר",
    pages: ["vocab_animals", "vocab_emotions", "vocab_actions", "vocab_school"],
  },
  {
    id: "c",
    titleHe: "תבניות בסיסיות — be, משפטים, כיתה",
    pages: ["grammar_be", "sentence_base", "translation_classroom"],
  },
];

export const ENGLISH_G1_PAGE_ORDER = ENGLISH_G1_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same English word/context in both sections */
export const ENGLISH_G1_ALIGNMENT_ANCHORS = {
  vocab_colors: [],
  vocab_numbers: [],
  vocab_family: [],
  vocab_animals: [],
  vocab_emotions: [],
  vocab_actions: [],
  vocab_school: [],
  grammar_be: [],
  sentence_base: [],
  translation_classroom: [],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string }>} */
export const ENGLISH_G1_PAGE_META = {
  vocab_colors: {
    skillId: "english:vocabulary:wordlist:colors",
    pageType: "vocabulary_theme",
    titleHe: "צבעים באנגלית",
    scope: "red, blue, green, yellow — זיהוי והחלפה עם עברית; ללא איות",
  },
  vocab_numbers: {
    skillId: "english:vocabulary:wordlist:numbers",
    pageType: "vocabulary_theme",
    titleHe: "מספרים 0–10 באנגלית",
    scope: "zero–ten; זיהוי מספר באנגלית מתוך עברית",
  },
  vocab_family: {
    skillId: "english:vocabulary:wordlist:family",
    pageType: "vocabulary_theme",
    titleHe: "משפחה באנגלית",
    scope: "mom, dad, sister, brother — מילים בסיסיות",
  },
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות באנגלית",
    scope: "cat, dog, bird, fish — שמות חיות נפוצות",
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות באנגלית",
    scope: "happy, sad — רגשות ראשוניים",
  },
  vocab_actions: {
    skillId: "english:vocabulary:wordlist:actions",
    pageType: "vocabulary_theme",
    titleHe: "פעולות באנגלית",
    scope: "run, jump, read, eat — פעלים פשוטים",
  },
  vocab_school: {
    skillId: "english:vocabulary:wordlist:school",
    pageType: "vocabulary_theme",
    titleHe: "בית ספר באנגלית",
    scope: "book, pen, desk, teacher — חפצי כיתה",
  },
  grammar_be: {
    skillId: "english:pool:grammar:be_basic",
    linkedSkillIds: [
      "english:grammar:line:חשיפה_ל_i_am_you_are_ולכינויי_גוף_בסיסיים_בתוך_תבניות_קבועות",
    ],
    pageType: "concept_foundation",
    titleHe: "I am / You are — היכרות",
    scope: "תבניות קבועות I am / You are + כינויי גוף בסיסיים; ללא טבלת am/is/are",
  },
  sentence_base: {
    skillId: "english:pool:sentence:base",
    pageType: "visual_intuition",
    titleHe: "משפטים קצרים — בסיס",
    scope: "משפטים בני 2–3 מילים מתוך מילים שנלמדו",
  },
  translation_classroom: {
    skillId: "english:pool:translation:classroom",
    pageType: "practice_bridge",
    titleHe: "ביטויי כיתה",
    scope: "Hello, Thank you, Please — תרגום מילה/ביטוי קצר",
  },
};
