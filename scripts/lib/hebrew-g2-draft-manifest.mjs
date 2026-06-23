/**
 * Grade 2 Hebrew / עברית learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G2HebrewBatch */

/** @type {G2HebrewBatch[]} */
export const HEBREW_G2_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "קריאה — מילים, משפטים ופיסוק",
    pages: [
      "g2.fluent_words",
      "g2.short_sentence",
      "g2.simple_punctuation_read",
      "spelling_choice_niqqud",
    ],
  },
  {
    id: "b",
    titleHe: "דקדוק — סוגי מילים, זמן ומין/מספר",
    pages: [
      "g2.pos_basic",
      "g2.simple_tense",
      "g2.number_gender_light",
      "agreement_boy_plural",
    ],
  },
  {
    id: "c",
    titleHe: "הבנת הנקרא — רעיון, הסקה ורצף",
    pages: [
      "g2.detail_main_idea",
      "g2.light_inference",
      "g2.simple_sequence",
      "where_from_sentence",
    ],
  },
  {
    id: "d",
    titleHe: "אוצר מילים — נרדפות והקשר",
    pages: ["g2.synonyms_basic", "g2.context_clue_easy", "cloze_school"],
  },
  {
    id: "e",
    titleHe: "כתיבה — משפט, פיסוק ופסקה",
    pages: [
      "g2.sentence_wellformed",
      "g2.punctuation_choice",
      "g2.short_paragraph_choice",
      "object_riddle",
      "role_meaning",
    ],
  },
  {
    id: "f",
    titleHe: "דיבור — תיאור, מצב ותגובה חברתית",
    pages: ["g2.describe_prompt_choice", "g2.situation_register", "thanks_response"],
  },
];

export const HEBREW_G2_PAGE_ORDER = HEBREW_G2_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — words from §5-§6 exercise examples */
export const HEBREW_G2_ALIGNMENT_ANCHORS = {
  "g2.fluent_words": ["ישן", "מיטה"],
  "g2.short_sentence": ["מבשלת", "בבית"],
  "g2.simple_punctuation_read": ["?", "שאלה"],
  "spelling_choice_niqqud": ["שמן", "סמן"],
  "g2.pos_basic": ["ספר", "כיסא"],
  "g2.simple_tense": ["אתמול", "פארק"],
  "g2.number_gender_light": ["ילדות"],
  "agreement_boy_plural": ["ילדות", "גינה"],
  "g2.detail_main_idea": ["אמא", "עוגה"],
  "g2.light_inference": ["כפפות", "כובע"],
  "g2.simple_sequence": ["קודם", "אחר כך"],
  "where_from_sentence": ["ים", "חוף"],
  "g2.synonyms_basic": ["מהיר", "זריז"],
  "g2.context_clue_easy": ["חשוך"],
  "cloze_school": ["מורה"],
  "g2.sentence_wellformed": ["כלבה", "גינה"],
  "g2.punctuation_choice": ["נקודה"],
  "g2.short_paragraph_choice": ["חתול"],
  "object_riddle": ["נייר"],
  "role_meaning": ["כלב"],
  "g2.describe_prompt_choice": ["חתול", "לבן"],
  "g2.situation_register": ["חבר"],
  "thanks_response": ["תודה", "בבקשה"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string; continuing?: boolean }>} */
export const HEBREW_G2_PAGE_META = {
  "g2.fluent_words": {
    skillId: "hebrew:g2:reading:g2.fluent_words",
    pageType: "concept_foundation",
    titleHe: "קריאת מילים בשטף",
    scope: "מילים מוכרות; קריאה חלקה יותר; ללא משפטים ארוכים",
  },
  "g2.short_sentence": {
    skillId: "hebrew:g2:reading:g2.short_sentence",
    pageType: "concept_foundation",
    titleHe: "קריאת משפט קצר",
    scope: "משפט אחד; מי עושה מה; מילים מוכרות",
  },
  "g2.simple_punctuation_read": {
    skillId: "hebrew:g2:reading:g2.simple_punctuation_read",
    pageType: "concept_foundation",
    titleHe: "סימני פיסוק בקריאה",
    scope: "נקודה, פסיק, סימן שאלה; קריאה בקול",
  },
  spelling_choice_niqqud: {
    skillId: "hebrew:rich:reading:word_level_early_g2:spelling_choice_niqqud",
    pageType: "concept_foundation",
    titleHe: "בחירת איות נכון",
    scope: "מילה עם ניקוד חלקי; בחירה בין איותים; G2 — פחות ניקוד מלא",
  },
  "g2.pos_basic": {
    skillId: "hebrew:g2:grammar:g2.pos_basic",
    pageType: "concept_foundation",
    titleHe: "שם עצם, פועל ותואר",
    scope: "זיהוי בסיסי; שמות, פעולות, תיאורים; ללא מונחים פורמליים",
  },
  "g2.simple_tense": {
    skillId: "hebrew:g2:grammar:g2.simple_tense",
    pageType: "concept_foundation",
    titleHe: "זמן פשוט — עבר, הווה ועתיד",
    scope: "אתמול/היום/מחר; דוגמאות קצרות",
  },
  "g2.number_gender_light": {
    skillId: "hebrew:g2:grammar:g2.number_gender_light",
    pageType: "concept_foundation",
    titleHe: "זכר, נקבה, יחיד ורבים",
    scope: "ילד/ילדה; ילדים/ילדות; התאמה קלה",
  },
  agreement_boy_plural: {
    skillId: "hebrew:rich:grammar:gender_number_early_g2:agreement_boy_plural",
    pageType: "concept_foundation",
    titleHe: "התאמה — ילדים רצים",
    scope: "נושא ברבים + פועל מתאים; דוגמה: ילדים רצים",
  },
  "g2.detail_main_idea": {
    skillId: "hebrew:g2:comprehension:g2.detail_main_idea",
    pageType: "concept_foundation",
    titleHe: "רעיון מרכזי ופרטים",
    scope: "משפט קצר; מה העיקר ומה פרט",
  },
  "g2.light_inference": {
    skillId: "hebrew:g2:comprehension:g2.light_inference",
    pageType: "concept_foundation",
    titleHe: "הסקה קלה מטקסט",
    scope: "רמז במשפט; לא מידע מפורש בלבד",
  },
  "g2.simple_sequence": {
    skillId: "hebrew:g2:comprehension:g2.simple_sequence",
    pageType: "concept_foundation",
    titleHe: "רצף פשוט — קודם ואחר כך",
    scope: "שני–שלושה שלבים; סדר אירועים",
  },
  where_from_sentence: {
    skillId: "hebrew:rich:comprehension:binary_fact_early_g2:where_from_sentence",
    pageType: "practice_bridge",
    titleHe: "מאיפה יודעים? — מהמשפט",
    scope: "תשובה מתוך משפט קצר; לא מחוץ לטקסט",
  },
  "g2.synonyms_basic": {
    skillId: "hebrew:g2:vocabulary:g2.synonyms_basic",
    pageType: "concept_foundation",
    titleHe: "מילים נרדפות",
    scope: "מילים דומות במשמעות; יום יום",
  },
  "g2.context_clue_easy": {
    skillId: "hebrew:g2:vocabulary:g2.context_clue_easy",
    pageType: "concept_foundation",
    titleHe: "רמז מההקשר",
    scope: "מילה לא מוכרת; רמזים במשפט",
  },
  cloze_school: {
    skillId: "hebrew:rich:vocabulary:word_context_early_g2:cloze_school",
    pageType: "concept_foundation",
    titleHe: "מילה חסרה — בית ספר",
    scope: "השלמת מילה בהקשר של בית ספר",
  },
  "g2.sentence_wellformed": {
    skillId: "hebrew:g2:writing:g2.sentence_wellformed",
    pageType: "step_by_step_procedure",
    titleHe: "משפט תקין",
    scope: "סדר מילים; נושא ופועל; משפט אחד",
  },
  "g2.punctuation_choice": {
    skillId: "hebrew:g2:writing:g2.punctuation_choice",
    pageType: "step_by_step_procedure",
    titleHe: "סימני פיסוק בכתיבה",
    scope: "נקודה, פסיק, שאלה; בחירה נכונה",
  },
  "g2.short_paragraph_choice": {
    skillId: "hebrew:g2:writing:g2.short_paragraph_choice",
    pageType: "step_by_step_procedure",
    titleHe: "פסקה קצרה — שלושה משפטים",
    scope: "פתיחה, פרט, סיום; 2–3 משפטים",
  },
  object_riddle: {
    skillId: "hebrew:rich:writing:spell_word_early_ab_writing:object_riddle",
    pageType: "mixed",
    titleHe: "חידת מילה — חפץ (כיתה ב׳)",
    scope: "רמזים ארוכים יותר מכיתה א׳; פחות תמונה; G2 depth",
    continuing: true,
  },
  role_meaning: {
    skillId: "hebrew:rich:writing:spell_word_early_ab_writing:role_meaning",
    pageType: "mixed",
    titleHe: "תפקיד המילה — מה היא עושה במשפט?",
    scope: "שם עצם/פועל/תואר במשפט; G2 — משפטים ארוכים יותר",
    continuing: true,
  },
  "g2.describe_prompt_choice": {
    skillId: "hebrew:g2:speaking:g2.describe_prompt_choice",
    pageType: "concept_foundation",
    titleHe: "תיאור קצר",
    scope: "תיאור חפץ או מקום; 2–3 משפטים בעל פה",
  },
  "g2.situation_register": {
    skillId: "hebrew:g2:speaking:g2.situation_register",
    pageType: "concept_foundation",
    titleHe: "דיבור מתאים למצב",
    scope: "בית ספר, בית, חבר; נימוס וטון",
  },
  thanks_response: {
    skillId: "hebrew:rich:speaking:social_reply_early_g2:thanks_response",
    pageType: "concept_foundation",
    titleHe: "תודה — איך עונים?",
    scope: "תגובה חברתית; בבקשה, תודה לך",
  },
};
