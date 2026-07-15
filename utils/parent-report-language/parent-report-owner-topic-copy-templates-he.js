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

function formatQuestionsText(n) {
  const q = Math.max(0, Math.round(Number(n) || 0));
  if (q === 1) return "שאלה אחת";
  return `${q} שאלות`;
}

function formatCorrectText(n) {
  const c = Math.max(0, Math.round(Number(n) || 0));
  if (c === 1) return "תשובה אחת נכונה";
  return `${c} תשובות נכונות`;
}

function formatWrongText(n) {
  const w = Math.max(0, Math.round(Number(n) || 0));
  if (w === 1) return "תשובה אחת שגויה";
  return `${w} תשובות שגויות`;
}

function hasBreakdown(s) {
  const q = Math.max(0, Math.round(Number(s.questions) || 0));
  const c = Math.max(0, Math.round(Number(s.correct) || 0));
  const w = Math.max(0, Math.round(Number(s.wrong) || 0));
  return q > 0 && c + w === q && (c > 0 || w > 0);
}

function hasReliableAccuracy(s) {
  const q = Math.max(0, Math.round(Number(s.questions) || 0));
  if (q <= 0) return false;
  const acc = Math.round(Number(s.accuracy) || 0);
  const c = Math.max(0, Math.round(Number(s.correct) || 0));
  const w = Math.max(0, Math.round(Number(s.wrong) || 0));
  if (acc <= 0 && c === 0 && w === q) return false;
  return Number.isFinite(acc);
}

/** @param {TopicOwnerCopySlots} s */
function renderTopicDataLine(s) {
  const topic = s.topicName;
  const qText = formatQuestionsText(s.questions);
  if (hasBreakdown(s)) {
    let line = `הנתונים: נפתרו ${qText} בנושא ${topic}, מתוכן ${formatCorrectText(s.correct)} ו-${formatWrongText(s.wrong)}.`;
    if (hasReliableAccuracy(s) && s.accuracy > 0) {
      line += ` הדיוק הוא ${s.accuracy}%.`;
    }
    return line;
  }
  if (hasReliableAccuracy(s) && s.accuracy > 0) {
    return `הנתונים: נפתרו ${qText} בנושא ${topic}, והדיוק הוא ${s.accuracy}%.`;
  }
  return `הנתונים: נפתרו ${qText} בנושא ${topic}.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderTopicPatternLine(s) {
  if (!hasPattern(s)) return "";
  return `הטעות שחוזרת: ${s.detectedPattern}.`;
}

/** @param {string} base @param {TopicOwnerCopySlots} s */
function appendPatternToSnapshot(base, s) {
  if (!hasPattern(s)) return base;
  return `${base} הטעות שחוזרת: ${s.detectedPattern}.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedBase(s) {
  const tn = s.topicName;
  const qText = formatQuestionsText(s.questions);
  let base;
  if (s.decisionCode === "clear_topic_gap") {
    base = `ב${tn} כדאי להתמקד עכשיו. נפתרו ${qText}, והדיוק הוא ${s.accuracy}%.`;
  } else {
    base = `ב${tn} יש סימן לנושא שצריך חיזוק. נפתרו ${qText}, והדיוק הוא ${s.accuracy}%.`;
  }
  return appendPatternToSnapshot(base, s);
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedIdentified(s) {
  if (hasPattern(s)) {
    return `מה רואים: ב${s.topicName} יש כמה טעויות שחוזרות סביב אותו רעיון.`;
  }
  return `מה רואים: ב${s.topicName} יש קושי לפי השאלות שנפתרו והדיוק.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedData(s) {
  return renderTopicDataLine(s);
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedPattern(s) {
  return renderTopicPatternLine(s);
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedMeaning(s) {
  if (s.decisionCode === "clear_topic_gap") {
    return `מה זה אומר: כנראה לא מדובר בטעות חד-פעמית. כדאי לחזור לבסיס של ${s.topicName} לפני שממשיכים.`;
  }
  return `מה זה אומר: הילד מצליח בחלק מהשאלות, אבל ${s.topicName} עדיין לא יציב מספיק.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedHomeAction(s) {
  if (hasPattern(s)) {
    return `מה כדאי לעשות ביחד: לפתור 5–8 שאלות קצרות בנושא ${s.topicName}. אחרי כל טעות לעצור, לבקש מהילד להסביר איך פתר, ולשים לב במיוחד ל-${s.detectedPattern}.`;
  }
  return `מה כדאי לעשות ביחד: לפתור 5–8 שאלות קצרות בנושא ${s.topicName}. אחרי כל טעות לעצור ולבקש מהילד להסביר איך פתר.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderDifficultyObservedStepLabel(s) {
  if (s.decisionCode === "clear_topic_gap") return "חיזוק בסיסי";
  return "חיזוק באותה רמה";
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
  const qText = formatQuestionsText(s.questions);
  return `ב${s.topicName} נראית הצלחה טובה. נפתרו ${qText}, והדיוק הוא ${s.accuracy}%.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedIdentified(s) {
  return `מה רואים: ב${s.topicName} נראית הצלחה טובה בשאלות שנפתרו.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedData(s) {
  return renderTopicDataLine(s);
}

/** @param {TopicOwnerCopySlots} _s */
function renderPositiveObservedMeaning(_s) {
  return `מה זה אומר: ${_s.topicName} נראה יציב יחסית עכשיו. כדאי לשמור עליו עם תרגול קצר מדי פעם.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPositiveObservedHomeAction(s) {
  return `מה כדאי לעשות ביחד: לפתור מדי פעם כמה שאלות קצרות בנושא ${s.topicName}, כדי לשמור על רצף וביטחון.`;
}

/** @param {TopicOwnerCopySlots} _s */
function renderPositiveObservedStepLabel(_s) {
  return "שימור בתרגול קצר";
}

/** @param {TopicOwnerCopySlots} _s */
function renderPositiveObservedCaution(_s) {
  return "גם כשנראית הצלחה, כדאי לשמור על תרגול קצר מדי פעם כדי לוודא שהנושא נשאר יציב.";
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataBase(s) {
  const tn = s.topicName;
  if (s.questions === 1) {
    return `ב${tn} יש עדיין שאלה אחת בלבד. זו תמונה ראשונית בלבד.`;
  }
  return `ב${tn} יש עדיין מעט שאלות: ${s.questions}. זו תמונה ראשונית בלבד.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataIdentified(s) {
  return `מה רואים: יש כרגע מעט שאלות בנושא ${s.topicName}.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataData(s) {
  return renderTopicDataLine(s);
}

/** @param {TopicOwnerCopySlots} _s */
function renderInitialTopicDataMeaning(_s) {
  return "מה זה אומר: עדיין מוקדם להסיק מסקנה ברורה. צריך עוד כמה שאלות בנושא.";
}

/** @param {TopicOwnerCopySlots} s */
function renderInitialTopicDataHomeAction(s) {
  return `מה כדאי לעשות ביחד: לפתור עוד כמה שאלות קצרות בנושא ${s.topicName}, בלי לחץ, כדי לקבל תמונה ברורה יותר.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusBase(s) {
  return `ב${s.topicName} היו כמה טעויות, אבל עדיין אין מספיק שאלות כדי לדעת אם זה חוזר בקביעות.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusIdentified(s) {
  return `מה רואים: היו כמה טעויות בנושא ${s.topicName}, אבל עדיין אין מספיק שאלות כדי לדעת אם זה דפוס קבוע.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusData(s) {
  return renderTopicDataLine(s);
}

/** @param {TopicOwnerCopySlots} _s */
function renderPracticeFocusMeaning(_s) {
  return "מה זה אומר: כדאי להוסיף מעט תרגול ולראות אם אותן טעויות חוזרות.";
}

/** @param {TopicOwnerCopySlots} s */
function renderPracticeFocusHomeAction(s) {
  return `מה כדאי לעשות ביחד: לתרגל כמה שאלות קצרות ב${s.topicName}, ולבקש מהילד להסביר את הדרך בקול.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedBase(s) {
  const base = `ב${s.topicName} יש גם תשובות נכונות וגם טעויות שחוזרות. כדאי לחזק נקודתית בלי לקפוץ רמה מהר מדי.`;
  return appendPatternToSnapshot(base, s);
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedIdentified(s) {
  if (hasPattern(s)) {
    return `מה רואים: ב${s.topicName} יש גם הצלחות וגם טעויות שחוזרות.`;
  }
  return `מה רואים: ב${s.topicName} יש גם הצלחות וגם טעויות שדורשות חיזוק.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedData(s) {
  return renderTopicDataLine(s);
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedPattern(s) {
  return renderTopicPatternLine(s);
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedMeaning(s) {
  return `מה זה אומר: יש בסיס מסוים, אבל ${s.topicName} עדיין לא יציב לגמרי.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderMixedHomeAction(s) {
  return `מה כדאי לעשות ביחד: לבחור 5–8 שאלות בנושא ${s.topicName}, לשלב שאלות קלות ובינוניות, ולעצור בכל טעות כדי להבין מה קרה.`;
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe0Snapshot(s) {
  if (s.decisionCode === "early_direction_only") {
    return renderInitialTopicDataBase(s);
  }
  if (s.decisionCode === "clear_topic_gap") {
    return renderDifficultyObservedBase(s);
  }
  return "";
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe0Caution(s) {
  if (s.decisionCode === "early_direction_only") {
    return "זה עדיין מידע ראשוני - כדאי להוסיף עוד כמה שאלות ולבדוק אם הכיוון נשמר.";
  }
  if (s.decisionCode === "clear_topic_gap") {
    return "כאן כבר לא מדובר רק במידע ראשוני; כדאי לחזור ולחזק את הנושא בצורה ממוקדת.";
  }
  return "";
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe1Snapshot(s) {
  return renderDifficultyObservedBase(s);
}

/** @param {TopicOwnerCopySlots} s */
function renderNarrativeWe2Snapshot(s) {
  if (hasPattern(s)) {
    return renderMixedBase(s);
  }
  return renderDifficultyObservedBase(s);
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
  "practice_focus:TOPIC_EXPLAIN_HOME_ACTION": renderPracticeFocusHomeAction,
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
