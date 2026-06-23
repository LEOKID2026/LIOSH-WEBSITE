/**
 * Grade 4 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G4EngBatch */

/** @type {G4EngBatch[]} */
export const ENGLISH_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — המשך",
    pages: [
      "vocab_animals",
      "vocab_body",
      "vocab_emotions",
      "vocab_family",
      "vocab_food",
      "vocab_school",
      "vocab_sports",
      "vocab_weather",
    ],
  },
  {
    id: "b",
    titleHe: "אוצר מילים חדש — קהילה, סביבה, נסיעות",
    pages: ["vocab_community", "vocab_environment", "vocab_travel"],
  },
  {
    id: "c",
    titleHe: "דקדוק — זמנים, כמות, שייכות",
    pages: [
      "grammar_present_simple",
      "grammar_simple_continuous",
      "grammar_quantifiers",
    ],
  },
  {
    id: "d",
    titleHe: "משפטים",
    pages: ["sentence_descriptive", "sentence_routine", "sentence_narrative"],
  },
  {
    id: "e",
    titleHe: "תרגום",
    pages: ["translation_hobbies", "translation_community"],
  },
];

export const ENGLISH_G4_PAGE_ORDER = ENGLISH_G4_BOOK_BATCHES.flatMap((b) => b.pages);

export const ENGLISH_G4_ALIGNMENT_ANCHORS = {
  vocab_animals: ["The fish are swimming in the sea"],
  vocab_body: ["He brushes his hair"],
  vocab_emotions: ["They feel sad"],
  vocab_family: ["My parents help me"],
  vocab_food: ["We eat fresh vegetables"],
  vocab_school: ["The students listen to the teacher"],
  vocab_sports: ["They are playing basketball now"],
  vocab_weather: ["It is snowing today"],
  vocab_community: ["The school is in our town"],
  vocab_environment: ["We protect the sea"],
  vocab_travel: ["We travel by train"],
  grammar_present_simple: ["They play football every Saturday"],
  grammar_simple_continuous: ["They are playing football now"],
  grammar_quantifiers: ["I have many books"],
  sentence_descriptive: ["The smart boy writes nicely"],
  sentence_routine: ["Every day he drinks water"],
  sentence_narrative: ["Then we go to the bus stop"],
  translation_hobbies: ["He is singing a song"],
  translation_community: ["The school is near the park"],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const ENGLISH_G4_PAGE_META = {
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות — פעולה עכשיו",
    scope: "The birds are flying — קישור ל-Continuous",
    continuing: true,
  },
  vocab_body: {
    skillId: "english:vocabulary:wordlist:body",
    pageType: "vocabulary_theme",
    titleHe: "גוף — פעולות יומיומיות",
    scope: "He washes his hands — Present Simple",
    continuing: true,
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות — They feel…",
    scope: "They feel excited today",
    continuing: true,
  },
  vocab_family: {
    skillId: "english:vocabulary:wordlist:family",
    pageType: "vocabulary_theme",
    titleHe: "משפחה — parents, work",
    scope: "My parents work hard",
    continuing: true,
  },
  vocab_food: {
    skillId: "english:vocabulary:wordlist:food",
    pageType: "vocabulary_theme",
    titleHe: "מזון — healthy food",
    scope: "We eat healthy food",
    continuing: true,
  },
  vocab_school: {
    skillId: "english:vocabulary:wordlist:school",
    pageType: "vocabulary_theme",
    titleHe: "בית ספר — students, read",
    scope: "The students read books",
    continuing: true,
  },
  vocab_sports: {
    skillId: "english:vocabulary:wordlist:sports",
    pageType: "vocabulary_theme",
    titleHe: "ספורט — עכשיו במגרש",
    scope: "She is swimming now",
    continuing: true,
  },
  vocab_weather: {
    skillId: "english:vocabulary:wordlist:weather",
    pageType: "vocabulary_theme",
    titleHe: "מזג אוויר — היום",
    scope: "It is raining today",
    continuing: true,
  },
  vocab_community: {
    skillId: "english:vocabulary:wordlist:community",
    pageType: "vocabulary_theme",
    titleHe: "קהילה — park, town, library",
    scope: "The park is in our town",
  },
  vocab_environment: {
    skillId: "english:vocabulary:wordlist:environment",
    pageType: "vocabulary_theme",
    titleHe: "סביבה — trees, protect",
    scope: "We protect the trees",
  },
  vocab_travel: {
    skillId: "english:vocabulary:wordlist:travel",
    pageType: "vocabulary_theme",
    titleHe: "נסיעות — bus, travel",
    scope: "We travel by bus",
  },
  grammar_present_simple: {
    skillId: "english:pool:grammar:present_simple",
    pageType: "practice_bridge",
    titleHe: "Present Simple — חיזוק",
    scope: "הabit, fact — He walks every day; לא Continuous",
    continuing: true,
  },
  grammar_simple_continuous: {
    skillId: "english:pool:grammar:progressive",
    linkedSkillIds: [
      "english:grammar:line:present_simple_לעומת_present_continuous",
    ],
    pageType: "contrast_page",
    titleHe: "Present Simple לעומת Continuous",
    scope: "I read every day / I am reading now — now vs usually",
  },
  grammar_quantifiers: {
    skillId: "english:pool:grammar:quantifiers",
    linkedSkillIds: [
      "english:grammar:line:some_any_much_many_כינויי_שייכות_ותוארי_פועל_slowly_quickly",
    ],
    pageType: "concept_foundation",
    titleHe: "some/any, much/many, my, slowly",
    scope: "כמות, שייכות, תואר פועל — I have some apples; She runs quickly",
  },
  sentence_descriptive: {
    skillId: "english:pool:sentence:descriptive",
    pageType: "visual_intuition",
    titleHe: "תיאור — תאר + תואר פועל",
    scope: "The tall girl runs quickly",
    continuing: true,
  },
  sentence_routine: {
    skillId: "english:pool:sentence:routine",
    pageType: "visual_intuition",
    titleHe: "שגרה — every day",
    scope: "Every day I help at home",
    continuing: true,
  },
  sentence_narrative: {
    skillId: "english:pool:sentence:narrative",
    pageType: "visual_intuition",
    titleHe: "סיפור קצר — First… Then…",
    scope: "First we pack. Then we go. — רצף פשוט",
  },
  translation_hobbies: {
    skillId: "english:pool:translation:hobbies",
    pageType: "practice_bridge",
    titleHe: "תחביבים — תרגום עם Continuous",
    scope: "He is playing guitar — תרגום דו-כיווני",
    continuing: true,
  },
  translation_community: {
    skillId: "english:pool:translation:community",
    pageType: "practice_bridge",
    titleHe: "קהילה — תרגום",
    scope: "The library is near the school",
  },
};
