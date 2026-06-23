/**
 * Grade 3 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G3EngBatch */

/** @type {G3EngBatch[]} */
export const ENGLISH_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — המשך (חלק א׳)",
    pages: [
      "vocab_actions",
      "vocab_animals",
      "vocab_colors",
      "vocab_emotions",
      "vocab_family",
    ],
  },
  {
    id: "b",
    titleHe: "אוצר מילים — המשך (חלק ב׳)",
    pages: ["vocab_food", "vocab_house", "vocab_numbers", "vocab_school"],
  },
  {
    id: "c",
    titleHe: "אוצר מילים חדש — גוף, ספורט, מזג אוויר",
    pages: ["vocab_body", "vocab_sports", "vocab_weather"],
  },
  {
    id: "d",
    titleHe: "דקדוק — Present Simple, a/an/the, מיקום",
    pages: [
      "grammar_present_simple",
      "grammar_articles_prepositions",
      "grammar_question_frames",
    ],
  },
  {
    id: "e",
    titleHe: "משפטים ותרגום",
    pages: [
      "sentence_routine",
      "sentence_descriptive",
      "translation_routines",
      "translation_hobbies",
    ],
  },
];

export const ENGLISH_G3_PAGE_ORDER = ENGLISH_G3_BOOK_BATCHES.flatMap((b) => b.pages);

export const ENGLISH_G3_ALIGNMENT_ANCHORS = {
  vocab_actions: ["She jumps"],
  vocab_animals: ["The bird flies"],
  vocab_colors: ["The grass is green"],
  vocab_emotions: ["She feels tired"],
  vocab_family: ["My mother cooks"],
  vocab_food: ["I eat a banana"],
  vocab_house: ["The bag is in the room"],
  vocab_numbers: ["There are three chairs"],
  vocab_school: ["We draw pictures"],
  vocab_body: ["My leg hurts"],
  vocab_sports: ["I swim in the pool"],
  vocab_weather: ["It is rainy"],
  grammar_present_simple: ["She plays tennis"],
  grammar_articles_prepositions: ["The ball is in the box"],
  grammar_question_frames: ["Do you like books"],
  sentence_routine: ["I eat breakfast"],
  sentence_descriptive: ["The tall girl jumps"],
  translation_routines: ["I wake up early"],
  translation_hobbies: ["He likes to read"],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const ENGLISH_G3_PAGE_META = {
  vocab_actions: {
    skillId: "english:vocabulary:wordlist:actions",
    pageType: "vocabulary_theme",
    titleHe: "פעולות — Present Simple",
    scope: "פועל בזמן הווה פשוט; actions בשנה אחרונה",
    continuing: true,
  },
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות — במשפט מלא",
    scope: "The dog runs fast — משפט עם פועל",
    continuing: true,
  },
  vocab_colors: {
    skillId: "english:vocabulary:wordlist:colors",
    pageType: "vocabulary_theme",
    titleHe: "צבעים — תיאור",
    scope: "The sky is blue — תיאור עם is",
    continuing: true,
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות — She feels…",
    scope: "She feels happy / sad",
    continuing: true,
  },
  vocab_family: {
    skillId: "english:vocabulary:wordlist:family",
    pageType: "vocabulary_theme",
    titleHe: "משפחה — פעולות במשפחה",
    scope: "My brother reads every day",
    continuing: true,
  },
  vocab_food: {
    skillId: "english:vocabulary:wordlist:food",
    pageType: "vocabulary_theme",
    titleHe: "מזון — I eat…",
    scope: "I eat an apple / I drink milk",
    continuing: true,
  },
  vocab_house: {
    skillId: "english:vocabulary:wordlist:house",
    pageType: "vocabulary_theme",
    titleHe: "בית — חפצים ומיקום",
    scope: "The book is on the table — הכנה ל-in/on/under",
    continuing: true,
  },
  vocab_numbers: {
    skillId: "english:vocabulary:wordlist:numbers",
    pageType: "vocabulary_theme",
    titleHe: "מספרים — There are…",
    scope: "There are ten books — מספר + שם עצם",
    continuing: true,
  },
  vocab_school: {
    skillId: "english:vocabulary:wordlist:school",
    pageType: "vocabulary_theme",
    titleHe: "בית ספר — We learn…",
    scope: "We learn English at school",
    continuing: true,
  },
  vocab_body: {
    skillId: "english:vocabulary:wordlist:body",
    pageType: "vocabulary_theme",
    titleHe: "גוף האדם באנגלית",
    scope: "head, hand, leg, eye — My head hurts",
  },
  vocab_sports: {
    skillId: "english:vocabulary:wordlist:sports",
    pageType: "vocabulary_theme",
    titleHe: "ספורט באנגלית",
    scope: "football, swim, run — I play football",
  },
  vocab_weather: {
    skillId: "english:vocabulary:wordlist:weather",
    pageType: "vocabulary_theme",
    titleHe: "מזג אוויר באנגלית",
    scope: "sunny, rainy, cloudy — It is sunny",
  },
  grammar_present_simple: {
    skillId: "english:pool:grammar:present_simple",
    linkedSkillIds: [
      "english:grammar:line:present_simple_בחיובי_שלילי_שאלה",
    ],
    pageType: "step_by_step_procedure",
    titleHe: "Present Simple — חיובי, שלילי ושאלה",
    scope: "I play / I do not play / Do you play? — הסבר בעברית פשוטה",
  },
  grammar_articles_prepositions: {
    skillId: "english:grammar:line:תארים_בסיסיים_יידוע_a_an_the_ומילות_יחס_מקום_in_on_under",
    pageType: "concept_foundation",
    titleHe: "a / an / the ו-in / on / under",
    scope: "יידוע בסיסי + מיקום; The cat is under the bed",
  },
  grammar_question_frames: {
    skillId: "english:pool:grammar:question_frames",
    pageType: "practice_bridge",
    titleHe: "שאלות — חיזוק כיתה ג׳",
    scope: "Do you…? / What is…? — חזרה עם Present Simple",
    continuing: true,
  },
  sentence_routine: {
    skillId: "english:pool:sentence:routine",
    pageType: "visual_intuition",
    titleHe: "שגרת יום — משפטים מלאים",
    scope: "I brush my teeth every morning",
    continuing: true,
  },
  sentence_descriptive: {
    skillId: "english:pool:sentence:descriptive",
    pageType: "visual_intuition",
    titleHe: "משפטים תיאוריים",
    scope: "The big dog runs fast — תאר + שם עצם + פועל",
  },
  translation_routines: {
    skillId: "english:pool:translation:routines",
    pageType: "practice_bridge",
    titleHe: "שגרה — תרגום מורחב",
    scope: "תרגום משפטי שגרה 4–5 מילים",
    continuing: true,
  },
  translation_hobbies: {
    skillId: "english:pool:translation:hobbies",
    pageType: "practice_bridge",
    titleHe: "תחביבים — תרגום",
    scope: "I like to draw / She plays the piano",
  },
};
