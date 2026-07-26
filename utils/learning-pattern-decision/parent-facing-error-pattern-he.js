/**
 * Parent-facing Hebrew for internal error/pattern keys — never show raw snake_case to parents.
 * Proven classifier tags use FACTUAL noun phrases (what appeared in the answer).
 */

import { normalizeToCanonicalTag } from "../../lib/learning/taxonomy-tag-normalizer.js";

/** Section heading for topic-card home actions (product copy). */
export const PARENT_TOPIC_HOME_ACTION_HEADING_HE = "מה כדאי לעשות ביחד";

/**
 * Factual labels for 93 classifier-proven tags (+ aliases sharing canonical wording).
 * Describes what appeared in the answer — not why the child erred.
 */
export const PROVEN_FACTUAL_PARENT_LABEL_HE = Object.freeze({
  omitted_addend: "חיבור שני מחוברים בלבד מתוך שלושה",
  add_instead_of_sub: "חיבור במקום חיסור",
  mul_instead_of_add: "כפל במקום חיבור",
  sub_instead_of_add: "חיסור במקום חיבור",
  add_instead_of_mul: "חיבור במקום כפל",
  mul_instead_of_div: "כפל במקום חילוק",
  math_decimal_place_shift_error: "הזזת הנקודה העשרונית למקום שגוי",
  math_percentage_base_error: "שימוש שגוי באחוז, בשלם או בחלק",
  math_equation_inverse_error: "שימוש בפעולה הפוכה במשוואה",
  rounding_wrong_direction: "עיגול בכיוון שגוי",
  wrong_operation_wp: "פעולה חשבונית שגויה בבעיית מילים",
  unit_error: "יחידת מידה שגויה",
  place_value_error: "ערך מקום שאינו תואם לתשובה הנכונה",
  calculation_off_by_one: "טעות חישוב של סטייה ב-1",
  calculation_near_miss: "חישוב עם סטייה קטנה מהתשובה",
  carry_error: "טעות בנשיאה בחיבור",
  regroup_error: "טעות בנשיאה בחיבור",
  column_carry_error: "טעות בנשיאה בחיבור",
  borrow_error: "טעות בהלוואה בחיסור",
  multiplication_fact_error: "תשובה שגויה מלוח הכפל",
  numerator_only_compare: "השוואת שברים לפי המונה בלבד",
  mirror_error: "פעולה שגויה ביצירת מכנה משותף",
  common_denominator_error: "פעולה שגויה ביצירת מכנה משותף",
  fraction_operation_error: "פעולה שגויה ביצירת מכנה משותף",
  forgot_divide_by_2: "השמטת חילוק ב-2",
  perimeter_area_confusion: "היקף במקום שטח",
  perimeter_formula_error: "נוסחת היקף שגויה",
  volume_formula_error: "נוסחת נפח שגויה",
  area_formula_error: "נוסחת שטח שגויה",
  triangle_angle_sum_error: "סכום זוויות במשולש שאינו תואם",
  pythagorean_relation_error: "חיבור צלעות במקום משפט פיתגורס",
  shape_property_confusion: "תכונת צורה שאינה מתאימה",
  angle_range_error: "קריאת זווית שאינה תואמת",
  transformation_error: "התמרה גיאומטרית שאינה תואמת",
  symmetry_error: "בחירת ציר סימטריה שאינה תואמת",
  spelling_pattern_error: "שגיאת איות בדפוס מילה",
  spelling_error: "שגיאת איות",
  grammar_error: "שגיאה דקדוקית",
  tense_error: "שימוש בזמן דקדוקי שאינו מתאים למשפט",
  agreement_error: "אי-התאמה במין או במספר",
  vocabulary_meaning_error: "מילה במשמעות שאינה מתאימה",
  translation_error: "תרגום שאינו מתאים להקשר",
  preposition_error: "מילת יחס שאינה מתאימה",
  phrasal_verb_error: "צירוף פועל שאינו מתאים",
  sentence_structure_error: "סדר מילים שאינו תואם במשפט",
  phonics_minimal_pair_error: "בחירה בין צלילים דומים שאינה תואמת",
  vocabulary_context_error: "מילה שאינה מתאימה להקשר",
  grammar_agreement_error: "אי-התאמה במין או במספר במשפט",
  reading_comprehension_error: "תשובה שאינה עונה על שאלת ההבנה",
  homophone_confusion: "בחירת מילה שנשמעת דומה אך אינה מתאימה",
  homograph_error: "בחירת מילה שנשמעת דומה אך אינה מתאימה",
  verb_tense_error: "שימוש בזמן הפועל שאינו תואם",
  punctuation_error: "שגיאת פיסוק",
  speaking_expression_error: "ניסוח בעל פה שאינו תואם",
  concept_confusion: "שימוש במושג שאינו מתאים",
  variable_control_error: "שינוי של יותר ממשתנה אחד בניסוי",
  body_system_confusion: "סדר או מיקום שאינו תואם במערכת הגוף",
  material_property_error: "תיאור תכונת חומר שאינו תואם",
  physical_chemical_confusion: "מושג פיזיקלי במקום כימי או להיפך",
  planet_confusion: "זיהוי כוכב לכת או גוף שמימי שאינו תואם",
  ecosystem_confusion: "רמה במערכת אקולוגית שאינה מתאימה",
  animal_classification_error: "סיווג בעל חיים שאינו תואם",
  map_reading_error: "בחירה שגויה בקריאת פרט מהמפה",
  direction_error: "כיוון שאינו תואם בקריאת מפה",
  location_error: "שיוך אזור למיקום גיאוגרפי שאינו תואם",
  citizenship_error: "שיוך שאינו תואם של זכות או חובת אזרחות",
  homeland_identity_error: "שיוך שאינו תואם של סמל או זהות מולדתית",
  landform_confusion: "שיוך אזור לצורת יבשה שאינה מתאימה",
  values_error: "ערך חברתי שאינו מתאים",
  community_error: "שיוך שאינו תואם של תפקיד מוסד קהילתי",
  map_symbol_error: "פרשנות סמל במפה שאינה תואמת",
  historical_concept_error: "מושג היסטורי שאינו מתאים",
  timeline_sequence_error: "סידור אירועים בסדר שאינו נכון",
  cause_effect_error: "קישור סיבה ותוצאה שאינו תואם",
  comparison_error: "השוואה שאינה מדויקת בין אירועים",
  figure_role_confusion: "שיוך דמות לתפקיד שאינו תואם",
  institution_confusion: "שיוך מוסד לתפקיד שאינו תואם",
  culture_heritage_error: "שיוך מורשת תרבותית שאינו תואם",
  source_comprehension_error: "טענה שאינה נתמכת במקור",
  historical_connection_error: "קישור בין עבר להווה שאינו תואם",
  math_compare_relation_error: "סימן השוואה שאינו תואם",
  math_scale_operation_error: "פעולה בקנה מידה שאינה תואמת",
  math_division_operation_error: "פעולת חילוק שאינה תואמת",
  math_remainder_error: "מנה או שארית שאינה תואמת בחילוק",
  math_sequence_step_error: "שלב ברצף מתמטי שאינו תואם",
  math_ratio_order_error: "סדר ביחס מתמטי שאינו תואם",
  math_operation_order_error: "חישוב לפי סדר הכתיבה במקום סדר הפעולות",
  math_divisibility_classification_error: "מסקנה שאינה תואמת מבדיקת התחלקות",
  math_prime_composite_classification_error: "סיווג מספר כראשוני או פריק שאינו תואם",
  math_power_as_multiplication_error: "כפל הבסיס במעריך במקום חישוב חזקה",
  math_identity_property_error: "שימוש בתכונת אפס או אחד שאינו תואם",
  math_estimation_strategy_error: "אומדן במקום תוצאה מדויקת",
  math_gcd_smaller_input_error: "בחירה שאינה תואמת של המחלק המשותף הגדול ביותר",
});

/**
 * Only these classifier-proven keys (and aliases that normalize into them)
 * may enter factualObservations. Legacy pattern-family keys are excluded.
 */
export const FACTUAL_OBSERVATION_APPROVED_TAGS = Object.freeze(
  new Set(Object.keys(PROVEN_FACTUAL_PARENT_LABEL_HE)),
);

/** Legacy learning-pattern family keys — usable for sanitize/display, NOT for factualObservations. */
export const LEGACY_PATTERN_FAMILY_LABEL_HE = Object.freeze({
  procedural_error: "בחירת דרך פתרון שאינה מתאימה לשאלה",
  procedure_break: "סדר פעולות או שלבי פתרון שאינם תואמים",
  calculation_error: "טעות בחישוב או בסדר פעולות",
  conceptual_error: "תשובה שאינה תואמת את המושג הנדרש",
  conceptual_misunderstanding: "תשובה שאינה תואמת את המושג הנדרש",
  strategy_gap: "בחירת אסטרטגיה שאינה מתאימה לשאלה",
  prerequisite_gap: "תשובה שמעידה על פער בחומר קודם",
  reading_comprehension_issue: "תשובה שאינה תואמת את הבנת השאלה או הטקסט",
  vocabulary_gap: "מילה או מונח שאינם מתאימים לשאלה",
  phonics_gap: "פיענוח אותיות או צלילים שאינו תואם",
  inference_gap: "מסקנה שאינה נתמכת במידע שבשאלה",
  speed_pressure: "טעויות שהופיעו בעבודה מהירה",
  careless_or_attention: "טעויות ביצוע קטנות שחזרו",
  guessing_or_unstable: "תשובות משתנות בין ניסיונות",
  careless_error: "טעויות ביצוע קטנות שחזרו",
  careless_pattern: "טעויות ביצוע קטנות שחזרו",
  operation_selection_error: "בחירת פעולה שאינה מתאימה לשאלה",
  fraction_concept_error: "תשובה שאינה תואמת את מושג השבר",
  word_problem_reading: "תשובה שאינה תואמת את ניסוח השאלה",
  instruction_misread: "תשובה שאינה תואמת את ההוראה",
  support_dependent_success: "הצלחה בעיקר עם ליווי או רמזים",
  recurring_weakness: "אותו סוג טעות שחוזר בפעילות",
  speed_driven_error: "טעויות שהופיעו בזמן עבודה מהיר",
});

/** Combined lookup for parentFacingErrorPatternLabelHe (proven + legacy). */
export const PARENT_ERROR_PATTERN_LABEL_HE = Object.freeze({
  ...PROVEN_FACTUAL_PARENT_LABEL_HE,
  ...LEGACY_PATTERN_FAMILY_LABEL_HE,
});

/**
 * @param {string|null|undefined} tag
 */
export function isApprovedFactualObservationTag(tag) {
  const raw = String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/^(mt|pf|st|ct|k|to):/i, "");
  if (!raw) return false;
  if (FACTUAL_OBSERVATION_APPROVED_TAGS.has(raw)) return true;
  const canon = normalizeToCanonicalTag(raw);
  return !!(canon && FACTUAL_OBSERVATION_APPROVED_TAGS.has(canon));
}

export const PARENT_ERROR_PATTERN_MEANING_HE = Object.freeze({
  procedural_error:
    "נראה שהקושי הוא בבחירת דרך הפתרון: הילד יודע חלק מהחומר, אבל לא תמיד בוחר את הצעד המתאים לשאלה.",
  procedure_break:
    "נראה שיש סדר פעולות או שלבי פתרון שאינם תואמים, ולכן כדאי לעבור יחד על הדרך צעד אחר צעד.",
  calculation_error:
    "נראה שהקושי חוזר בשלב החישוב או בסדר הפעולות, ולכן כדאי לפרק את התרגיל לשלבים קטנים.",
  conceptual_error: "נראית תשובה שאינה תואמת את המושג הנדרש, לא רק טעות חד-פעמית בחישוב.",
  conceptual_misunderstanding:
    "נראית תשובה שאינה תואמת את המושג הנדרש, לא רק טעות חד-פעמית בחישוב.",
  strategy_gap: "נראה שהקושי הוא בבחירת דרך הפתרון, לא בהכרח בחוסר ידע מלא.",
  prerequisite_gap: "ייתכן שכדאי לחזק חומר קודם לפני שממשיכים לנושאים קשים יותר.",
  reading_comprehension_issue:
    "ייתכן שהקושי קשור להבנת השאלה או הטקסט, ולא רק לחישוב או לזכירה.",
  vocabulary_gap: "ייתכן שחסרות מילים או מונחים שמקשים על הילד להבין מה נשאל.",
  speed_pressure: "חלק מהטעויות נראות קשורות למהירות - כדאי לעבור על השאלה בקצב רגוע יותר.",
  careless_or_attention: "נראה שהחומר מוכר בחלקו, אבל יש טעויות ביצוע שחוזרות כשממהרים.",
  guessing_or_unstable:
    "התשובות נראות פחות יציבות, ולכן כדאי לבדוק יחד את דרך הפתרון ולא רק את התוצאה.",
});

/**
 * @param {string|null|undefined} label
 */
export function isTechnicalEnglishPatternKey(label) {
  const raw = String(label || "").trim();
  if (!raw || /[\u0590-\u05FF]/.test(raw)) return false;
  if (/^(pf|k|to|st|ct|mt):/i.test(raw)) {
    const stripped = raw.replace(/^(pf|k|to|st|ct|mt):/i, "");
    if (PARENT_ERROR_PATTERN_LABEL_HE[stripped.toLowerCase()]) return false;
    return true;
  }
  if (/^default_[a-z0-9_]+$/i.test(raw)) return true;
  return /^[a-z][a-z0-9_]*$/i.test(raw);
}

/**
 * @param {string|null|undefined} label
 */
export function parentFacingErrorPatternLabelHe(label) {
  const raw = String(label || "").trim().toLowerCase();
  if (!raw) return "";
  if (PARENT_ERROR_PATTERN_LABEL_HE[raw]) return PARENT_ERROR_PATTERN_LABEL_HE[raw];
  const stripped = raw.replace(/^(mt|pf|st|ct|k|to):/i, "");
  if (stripped && PARENT_ERROR_PATTERN_LABEL_HE[stripped]) {
    return PARENT_ERROR_PATTERN_LABEL_HE[stripped];
  }
  return "";
}

/**
 * @param {string|null|undefined} label
 */
export function parentFacingErrorPatternMeaningHe(label) {
  const key = String(label || "").trim().toLowerCase();
  if (!key) return "";
  if (PARENT_ERROR_PATTERN_MEANING_HE[key]) return PARENT_ERROR_PATTERN_MEANING_HE[key];
  const short = parentFacingErrorPatternLabelHe(label);
  if (short) return `נצפתה בתשובות: ${short}.`;
  return "";
}

/**
 * @param {string|null|undefined} label
 */
export function resolveParentFacingPatternLabelHe(label) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  const mapped = parentFacingErrorPatternLabelHe(raw);
  if (mapped) return mapped;
  if (isTechnicalEnglishPatternKey(raw)) return "";
  return raw;
}

/**
 * @param {string|null|undefined} text
 */
export function stripParentTopicSectionPrefixHe(text) {
  return String(text || "")
    .replace(/^מה זה אומר:\s*/u, "")
    .replace(/^מה כדאי לעשות בבית:\s*/u, "")
    .replace(/^מה כדאי לעשות ביחד:\s*/u, "")
    .replace(/^הטעות שחוזרת:\s*/u, "")
    .trim();
}
