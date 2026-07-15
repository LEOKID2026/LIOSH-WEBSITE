/**
 * Parent-facing Hebrew for internal error/pattern keys — never show raw snake_case to parents.
 */

/** Section heading for topic-card home actions (product copy). */
export const PARENT_TOPIC_HOME_ACTION_HEADING_HE = "מה כדאי לעשות ביחד";

export const PARENT_ERROR_PATTERN_LABEL_HE = Object.freeze({
  procedural_error: "הילד בוחר דרך פתרון שלא מתאימה לשאלה",
  procedure_break: "בלבול בסדר הפעולות או בשלבי הפתרון",
  calculation_error: "הטעות נובעת מחישוב או מסדר פעולות",
  conceptual_error: "נראה שיש בלבול ביסודי בחומר",
  conceptual_misunderstanding: "נראה שיש בלבול ביסודי בחומר",
  strategy_gap: "הילד לא תמיד בוחר את האסטרטגיה המתאימה לשאלה",
  prerequisite_gap: "אולי חסר בסיס קטן שכדאי לחזק לפני שממשיכים",
  reading_comprehension_issue: "ייתכן שהקושי קשור להבנת השאלה או הטקסט",
  vocabulary_gap: "ייתכן שחסרות מילים או מונחים שמקשים על הפתרון",
  phonics_gap: "ייתכן שהקושי קשור לקריאה ולפיענוח האותיות",
  inference_gap: "ייתכן שהקושי קשור להסקת מסקנות מהמידע",
  speed_pressure: "חלק מהטעויות נראות קשורות למהירות",
  careless_or_attention: "נראות טעויות ביצוע קטנות שחוזרות כשממהרים",
  guessing_or_unstable: "התשובות נראות פחות יציבות ולפעמים מנומסות",
  careless_error: "נראות טעויות ביצוע קטנות שחוזרות כשממהרים",
  careless_pattern: "נראות טעויות ביצוע קטנות שחוזרות כשממהרים",
  operation_selection_error: "הילד לא תמיד בוחר את הפעולה המתאימה לשאלה",
  place_value_error: "ייתכן שיש בלבול בערך המקומי של הספרות",
  fraction_concept_error: "ייתכן שיש בלבול ביסודי בנושא השברים",
  word_problem_reading: "ייתכן שהקושי קשור להבנת ניסוח השאלה",
  instruction_misread: "חלק מהטעויות נראות קשורות להבנת ההוראה",
  support_dependent_success: "הצלחה בעיקר כשיש ליווי או רמזים",
  recurring_weakness: "חלק מהטעויות חוזרות באותו סוג פעילות",
  speed_driven_error: "חלק מהטעויות הופיעו בזמן עבודה מהיר",
});

export const PARENT_ERROR_PATTERN_MEANING_HE = Object.freeze({
  procedural_error:
    "נראה שהקושי הוא בבחירת דרך הפתרון: הילד יודע חלק מהחומר, אבל לא תמיד בוחר את הצעד המתאים לשאלה.",
  procedure_break:
    "נראה שיש בלבול בסדר הפעולות או בשלבי הפתרון, ולכן כדאי לעבור יחד על הדרך צעד אחר צעד.",
  calculation_error:
    "נראה שהקושי חוזר בשלב החישוב או בסדר הפעולות, ולכן כדאי לפרק את התרגיל לשלבים קטנים.",
  conceptual_error:
    "נראה שיש בלבול ביסודי בחומר, לא רק טעות חד-פעמית בחישוב.",
  conceptual_misunderstanding:
    "נראה שיש בלבול ביסודי בחומר, לא רק טעות חד-פעמית בחישוב.",
  strategy_gap:
    "נראה שהקושי הוא בבחירת דרך הפתרון, לא בהכרח בחוסר ידע מלא.",
  prerequisite_gap:
    "ייתכן שחסר בסיס קטן שכדאי לחזק לפני שממשיכים לנושאים קשים יותר.",
  reading_comprehension_issue:
    "ייתכן שהקושי קשור להבנת השאלה או הטקסט, ולא רק לחישוב או לזכירה.",
  vocabulary_gap:
    "ייתכן שחסרות מילים או מונחים שמקשים על הילד להבין מה נשאל.",
  speed_pressure:
    "חלק מהטעויות נראות קשורות למהירות - כדאי לעבור על השאלה בקצב רגוע יותר.",
  careless_or_attention:
    "נראה שהחומר מוכר בחלקו, אבל יש טעויות ביצוע שחוזרות כשממהרים.",
  guessing_or_unstable:
    "התשובות נראות פחות יציבות, ולכן כדאי לבדוק יחד את דרך הפתרון ולא רק את התוצאה.",
});

/**
 * @param {string|null|undefined} label
 */
export function isTechnicalEnglishPatternKey(label) {
  const raw = String(label || "").trim();
  if (!raw || /[\u0590-\u05FF]/.test(raw)) return false;
  if (/^(pf|k|to|st|ct):/i.test(raw)) return true;
  if (/^default_[a-z0-9_]+$/i.test(raw)) return true;
  return /^[a-z][a-z0-9_]*$/i.test(raw);
}

/**
 * @param {string|null|undefined} label
 */
export function parentFacingErrorPatternLabelHe(label) {
  const key = String(label || "").trim().toLowerCase();
  if (!key) return "";
  return PARENT_ERROR_PATTERN_LABEL_HE[key] || "";
}

/**
 * @param {string|null|undefined} label
 */
export function parentFacingErrorPatternMeaningHe(label) {
  const key = String(label || "").trim().toLowerCase();
  if (!key) return "";
  if (PARENT_ERROR_PATTERN_MEANING_HE[key]) return PARENT_ERROR_PATTERN_MEANING_HE[key];
  const short = parentFacingErrorPatternLabelHe(label);
  if (short) return `נראה שהקושי קשור לכך ש${short.charAt(0).toLowerCase()}${short.slice(1)}.`;
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
