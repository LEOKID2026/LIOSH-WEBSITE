/**
 * Owner-authored topic-level Hebrew copy — Phase B+C+D (templateId + slots only).
 */

/** @typedef {{
 *   topicName: string,
 *   subjectName: string,
 *   questions: number,
 *   correct: number,
 *   wrong: number,
 *   accuracy: number,
 *   detectedPattern: string|null,
 *   affectedSubskill: string|null,
 *   misconceptionLabel: string|null,
 *   recommendedAction: string|null,
 *   evidenceStrength: string,
 *   decisionCode: string,
 *   baseTemplateId: string,
 *   narrativeEnvelope: string|null,
 * }} TopicOwnerCopySlots */

/** @param {unknown} v */
function str(v) {
  return v != null ? String(v).trim() : "";
}

/** @param {TopicOwnerCopySlots} s */
function hasPattern(s) {
  return !!str(s.detectedPattern);
}

/** @param {TopicOwnerCopySlots} s */
function hasSubskill(s) {
  return !!str(s.affectedSubskill);
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedBase(s) {
  const tn = s.topicName;
  if (s.decisionCode === "clear_topic_gap") {
    if (hasPattern(s)) {
      return `בנושא ${tn} נראה קושי ברור. נפתרו ${s.questions} שאלות, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות, והדיוק עומד על ${s.accuracy}%. בנוסף זוהה דפוס שחוזר בטעויות: ${s.detectedPattern}. כדאי לחזק את הנושא לפני שממשיכים.`;
    }
    return `בנושא ${tn} נראה קושי ברור. נפתרו ${s.questions} שאלות, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות, והדיוק עומד על ${s.accuracy}%. כדאי לחזק את הנושא לפני שממשיכים.`;
  }
  if (hasPattern(s)) {
    return `בנושא ${tn} יש צורך בחיזוק ממוקד. נפתרו ${s.questions} שאלות, הדיוק עומד על ${s.accuracy}%, וזוהה דפוס שחוזר בטעויות: ${s.detectedPattern}.`;
  }
  return `בנושא ${tn} יש צורך בחיזוק ממוקד. נפתרו ${s.questions} שאלות, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות, והדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedIdentified(s) {
  if (hasPattern(s)) {
    return `מה זוהה: בנושא ${s.topicName} זוהה דפוס שחוזר בטעויות: ${s.detectedPattern}.`;
  }
  return `מה זוהה: בנושא ${s.topicName} יש קושי ברור לפי מספר השאלות והדיוק.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedData(s) {
  return `הנתונים: נפתרו ${s.questions} שאלות בנושא ${s.topicName}, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות. הדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedPattern(s) {
  if (!hasPattern(s)) return "";
  if (hasSubskill(s)) {
    return `דפוס הטעות: ${s.detectedPattern}. נקודת המיקוד היא ${s.affectedSubskill}.`;
  }
  return `דפוס הטעות: ${s.detectedPattern}.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedMeaning(s) {
  if (s.decisionCode === "clear_topic_gap") {
    return `משמעות: זה לא נראה כמו טעות חד־פעמית. כדאי לחזור לבסיס של ${s.topicName}, לוודא שהדרך מובנת, ורק אחר כך להמשיך הלאה.`;
  }
  return `משמעות: יש הבנה חלקית בנושא, אבל הדיוק עדיין לא יציב מספיק. כדאי לחזק את ${s.topicName} בצורה ממוקדת לפני שמעלים רמת קושי.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedHomeAction(s) {
  if (hasPattern(s)) {
    return `מה כדאי לעשות ביחד: לתרגל 5–8 שאלות קצרות בנושא ${s.topicName}, להתמקד בדפוס שזוהה (${s.detectedPattern}), ולבקש מהילד להסביר בקול את דרך הפתרון.`;
  }
  return `מה כדאי לעשות ביחד: לתרגל 5–8 שאלות קצרות בנושא ${s.topicName}, לעצור אחרי כל טעות, ולבקש מהילד להסביר בקול איך הגיע לתשובה.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedStepLabel(s) {
  if (s.decisionCode === "clear_topic_gap") return "חזרה לבסיס וחיזוק ממוקד";
  return "חיזוק ממוקד באותה רמה";
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedInterventionPlan(s) {
  if (hasPattern(s)) {
    return `בשבוע הקרוב מומלץ להתמקד ב${s.topicName} באותה רמת קושי. התחילו בשאלות קצרות, בדקו במיוחד את הדפוס שחוזר בטעויות (${s.detectedPattern}), ורק אחרי שיפור בדיוק עברו לשאלות מורכבות יותר.`;
  }
  return `בשבוע הקרוב מומלץ להתמקד ב${s.topicName} באותה רמת קושי. התחילו בשאלות קצרות, בדקו את דרך הפתרון, ורק אחרי שיפור בדיוק עברו לשאלות מורכבות יותר.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedDoNow(s) {
  if (hasPattern(s)) {
    return `היום כדאי לפתור יחד 5 שאלות בנושא ${s.topicName}. אחרי כל שאלה בקשו מהילד להסביר את הדרך, ושימו לב במיוחד לדפוס: ${s.detectedPattern}.`;
  }
  return `היום כדאי לפתור יחד 5 שאלות בנושא ${s.topicName}. אחרי כל שאלה בקשו מהילד להסביר את הדרך, ולא רק לסמן תשובה.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedBase(s) {
  return `בנושא ${s.topicName} נראית הצלחה טובה. נפתרו ${s.questions} שאלות, מתוכן ${s.correct} נכונות, והדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedIdentified(s) {
  return `מה זוהה: בנושא ${s.topicName} נראית הצלחה טובה בשאלות שנפתרו.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedData(s) {
  return `הנתונים: נפתרו ${s.questions} שאלות בנושא ${s.topicName}, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות. הדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedMeaning(s) {
  return "משמעות: הנושא נראה יציב יחסית כרגע. כדאי לשמר את ההצלחה עם תרגול קצר מדי פעם.";
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedHomeAction(s) {
  return `מה כדאי לעשות ביחד: לפתור כמה שאלות קצרות בנושא ${s.topicName}, בעיקר כדי לשמור על רצף וביטחון.`;
}

/** @param {TopicOwnerCopySlots} _s */
function renderPositiveObservedStepLabel(_s) {
  return "שימור וחיזוק קל";
}

/** @param {TopicOwnerCopySlots} _s */
function renderPositiveObservedCaution(_s) {
  return "גם כשנראית הצלחה, כדאי לשמור על תרגול קצר מדי פעם כדי לוודא שהנושא נשאר יציב.";
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataBase(s) {
  return `בנושא ${s.topicName} נפתרו ${s.questions} שאלות בלבד. זה מידע ראשוני, ועדיין לא מספיק כדי לזהות דפוס ברור.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataIdentified(s) {
  return `מה זוהה: יש כרגע מידע ראשוני בלבד בנושא ${s.topicName}.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataData(s) {
  return `הנתונים: נפתרו ${s.questions} שאלות בנושא ${s.topicName}, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות.`;
}

/** @param {TopicOwnerCopySlots} _s */
function renderInitialTopicDataMeaning(_s) {
  return "משמעות: עדיין מוקדם להסיק מסקנה ברורה. כדאי לאסוף עוד כמה שאלות לפני שמחליטים אם צריך חיזוק.";
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataHomeAction(s) {
  return `מה כדאי לעשות ביחד: לפתור עוד כמה שאלות קצרות בנושא ${s.topicName}, בלי לחץ, כדי לקבל תמונה ברורה יותר.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusBase(s) {
  return `בנושא ${s.topicName} יש כמה טעויות, אבל כמות השאלות עדיין קטנה. כדאי לתרגל מעט יותר כדי להבין אם זה דפוס חוזר.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusIdentified(s) {
  return `מה זוהה: היו כמה טעויות בנושא ${s.topicName}, אך עדיין אין מספיק מידע לדפוס ברור.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusData(s) {
  return `הנתונים: נפתרו ${s.questions} שאלות בנושא ${s.topicName}, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות. הדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} _s */
function renderPracticeFocusMeaning(_s) {
  return "משמעות: כדאי להוסיף תרגול קצר ולבדוק אם הטעויות חוזרות באותו סוג שאלות.";
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedBase(s) {
  if (hasPattern(s)) {
    return `בנושא ${s.topicName} יש תמונה מעורבת. מצד אחד יש לא מעט תשובות נכונות, ומצד שני חוזר דפוס טעות: ${s.detectedPattern}.`;
  }
  return `בנושא ${s.topicName} יש תמונה מעורבת. יש הצלחות, אבל גם טעויות שמראות שכדאי לחזק את הנושא.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedIdentified(s) {
  if (hasPattern(s)) {
    return `מה זוהה: בנושא ${s.topicName} יש הצלחות לצד דפוס טעות שחוזר: ${s.detectedPattern}.`;
  }
  return `מה זוהה: בנושא ${s.topicName} יש הצלחות לצד טעויות שדורשות חיזוק.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedData(s) {
  return `הנתונים: נפתרו ${s.questions} שאלות בנושא ${s.topicName}, מתוכן ${s.correct} נכונות ו-${s.wrong} שגויות. הדיוק עומד על ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedPattern(s) {
  if (!hasPattern(s)) return "";
  if (hasSubskill(s)) {
    return `דפוס הטעות: ${s.detectedPattern}. נקודת המיקוד היא ${s.affectedSubskill}.`;
  }
  return `דפוס הטעות: ${s.detectedPattern}.`;
}

/** @param {TopicOwnerCopySlots} _s */
function renderMixedMeaning(_s) {
  return "משמעות: יש בסיס טוב, אבל הנושא עדיין לא יציב לגמרי. כדאי לחזק נקודתית את המקומות שבהם חוזרות טעויות.";
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedHomeAction(s) {
  return `מה כדאי לעשות ביחד: לבחור 5–8 שאלות בנושא ${s.topicName}, לערבב שאלות קלות ובינוניות, ולבקש מהילד להסביר את הדרך בכל טעות.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe0Snapshot(s) {
  const tn = s.topicName;
  if (s.decisionCode === "early_direction_only") {
    return `ב${tn} נאספו ${s.questions} שאלות, עם דיוק של ${s.accuracy}%. זה כיוון ראשוני בלבד, ולכן כדאי להמשיך לתרגל מעט לפני שמסיקים מסקנה חזקה.`;
  }
  if (s.decisionCode === "clear_topic_gap") {
    return `ב${tn} נאספו ${s.questions} שאלות, עם דיוק של ${s.accuracy}%. לפי הנתונים נראה שיש קושי ברור בנושא, ולכן כדאי לחזק אותו לפני שממשיכים.`;
  }
  return "";
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe0Caution(s) {
  if (s.decisionCode === "early_direction_only") {
    return "זה עדיין מידע ראשוני — כדאי להוסיף עוד כמה שאלות ולבדוק אם הכיוון נשמר.";
  }
  if (s.decisionCode === "clear_topic_gap") {
    return "כאן כבר לא מדובר רק במידע ראשוני; כדאי לחזור ולחזק את הנושא בצורה ממוקדת.";
  }
  return "";
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe1Snapshot(s) {
  const tn = s.topicName;
  if (hasPattern(s)) {
    return `ב${tn} נאספו ${s.questions} שאלות, עם דיוק של ${s.accuracy}%. זוהה דפוס שחוזר בטעויות: ${s.detectedPattern}, ולכן כדאי לחזק את הנושא בצורה ממוקדת.`;
  }
  return `ב${tn} נאספו ${s.questions} שאלות, עם דיוק של ${s.accuracy}%. הנתונים מצביעים על צורך בחיזוק ממוקד בנושא.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe2Snapshot(s) {
  const tn = s.topicName;
  if (hasPattern(s)) {
    return `ב${tn} יש מספיק תרגול כדי לראות כיוון ברור. נפתרו ${s.questions} שאלות, הדיוק עומד על ${s.accuracy}%, וזוהה דפוס שחוזר בטעויות: ${s.detectedPattern}.`;
  }
  return `ב${tn} יש מספיק תרגול כדי לראות כיוון ברור. נפתרו ${s.questions} שאלות, והדיוק עומד על ${s.accuracy}%. כדאי לחזק את הנושא לפני שמעלים רמת קושי.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe2Caution(s) {
  if (hasPattern(s)) {
    return `כדאי לבדוק אחרי עוד תרגול קצר אם הדפוס (${s.detectedPattern}) ממשיך להופיע או מתחיל להיעלם.`;
  }
  return "כדאי לבדוק אחרי עוד תרגול קצר אם הדיוק משתפר והנושא נהיה יציב יותר.";
}

/** @type {Record<string, (s: TopicOwnerCopySlots) => string>} */
export const parentReportOwnerTopicCopyTemplatesHe = Object.freeze({
  difficulty_observed: renderDifficultyObservedBase,
  "difficulty_observed:TOPIC_EXPLAIN_IDENTIFIED": renderDifficultyObservedIdentified,
  "difficulty_observed:TOPIC_EXPLAIN_DATA": renderDifficultyObservedData,
  "difficulty_observed:TOPIC_EXPLAIN_PATTERN": renderDifficultyObservedPattern,
  "difficulty_observed:TOPIC_EXPLAIN_MEANING": renderDifficultyObservedMeaning,
  "difficulty_observed:TOPIC_EXPLAIN_HOME_ACTION": renderDifficultyObservedHomeAction,
  "difficulty_observed:RECOMMENDATION_STEP_LABEL": renderDifficultyObservedStepLabel,
  "difficulty_observed:RECOMMENDATION_FINDING": renderDifficultyObservedBase,
  "difficulty_observed:RECOMMENDATION_INTERVENTION_PLAN": renderDifficultyObservedInterventionPlan,
  "difficulty_observed:RECOMMENDATION_DO_NOW": renderDifficultyObservedDoNow,
  positive_observed: renderPositiveObservedBase,
  "positive_observed:TOPIC_EXPLAIN_IDENTIFIED": renderPositiveObservedIdentified,
  "positive_observed:TOPIC_EXPLAIN_DATA": renderPositiveObservedData,
  "positive_observed:TOPIC_EXPLAIN_MEANING": renderPositiveObservedMeaning,
  "positive_observed:TOPIC_EXPLAIN_HOME_ACTION": renderPositiveObservedHomeAction,
  "positive_observed:RECOMMENDATION_STEP_LABEL": renderPositiveObservedStepLabel,
  "positive_observed:RECOMMENDATION_FINDING": renderPositiveObservedBase,
  "positive_observed:RECOMMENDATION_CAUTION": renderPositiveObservedCaution,
  initial_topic_data: renderInitialTopicDataBase,
  "initial_topic_data:TOPIC_EXPLAIN_IDENTIFIED": renderInitialTopicDataIdentified,
  "initial_topic_data:TOPIC_EXPLAIN_DATA": renderInitialTopicDataData,
  "initial_topic_data:TOPIC_EXPLAIN_MEANING": renderInitialTopicDataMeaning,
  "initial_topic_data:TOPIC_EXPLAIN_HOME_ACTION": renderInitialTopicDataHomeAction,
  practice_focus: renderPracticeFocusBase,
  "practice_focus:TOPIC_EXPLAIN_IDENTIFIED": renderPracticeFocusIdentified,
  "practice_focus:TOPIC_EXPLAIN_DATA": renderPracticeFocusData,
  "practice_focus:TOPIC_EXPLAIN_MEANING": renderPracticeFocusMeaning,
  mixed: renderMixedBase,
  "mixed:TOPIC_EXPLAIN_IDENTIFIED": renderMixedIdentified,
  "mixed:TOPIC_EXPLAIN_DATA": renderMixedData,
  "mixed:TOPIC_EXPLAIN_PATTERN": renderMixedPattern,
  "mixed:TOPIC_EXPLAIN_MEANING": renderMixedMeaning,
  "mixed:TOPIC_EXPLAIN_HOME_ACTION": renderMixedHomeAction,
  NARRATIVE_WE0_snapshot: renderNarrativeWe0Snapshot,
  NARRATIVE_WE0_cautionLineHe: renderNarrativeWe0Caution,
  NARRATIVE_WE1_snapshot: renderNarrativeWe1Snapshot,
  NARRATIVE_WE2_snapshot: renderNarrativeWe2Snapshot,
  NARRATIVE_WE2_cautionLineHe: renderNarrativeWe2Caution,
});

/**
 * @param {string} templateId
 * @param {TopicOwnerCopySlots|null|undefined} slots
 * @returns {string|null}
 */
export function renderOwnerTopicCopyTemplateHe(templateId, slots) {
  const id = str(templateId);
  if (!id || !slots) return null;
  const fn = parentReportOwnerTopicCopyTemplatesHe[id];
  if (!fn) return null;
  const text = str(fn(slots));
  return text || null;
}

export const TOPIC_EXPLAIN_SECTION_TEMPLATE_SUFFIX = Object.freeze({
  identified: "TOPIC_EXPLAIN_IDENTIFIED",
  data: "TOPIC_EXPLAIN_DATA",
  pattern: "TOPIC_EXPLAIN_PATTERN",
  meaning: "TOPIC_EXPLAIN_MEANING",
  action: "TOPIC_EXPLAIN_HOME_ACTION",
});

/**
 * @param {string} baseTemplateId
 * @param {keyof typeof TOPIC_EXPLAIN_SECTION_TEMPLATE_SUFFIX} section
 */
export function topicExplainTemplateId(baseTemplateId, section) {
  const base = str(baseTemplateId);
  const suffix = TOPIC_EXPLAIN_SECTION_TEMPLATE_SUFFIX[section];
  if (!base || !suffix) return base;
  return `${base}:${suffix}`;
}

/**
 * @param {string} envelope e.g. WE0
 * @param {"snapshot"|"cautionLineHe"} section
 */
export function narrativeOwnerTemplateId(envelope, section) {
  const env = str(envelope).toUpperCase();
  if (!env) return "";
  return `NARRATIVE_${env}_${section}`;
}
