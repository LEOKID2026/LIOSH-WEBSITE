/**
 * Grade 6 English learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G6EngBatch */

/** @type {G6EngBatch[]} */
export const ENGLISH_G6_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "אוצר מילים — המשך",
    pages: [
      "vocab_animals",
      "vocab_community",
      "vocab_emotions",
      "vocab_environment",
      "vocab_health",
      "vocab_technology",
      "vocab_travel",
    ],
  },
  {
    id: "b",
    titleHe: "אוצר מילים חדש — תרבות, עולם, היסטוריה",
    pages: ["vocab_culture", "vocab_global_issues", "vocab_history"],
  },
  {
    id: "c",
    titleHe: "דקדוק — זמנים מורכבים, תנאי, מודאליים",
    pages: [
      "grammar_complex_tenses",
      "grammar_conditionals",
      "grammar_modals",
      "grammar_comparatives",
    ],
  },
  {
    id: "d",
    titleHe: "משפטים מורחבים",
    pages: ["sentence_advanced"],
  },
  {
    id: "e",
    titleHe: "תרגום — טכנולוגיה ועולם",
    pages: ["translation_technology", "translation_global"],
  },
];

export const ENGLISH_G6_PAGE_ORDER = ENGLISH_G6_BOOK_BATCHES.flatMap((b) => b.pages);

export const ENGLISH_G6_ALIGNMENT_ANCHORS = {
  vocab_animals: ["The eagles were flying over the mountains when we arrived"],
  vocab_community: ["Children and adults danced together at the festival"],
  vocab_emotions: ["They might feel proud after a win"],
  vocab_environment: ["Temperatures are rising due to climate change"],
  vocab_health: ["You should eat fruits and vegetables every day"],
  vocab_technology: ["If the electricity goes off, we could use candles"],
  vocab_travel: ["They have already visited five countries this year"],
  vocab_culture: ["Dance is an important part of our tradition"],
  vocab_global_issues: ["International organizations help solve global problems"],
  vocab_history: ["Researchers discovered ancient tools from thousands of years ago"],
  grammar_complex_tenses: ["They were sitting in the garden when it started to rain"],
  grammar_conditionals: ["If you do your homework, you will get a good grade"],
  grammar_modals: ["We might go to the beach on Saturday"],
  grammar_comparatives: ["This is the funniest film I have watched"],
  sentence_advanced: ["While my mother was cooking, my father was reading a book"],
  translation_technology: ["Researchers might find a new medicine in the coming years"],
  translation_global: ["If we protect the forests, animals will survive"],
};

/** @type {Record<string, { skillId: string; linkedSkillIds?: string[]; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const ENGLISH_G6_PAGE_META = {
  vocab_animals: {
    skillId: "english:vocabulary:wordlist:animals",
    pageType: "vocabulary_theme",
    titleHe: "חיות — Past Continuous",
    scope: "The whales were swimming — פעולה בעבר במקביל",
    continuing: true,
  },
  vocab_community: {
    skillId: "english:vocabulary:wordlist:community",
    pageType: "vocabulary_theme",
    titleHe: "קהילה — festival, celebrate",
    scope: "Our community celebrated — אירועים בקהילה",
    continuing: true,
  },
  vocab_emotions: {
    skillId: "english:vocabulary:wordlist:emotions",
    pageType: "vocabulary_theme",
    titleHe: "רגשות — might feel",
    scope: "He might feel nervous — רגשות עם modal",
    continuing: true,
  },
  vocab_environment: {
    skillId: "english:vocabulary:wordlist:environment",
    pageType: "vocabulary_theme",
    titleHe: "סביבה — climate, protect",
    scope: "Climate change affects… — נושאים סביבתיים",
    continuing: true,
  },
  vocab_health: {
    skillId: "english:vocabulary:wordlist:health",
    pageType: "vocabulary_theme",
    titleHe: "בריאות — should rest",
    scope: "You should drink water — עצות בריאות",
    continuing: true,
  },
  vocab_technology: {
    skillId: "english:vocabulary:wordlist:technology",
    pageType: "vocabulary_theme",
    titleHe: "טכנולוגיה — if / could",
    scope: "If the internet stops… — טכנולוגיה בתנאי",
    continuing: true,
  },
  vocab_travel: {
    skillId: "english:vocabulary:wordlist:travel",
    pageType: "vocabulary_theme",
    titleHe: "נסיעות — Present Perfect intro",
    scope: "We have visited three countries — היכרות בלבד",
    continuing: true,
  },
  vocab_culture: {
    skillId: "english:vocabulary:wordlist:culture",
    pageType: "vocabulary_theme",
    titleHe: "תרבות באנגלית",
    scope: "culture, tradition, music, identity",
  },
  vocab_global_issues: {
    skillId: "english:vocabulary:wordlist:global_issues",
    pageType: "vocabulary_theme",
    titleHe: "סוגיות גלובליות",
    scope: "global issues, peace, cooperation",
  },
  vocab_history: {
    skillId: "english:vocabulary:wordlist:history",
    pageType: "vocabulary_theme",
    titleHe: "היסטוריה באנגלית",
    scope: "ancient, century, learn about history",
  },
  grammar_complex_tenses: {
    skillId: "english:pool:grammar:complex_tenses",
    linkedSkillIds: [
      "english:grammar:line:past_continuous_לצד_past_simple_היכרות_עם_present_perfect",
    ],
    pageType: "contrast_page",
    titleHe: "Past Continuous + Past Simple + היכרות Present Perfect",
    scope: "I was reading when…; I have visited — intro only",
  },
  grammar_conditionals: {
    skillId: "english:pool:grammar:conditionals",
    linkedSkillIds: [
      "english:grammar:line:conditionals_type_0_1_ומודאליים_should_might_could",
    ],
    pageType: "concept_foundation",
    titleHe: "Conditionals — type 0 ו-1",
    scope: "If it rains, we will stay / If you heat ice, it melts",
  },
  grammar_modals: {
    skillId: "english:pool:grammar:modals",
    linkedSkillIds: [
      "english:grammar:line:conditionals_type_0_1_ומודאליים_should_might_could",
    ],
    pageType: "concept_foundation",
    titleHe: "should / might / could",
    scope: "You should… / It might… / We could… — לא חזרה על can/must בלבד",
    continuing: true,
  },
  grammar_comparatives: {
    skillId: "english:pool:grammar:comparatives",
    pageType: "practice_bridge",
    titleHe: "Superlatives — the most interesting",
    scope: "the best / the most interesting — חיזוק כיתה ו׳",
    continuing: true,
  },
  sentence_advanced: {
    skillId: "english:pool:sentence:advanced",
    pageType: "visual_intuition",
    titleHe: "משפטים מורכבים — While… was…",
    scope: "8–10 מילים; While I was studying…",
    continuing: true,
  },
  translation_technology: {
    skillId: "english:pool:translation:technology",
    pageType: "practice_bridge",
    titleHe: "טכנולוגיה — תרגום מתקדם",
    scope: "Scientists might discover… — תרגום דו-כיווני",
    continuing: true,
  },
  translation_global: {
    skillId: "english:pool:translation:global",
    pageType: "practice_bridge",
    titleHe: "עולם — תרגום עם תנאי",
    scope: "If we protect the oceans… — משפטים ארוכים",
    continuing: true,
  },
};
