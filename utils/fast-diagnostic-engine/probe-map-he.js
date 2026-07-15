/**
 * Deterministic next-probe hints by normalized error tag or diagnosticSkillId.
 * Used when dominantTag / skill matches; FastDiagnosticEngine keeps generic fallback otherwise.
 */

/** @typedef {{ skill: string, suggestedQuestionType: string, reasonHe: string }} ProbeHint */

/** @type {Record<string, ProbeHint>} */
export const PROBE_BY_ERROR_TAG = {
  adds_denominators_directly: {
    skill: "מציאת מכנה משותף לפני חיבור שברים",
    suggestedQuestionType: "fraction_common_denominator_only",
    reasonHe:
      "לבדוק אם הקושי הוא במציאת מכנה משותף לפני החיבור עצמו, עם שאלות קצרות על מכנה אחד משותף בלבד.",
  },
  wrong_lcm: {
    skill: "הבנת מכנה משותף מינימלי",
    suggestedQuestionType: "fraction_lcm_pair_compare",
    reasonHe:
      "להריץ זוגות מכנים קטנים ולבקש לזהות את המכנה המשותף המינימלי לפני האיחוד.",
  },
  ignores_denominator: {
    skill: "קישור מונה–מכנה בפעולות על שברים",
    suggestedQuestionType: "fraction_same_den_twice",
    reasonHe: "לחזק את הקישור בין מונה למכנה לפני שילוב שני שברים.",
  },
  concept_gap: {
    skill: "הבנת משמעות השבר כיחס",
    suggestedQuestionType: "fraction_meaning_visual",
    reasonHe: "להציג ייצוג חזותי של השבר כיחס לפני אלגוריתם החיבור.",
  },
  operation_confusion: {
    skill: "הבחנה בין חיבור לכפל שברים",
    suggestedQuestionType: "fraction_operation_gate",
    reasonHe: "לבחור במפורש פעולה אחת (חיבור/חיסור/כפל) עם משפט הנחיה קצר.",
  },
  tense_confusion: {
    skill: "התאמת זמן לפי מילת זמן או נושא",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבחור זוגות מינימליים (למשל עבר/הווה) עם אותו שורש ומילת זמן ברורה.",
  },
  grammar_pattern_error: {
    skill: "התאמת צורת הפועל לנושא",
    suggestedQuestionType: "english_subject_verb_agreement_short",
    reasonHe: "לבודד משפטים קצרים עם נושא יחיד/רבים והטיית פועל מתאימה.",
  },
  vocabulary_gap: {
    skill: "אוצר מילים במסגרת משפט קצר",
    suggestedQuestionType: "english_vocab_in_context_cloze",
    reasonHe: "להשלים מילה במשפט קצר עם הקשר ברור (לא רשימת מילים בודדת).",
  },
  comprehension_gap: {
    skill: "שאלת הבנה ממוקדת לפסקה קצרה",
    suggestedQuestionType: "hebrew_read_explicit_detail",
    reasonHe: "לקרוא פסקה קצרה ולענות על שאלה אחת שדורשת מידע מפורש מהטקסט.",
  },
  detail_recall_error: {
    skill: "איתור פרט מפורש בטקסט",
    suggestedQuestionType: "hebrew_detail_scan_short",
    reasonHe: "לבקש לאתר פרט אחד שהופיע במפורש בלי הסקות.",
  },
  inference_error: {
    skill: "הסקה מבוקרת מהטקסט",
    suggestedQuestionType: "hebrew_inference_one_step",
    reasonHe: "משפט קצר עם שאלה שדורשת צעד הסקה אחד מעוגן בטקסט.",
  },
  sequence_error: {
    skill: "סדר אירועים מהטקסט",
    suggestedQuestionType: "hebrew_sequence_three_steps",
    reasonHe: "לאכלס שלושה אירועים ולבקש סדר הגיוני לפי הניסוח.",
  },
  concept_confusion: {
    skill: "הבחנה בין מושגים קרובים במדע",
    suggestedQuestionType: "science_concept_minimal_contrast",
    reasonHe: "להציג שני מושגים סמוכים ולבחור הגדרה אחת נכונה מהטקסט המקוצר.",
  },
  fact_recall_gap: {
    skill: "זיכוי עובדה מהשיעור",
    suggestedQuestionType: "science_fact_one_line_recall",
    reasonHe: "שאלה קצרה עם תשובה אחת מהודקת מהחומר הנלמד.",
  },
  cause_effect_gap: {
    skill: "קשר סיבה–תוצאה",
    suggestedQuestionType: "science_cause_effect_pair",
    reasonHe: "לבחור מה רושם מהגורם ומה מהתוצאה במצב פשוט.",
  },
  classification_error: {
    skill: "סיווג לפי קריטריון אחד",
    suggestedQuestionType: "science_single_criterion_sort",
    reasonHe: "לאכלס קבוצה קטנה ולבקש סיווג לפי תכונה אחת ברורה.",
  },
  place_value_error: {
    skill: "ערך מקומי של ספרה",
    suggestedQuestionType: "place_value_digit_value",
    reasonHe: "לבודד את ערך המקום של ספרה אחת במספר בתרגיל קצר.",
  },
  multiplication_fact_gap: {
    skill: "עובדות טבלת כפל",
    suggestedQuestionType: "multiplication_fact_check",
    reasonHe: "שאלת כפל ישיר קצרה מתוך טבלת הכפל.",
  },
  /** Geometry-only slip tag (infer-tags emits this instead of generic calculation_slip for geometry). */
  geometry_calculation_slip: {
    skill: "בחירת נוסחה או שלב ראשון בגאומטריה",
    suggestedQuestionType: "geometry_formula_choice",
    reasonHe: "לבחור נוסחה או צעד ראשון מתאים לפני חישוב מספרי.",
  },
  prerequisite_gap: {
    skill: "מושג מקדים",
    suggestedQuestionType: "geometry_concept_minimal_contrast",
    reasonHe: "לחזק מושג בסיס לפני המשך.",
  },
  spelling_pattern_error: {
    skill: "איות בהקשר קצר",
    suggestedQuestionType: "english_vocab_in_context_cloze",
    reasonHe: "להשלים מילה במשפט עם הקשר ברור.",
  },
  present_simple_3rd_singular_error: {
    skill: "הטיית פועל בגוף שלישי בזמן הווה פשוט",
    suggestedQuestionType: "english_subject_verb_agreement_short",
    reasonHe: "לבודד משפטים קצרים עם he/she/it ולבחור צורת פועל מתאימה.",
  },
  past_tense_form_error: {
    skill: "צורת עבר פשוט",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבחור זוגות מינימליים עבר/הווה עם אותו שורש.",
  },
  progressive_aspect_error: {
    skill: "הווה מתמשך (am/is/are + V-ing)",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבדוק בחירה בין פעולה מתמשכת לבין זמן פשוט.",
  },
  question_word_order_error: {
    skill: "סדר מילים בשאלה",
    suggestedQuestionType: "english_question_frame_word_order",
    reasonHe: "לבודד משפטי שאלה קצרים עם do/does/is/are במקום הנכון.",
  },
  modal_verb_error: {
    skill: "פועלי עזר (can/must/should)",
    suggestedQuestionType: "english_modal_minimal_pair",
    reasonHe: "לבחור בין שני פועלי עזר במשפט קצר עם אותו פועל ראשי.",
  },
  quantifier_choice_error: {
    skill: "כמותיות (some/many/much)",
    suggestedQuestionType: "english_quantifier_minimal_pair",
    reasonHe: "להבחין בין כמות ספירה לבין כמות לא ספירה במשפט קצר.",
  },
  comparative_form_error: {
    skill: "צורת השוואה",
    suggestedQuestionType: "english_comparative_form_short",
    reasonHe: "לבחור -er/-est או more/most במשפט קצר.",
  },
  future_form_error: {
    skill: "עתיד (will / going to)",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבחור בין will ל-going to בהקשר ברור.",
  },
  perfect_aspect_error: {
    skill: "זמנים מורכבים (have/had + V3)",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבדוק צורת perfect מול זמן פשוט באותו הקשר.",
  },
  conditional_clause_error: {
    skill: "משפט תנאי",
    suggestedQuestionType: "english_conditional_clause_short",
    reasonHe: "לבודד if/when עם צורת פועל מתאימה בגוף אחד.",
  },
  sentence_structure_error: {
    skill: "מבנה משפט",
    suggestedQuestionType: "english_subject_verb_agreement_short",
    reasonHe: "לבודד משפטים קצרים עם סדר מילים וצורת פועל עקביים.",
  },
  advanced_grammar_error: {
    skill: "דקדוק מתקדם",
    suggestedQuestionType: "english_subject_verb_agreement_short",
    reasonHe: "לבודד משפט אחד עם דפוס דקדוקי ברור לבדיקה.",
  },
  place_identification_error: {
    skill: "זיהוי מקום/יישוב",
    suggestedQuestionType: "moledet_place_identification_short",
    reasonHe: "שאלה קצרה על מיקום או סוג יישוב מהחומר.",
  },
};

/** Shared fallback when only generic grammar_pattern_error is inferred. */
const EN_GRAMMAR_PROBE_FALLBACK = {
  skill: "התאמת צורת הפועל לנושא",
  suggestedQuestionType: "english_subject_verb_agreement_short",
  reasonHe: "לבודד משפטים קצרים עם נושא יחיד/רבים והטיית פועל מתאימה.",
};

/** @type {Record<string, ProbeHint>} */
export const PROBE_BY_DIAGNOSTIC_SKILL_ID = {
  math_frac_same_den: {
    skill: "חיבור/חיסור שברים עם מכנה זהה",
    suggestedQuestionType: "fraction_same_den_twice",
    reasonHe: "לוודא יציבות במונה כשהמכנה כבר משותף.",
  },
  math_frac_common_denominator: {
    skill: "מציאת מכנה משותף לפני חיבור",
    suggestedQuestionType: "fraction_common_denominator_only",
    reasonHe:
      "לבדוק קודם כל שלב מציאת מכנה משותף בלי לדלג ישר לתוצאה הסופית.",
  },
  en_grammar_be_present: {
    skill: "הטיות be עם נושא",
    suggestedQuestionType: "english_be_agreement_gate",
    reasonHe: "לבודד משפטים עם I/he/they ולבחור צורת be מתאימה.",
  },
  en_grammar_present_simple: {
    skill: "הווה פשוט - התאמת נושא לפועל",
    suggestedQuestionType: "english_subject_verb_agreement_short",
    reasonHe: "לבודד משפטים קצרים עם he/she/it ולבחור צורת פועל מתאימה.",
  },
  en_grammar_past_simple: {
    skill: "עבר פשוט",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבחור זוגות מינימליים עבר/הווה עם אותו שורש.",
  },
  en_grammar_progressive: {
    skill: "הווה מתמשך",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבדוק בחירה בין פעולה מתמשכת לבין זמן פשוט.",
  },
  en_grammar_question_frames: {
    skill: "מסגרות שאלה",
    suggestedQuestionType: "english_question_frame_word_order",
    reasonHe: "לבודד משפטי שאלה קצרים עם do/does/is/are במקום הנכון.",
  },
  en_grammar_modals: {
    skill: "פועלי עזר",
    suggestedQuestionType: "english_modal_minimal_pair",
    reasonHe: "לבחור בין שני פועלי עזר במשפט קצר.",
  },
  en_grammar_quantifiers: {
    skill: "כמותיות",
    suggestedQuestionType: "english_quantifier_minimal_pair",
    reasonHe: "להבחין בין some/many/much במשפט קצר.",
  },
  en_grammar_comparatives: {
    skill: "השוואה",
    suggestedQuestionType: "english_comparative_form_short",
    reasonHe: "לבחור צורת השוואה במשפט קצר.",
  },
  en_grammar_future_forms: {
    skill: "עתיד",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבחור בין will ל-going to בהקשר ברור.",
  },
  en_grammar_complex_tenses: {
    skill: "זמנים מורכבים",
    suggestedQuestionType: "english_tense_minimal_pair",
    reasonHe: "לבדוק perfect מול זמן פשוט באותו הקשר.",
  },
  en_grammar_conditionals: {
    skill: "תנאי",
    suggestedQuestionType: "english_conditional_clause_short",
    reasonHe: "לבודד if/when עם צורת פועל מתאימה.",
  },
  /** phase29 standard/advanced: intentional generic grammar probe (no separate UI type). */
  en_grammar_phase29_standard: EN_GRAMMAR_PROBE_FALLBACK,
  en_grammar_phase29_advanced: {
    ...EN_GRAMMAR_PROBE_FALLBACK,
    skill: "דקדוק מתקדם - שלב ביניים",
    reasonHe: "לבודד משפט אחד עם דפוס דקדוקי ברור לבדיקה.",
  },
  he_comp_explicit_detail: {
    skill: "שליפת פרט מפורש מטקסט קצר",
    suggestedQuestionType: "hebrew_explicit_detail_one_line",
    reasonHe: "פסקה קצרה ושאלה שמצביעה על משפט מסוים.",
  },
  sci_body_fact_recall: {
    skill: "זיכוי עובדת גוף/מערכות",
    suggestedQuestionType: "science_fact_single_choice",
    reasonHe: "שאלת עובדה אחת מהודקת מהחומר על האיבר או המערכת.",
  },
  sci_respiration_concept: {
    skill: "תפקיד מערכת הנשימה בחילוף גזים",
    suggestedQuestionType: "science_concept_minimal_contrast",
    reasonHe: "להבדיל בין הובלת דם לבין חילוף חמצן/פחמן דוחמצני מול האוויר.",
  },
  moledet_geo_homeland: {
    skill: "מולדת - עובדות בסיס",
    suggestedQuestionType: "moledet_fact_one_line_recall",
    reasonHe: "שאלת עובדה קצרה על ארץ ישראל/יישובים.",
  },
  moledet_geo_community: {
    skill: "קהילה - תפקידים ומוסדות",
    suggestedQuestionType: "moledet_fact_one_line_recall",
    reasonHe: "שאלה קצרה על חיי קהילה מהחומר.",
  },
  moledet_geo_citizenship: {
    skill: "אזרחות - יסודות",
    suggestedQuestionType: "moledet_concept_minimal_contrast",
    reasonHe: "להבחין בין שני מושגי אזרחות במשפט קצר.",
  },
  moledet_geo_geography: {
    skill: "גאוגרפיה - נוף ואקלים",
    suggestedQuestionType: "moledet_fact_one_line_recall",
    reasonHe: "שאלת עובדה על נוף/אקלים/יישובים.",
  },
  moledet_geo_values: {
    skill: "ערכים וזהות",
    suggestedQuestionType: "moledet_fact_one_line_recall",
    reasonHe: "שאלה קצרה על ערך או מסורת מהשיעור.",
  },
  moledet_geo_maps: {
    skill: "קריאת מפה",
    suggestedQuestionType: "moledet_map_reading_short",
    reasonHe: "שאלת מפה קצרה עם קנה מידה או כיוון ברור.",
  },
};

/**
 * @param {object} p
 * @param {string} [p.dominantTag]
 * @param {string|null} [p.dominantDiagnosticSkillId]
 */
export function resolveProbeHintFromMap({ dominantTag, dominantDiagnosticSkillId }) {
  const tag = dominantTag ? String(dominantTag) : "";
  const sid = dominantDiagnosticSkillId ? String(dominantDiagnosticSkillId) : "";
  if (tag && PROBE_BY_ERROR_TAG[tag]) return PROBE_BY_ERROR_TAG[tag];
  if (sid && PROBE_BY_DIAGNOSTIC_SKILL_ID[sid]) return PROBE_BY_DIAGNOSTIC_SKILL_ID[sid];
  return null;
}
