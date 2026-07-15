/**
 * History curriculum — grade G6 only.
 * Topic: העולם היווני־רומי והיהודים (60 שעות)
 */

export const HISTORY_GRADE_ORDER = ["g6"];

export const HISTORY_GENERAL_GOALS = [
  "היכרות עם העולם היווני-רומי והקשר שלו לעם היהודי - לפי תוכנית כיתה ו׳.",
  "פיתוח חשיבה היסטורית: מקורות, ציר זמן, סיבה ותוצאה, השוואה ודמויות.",
  "תוכן מותאם לדף ההיסטוריה - נושאים: מהי היסטוריה, יוון, הלניזם, החשמונאים, רומא והיהודים.",
  "2 רמות תרגול (רגיל / מתקדם).",
];

export const HISTORY_TOPIC_ORDER = [
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
  "mixed",
];

export const HISTORY_TOPIC_LABEL_HE = {
  what_is_history: "מהי היסטוריה",
  classical_greece: "יוון הקלאסית",
  hellenism_jews: "הלניזם והיהודים",
  hasmonaeans: "החשמונאים",
  rome_jews: "רומא והיהודים",
  mixed: "תערובת",
};

export const HISTORY_SUBTOPIC_LABEL_HE = {
  hist_sub_intro_sources_timeline:
    "מהי היסטוריה, מקור ראשוני, מקור משני, ציר זמן",
  hist_sub_athens_democracy: "אתונה הדמוקרטית",
  hist_sub_sparta: "ספרטה",
  hist_sub_athens_sparta_compare: "השוואה בין אתונה לספרטה",
  hist_sub_greek_culture_legacy: "תרבות יוון והשפעתה עד היום",
  hist_sub_alexander_hellenism: "אלכסנדר מוקדון והתפשטות ההלניזם",
  hist_sub_hellenism_meets_judaism: "המפגש בין הלניזם ליהדות",
  hist_sub_antiochus_maccabees: "גזרות אנטיוכוס ומרד המקבים",
  hist_sub_hasmonaean_kingdom: "ממלכת החשמונאים",
  hist_sub_rise_of_rome: "עליית רומא והפיכתה לאימפריה",
  hist_sub_roman_culture_law: "תרבות, משפט ומורשת רומית",
  hist_sub_hasmonaean_loss_roman_conquest:
    "אובדן עצמאות החשמונאים והכיבוש הרומי",
  hist_sub_herod_building: "הורדוס ומפעלי הבנייה",
  hist_sub_judea_province: "יהודה כפרובינציה רומית",
  hist_sub_great_revolt_destruction: "המרד הגדול וחורבן בית המקדש",
  hist_sub_yavne_bar_kokhba_babylon:
    "יבנה, מרד בר כוכבא והמרכז היהודי בבבל",
};

/** topicKey → subtopicKeys[] */
export const HISTORY_TOPIC_SUBTOPICS = {
  what_is_history: ["hist_sub_intro_sources_timeline"],
  classical_greece: [
    "hist_sub_athens_democracy",
    "hist_sub_sparta",
    "hist_sub_athens_sparta_compare",
    "hist_sub_greek_culture_legacy",
  ],
  hellenism_jews: [
    "hist_sub_alexander_hellenism",
    "hist_sub_hellenism_meets_judaism",
  ],
  hasmonaeans: ["hist_sub_antiochus_maccabees", "hist_sub_hasmonaean_kingdom"],
  rome_jews: [
    "hist_sub_rise_of_rome",
    "hist_sub_roman_culture_law",
    "hist_sub_hasmonaean_loss_roman_conquest",
    "hist_sub_herod_building",
    "hist_sub_judea_province",
    "hist_sub_great_revolt_destruction",
    "hist_sub_yavne_bar_kokhba_babylon",
  ],
  mixed: Object.keys(HISTORY_SUBTOPIC_LABEL_HE),
};

export const HISTORY_SKILL_LABEL_HE = {
  hist_concepts: "מושגים היסטוריים",
  hist_timeline_sequence: "ציר זמן ורצף אירועים",
  hist_cause_effect: "סיבה ותוצאה",
  hist_comparison: "השוואה",
  hist_figures_roles: "דמויות ותפקידן",
  hist_governance_institutions: "שלטון ומוסדות",
  hist_culture_heritage: "תרבות ומורשת",
  hist_simple_source: "הבנת מקור היסטורי פשוט",
  hist_past_present_link: "קשר בין עבר להווה",
};

export const HISTORY_SKILL_IDS = Object.keys(HISTORY_SKILL_LABEL_HE);

export const HISTORY_GRADES = {
  g6: {
    key: "g6",
    name: "כיתה ו׳",
    stage: "העולם היווני-רומי והיהודים",
    topics: HISTORY_TOPIC_ORDER.filter((t) => t !== "mixed"),
    curriculum: {
      summary:
        "העולם היווני-רומי והיהודים - מהי היסטוריה, יוון הקלאסית, הלניזם, החשמונאים, רומא והיהודים.",
      focus: [
        "מהי היסטוריה, מקורות וציר זמן",
        "יוון: אתונה, ספרטה, תרבות והשפעה",
        "הלניזם, אלכסנדר והמפגש עם היהדות",
        "גזרות אנטיוכוס, המקבים והחשמונאים",
        "רומא, יהודה, חורבן, יבנה ובר כוכבא",
      ],
      skills: Object.values(HISTORY_SKILL_LABEL_HE),
    },
  },
};

export function historyTopicLabelHe(topicKey) {
  return HISTORY_TOPIC_LABEL_HE[topicKey] || topicKey;
}

export function historySubtopicLabelHe(subtopicKey) {
  return HISTORY_SUBTOPIC_LABEL_HE[subtopicKey] || subtopicKey;
}

export function historySubtopicsForTopic(topicKey) {
  return HISTORY_TOPIC_SUBTOPICS[topicKey] || [];
}
