/**
 * Grade 5 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G5EngBatch */

/** @type {G5EngBatch[]} */
export const ENGLISH_G5_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — המשך",
    pages: [
      "vocab_animals",
      "vocab_community",
      "vocab_emotions",
      "vocab_environment",
      "vocab_family",
      "vocab_food",
      "vocab_school",
      "vocab_sports",
      "vocab_travel",
    ],
  },
  {
    id: "b",
    titleHe: "אוצר מילים חדש — בריאות וטכנולוגיה",
    pages: ["vocab_health", "vocab_technology"],
  },
  {
    id: "c",
    titleHe: "דקדוק — עבר, עתיד, מודאליים, השוואה",
    pages: [
      "grammar_past_simple",
      "grammar_future_forms",
      "grammar_modals",
      "grammar_comparatives",
      "grammar_quantifiers",
    ],
  },
  {
    id: "d",
    titleHe: "משפטים",
    pages: ["sentence_narrative", "sentence_advanced"],
  },
  {
    id: "e",
    titleHe: "תרגום",
    pages: [
      "translation_community",
      "translation_technology",
      "translation_global",
    ],
  },
];

export const ENGLISH_G5_PAGE_ORDER = ENGLISH_G5_BOOK_BATCHES.flatMap((b) => b.pages);

export const ENGLISH_G5_ALIGNMENT_ANCHORS = {
  vocab_animals: ["The elephant walked slowly"],
  vocab_community: ["We visited the museum yesterday"],
  vocab_emotions: ["She felt proud after the test"],
  vocab_environment: ["They planted trees last year"],
  vocab_family: ["My grandparents live far away"],
  vocab_food: ["We cooked healthy soup"],
  vocab_school: ["Our class won the project"],
  vocab_sports: ["He scored a goal yesterday"],
  vocab_travel: ["We will travel by train"],
  vocab_health: ["I need to rest and drink water"],
  vocab_technology: ["She uses a computer for homework"],
  grammar_past_simple: ["I played football yesterday"],
  grammar_future_forms: ["We are going to visit grandma"],
  grammar_modals: ["You must wear a helmet"],
  grammar_comparatives: ["This book is more interesting than that one"],
  grammar_quantifiers: ["There were many people at the park"],
  sentence_narrative: ["Then we arrived at the station"],
  sentence_advanced: ["Last week we learned about the environment"],
  translation_community: ["The hospital is next to the park"],
  translation_technology: ["I will send an email tomorrow"],
  translation_global: ["People around the world speak many languages"],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const ENGLISH_G5_PAGE_META = {
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות — Past Simple",
    scope: "The elephant walked slowly — פועל בעבר",
    continuing: true,
  },
  vocab_community: {
    skillId: "english:vocabulary:wordlist:community",
    pageType: "vocabulary_theme",
    titleHe: "קהילה — visited, museum",
    scope: "We visited the museum — מקומות בקהילה בעבר",
    continuing: true,
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות — felt proud",
    scope: "She felt proud — רגשות בעבר",
    continuing: true,
  },
  vocab_environment: {
    skillId: "english:vocabulary:wordlist:environment",
    pageType: "vocabulary_theme",
    titleHe: "סביבה — planted trees",
    scope: "They planted trees last year",
    continuing: true,
  },
  vocab_family: {
    skillId: "english:vocabulary:wordlist:family",
    pageType: "vocabulary_theme",
    titleHe: "משפחה — grandparents",
    scope: "My grandparents live far away",
    continuing: true,
  },
  vocab_food: {
    skillId: "english:vocabulary:wordlist:food",
    pageType: "vocabulary_theme",
    titleHe: "מזון — cooked healthy food",
    scope: "We cooked healthy soup",
    continuing: true,
  },
  vocab_school: {
    skillId: "english:vocabulary:wordlist:school",
    pageType: "vocabulary_theme",
    titleHe: "בית ספר — class project",
    scope: "Our class won the project",
    continuing: true,
  },
  vocab_sports: {
    skillId: "english:vocabulary:wordlist:sports",
    pageType: "vocabulary_theme",
    titleHe: "ספורט — scored a goal",
    scope: "He scored a goal yesterday",
    continuing: true,
  },
  vocab_travel: {
    skillId: "english:vocabulary:wordlist:travel",
    pageType: "vocabulary_theme",
    titleHe: "נסיעות — will travel",
    scope: "We will travel by train — קישור לעתיד",
    continuing: true,
  },
  vocab_health: {
    skillId: "english:vocabulary:wordlist:health",
    pageType: "vocabulary_theme",
    titleHe: "בריאות באנגלית",
    scope: "rest, water, doctor, exercise — I need to rest",
  },
  vocab_technology: {
    skillId: "english:vocabulary:wordlist:technology",
    pageType: "vocabulary_theme",
    titleHe: "טכנולוגיה באנגלית",
    scope: "computer, email, internet — She uses a computer",
  },
  grammar_past_simple: {
    skillId: "english:pool:grammar:past_simple",
    linkedSkillIds: [
      "english:grammar:line:past_simple_סדירים_חריגים_נפוצים",
    ],
    pageType: "step_by_step_procedure",
    titleHe: "Past Simple — עבר פשוט",
    scope: "played/went/saw — חיובי ושאלה; סדירים וחריגים נפוצים",
  },
  grammar_future_forms: {
    skillId: "english:pool:grammar:future_forms",
    linkedSkillIds: [
      "english:grammar:line:מודאליים_בסיסיים_future_will_going_to_והשוואתיים",
    ],
    pageType: "concept_foundation",
    titleHe: "Future — will / going to",
    scope: "I will call you / We are going to visit",
  },
  grammar_modals: {
    skillId: "english:pool:grammar:modals",
    linkedSkillIds: [
      "english:grammar:line:מודאליים_בסיסיים_future_will_going_to_והשוואתיים",
    ],
    pageType: "concept_foundation",
    titleHe: "Modals — can, must, have to",
    scope: "You must… / I can… / We have to…",
  },
  grammar_comparatives: {
    skillId: "english:pool:grammar:comparatives",
    linkedSkillIds: [
      "english:grammar:line:מודאליים_בסיסיים_future_will_going_to_והשוואתיים",
    ],
    pageType: "concept_foundation",
    titleHe: "Comparatives — bigger, more interesting",
    scope: "bigger than / more interesting than",
  },
  grammar_quantifiers: {
    skillId: "english:pool:grammar:quantifiers",
    pageType: "practice_bridge",
    titleHe: "much/many — חיזוק כיתה ה׳",
    scope: "many people / much time — בהקשר עבר ועתיד",
    continuing: true,
  },
  sentence_narrative: {
    skillId: "english:pool:sentence:narrative",
    pageType: "visual_intuition",
    titleHe: "סיפור — Then we arrived",
    scope: "First… Then… After that… — רצף בעבר",
    continuing: true,
  },
  sentence_advanced: {
    skillId: "english:pool:sentence:advanced",
    pageType: "visual_intuition",
    titleHe: "משפטים מורחבים",
    scope: "6–8 מילים; Last week we learned…",
  },
  translation_community: {
    skillId: "english:pool:translation:community",
    pageType: "practice_bridge",
    titleHe: "קהילה — תרגום מורחב",
    scope: "The hospital is next to the park",
    continuing: true,
  },
  translation_technology: {
    skillId: "english:pool:translation:technology",
    pageType: "practice_bridge",
    titleHe: "טכנולוגיה — תרגום",
    scope: "I will send an email tomorrow",
  },
  translation_global: {
    skillId: "english:pool:translation:global",
    pageType: "practice_bridge",
    titleHe: "עולם — תרגום",
    scope: "People around the world speak many languages",
  },
};
