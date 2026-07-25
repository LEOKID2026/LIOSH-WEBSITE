/**
 * Parent Visible Finding Templates — Base Contract (section 8.1).
 * Subject-agnostic: {topicName} from row metadata, never hardcoded subject topics.
 */
import { isUsableParentPatternLabel, isBlockedParentPatternLabel, sanitizeParentPatternLabel } from "./parent-pattern-label.js";

/** @type {readonly string[]} */
export const FORBIDDEN_PARENT_WORDS = Object.freeze([
  "אבחון",
  "אובחן",
  "אבחנה",
  "אזהרה",
  "אזהרה חמורה",
  "בעיה חמורה",
  "הילד לא יודע",
  "פער קבוע",
  "מקור הקושי בוודאות",
  "בעיה קבועה",
  "alert",
  "urgent",
  "critical",
  "diagnosis",
  "diagnostic",
  "cold probe",
  "unknown",
  "נספרו לדוח",
  "דוח הלימודי",
  "internal",
  "אין תמונה מספיק",
  "מעט נתונים",
]);

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenParentWords(text) {
  const s = String(text || "").toLowerCase();
  const hits = [];
  for (const w of FORBIDDEN_PARENT_WORDS) {
    if (s.includes(String(w).toLowerCase())) hits.push(w);
  }
  // "בתרגול האחרון" is allowed for same_session_observed pattern copy
  // (proven same-tag cluster in one session / short window).
  return hits;
}

/**
 * @param {object} p
 * @param {string} p.topicName
 * @param {number} p.questionCount
 * @param {string} p.topicStatus
 * @param {string} p.findingType
 * @param {string} p.evidenceStrength
 * @param {boolean} p.canUseRepeatedWording
 * @param {{ label?: string }[]} p.repeatedMistakePatterns
 * @param {boolean} p.competitiveBucketOnly
 * @param {boolean} p.hasMixed
 */
export function buildParentVisibleFinding({
  topicName,
  questionCount,
  topicStatus,
  findingType,
  evidenceStrength,
  canUseRepeatedWording,
  repeatedMistakePatterns = [],
  competitiveBucketOnly = false,
  hasMixed = false,
  wrongCount = 0,
  accuracy = 0,
}) {
  const q = Math.max(0, Number(questionCount) || 0);
  const w = Math.max(0, Number(wrongCount) || 0);
  const acc = Number(accuracy) || 0;
  const name = String(topicName || "הנושא").trim() || "הנושא";
  const rawPatternLabel = String(repeatedMistakePatterns[0]?.label || "").trim();
  const patternLabel = sanitizeParentPatternLabel(repeatedMistakePatterns[0]?.label);
  const contextSuffix =
    q > 0 ? ` מבוסס על ${q} שאלות שנפתרו בנושא.` : "";

  /** @type {"no_parent_text"|"factual_observation"|"pattern_observed"|"repeated_pattern"|"strong_pattern"} */
  let parentWordingLevel = "no_parent_text";
  let parentVisibleFinding = "";
  let templateId = "no_parent_text";

  if (topicStatus === "not_practiced" || q === 0) {
    return { parentVisibleFinding: "", parentWordingLevel: "no_parent_text", templateId: "no_parent_text" };
  }

  if (
    q <= 2 ||
    topicStatus === "initial_data" ||
    findingType === "initial_topic_data"
  ) {
    templateId = "initial_topic_data";
    parentWordingLevel = "factual_observation";
    parentVisibleFinding =
      q === 1
        ? `בנושא ${name} יש כרגע מעט נתונים. ככל שיצטבר תרגול נוסף, נוכל להציג תמונה מדויקת יותר.`
        : `בנושא ${name} נפתרו ${q} שאלות. עדיין מוקדם לקבוע אם קיים דפוס שחוזר בנושא.`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  const hasInternalRepeat = repeatedMistakePatterns.length > 0;
  const q34Factual = q >= 3 && q <= 4 && hasInternalRepeat && !canUseRepeatedWording;

  if (q34Factual) {
    templateId = "q3_4_factual";
    parentWordingLevel = "factual_observation";
    parentVisibleFinding = `בנושא ${name}, מבוסס על ${q} שאלות שנפתרו בנושא, נראה דפוס מוקדם של טעויות.`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (competitiveBucketOnly) {
    templateId = "competitive_bucket_only";
    parentWordingLevel = "factual_observation";
    const brief = topicStatus.includes("positive")
      ? "נראית הצלחה"
      : topicStatus.includes("difficulty")
        ? "נראה קושי"
        : "נראה דפוס";
    parentVisibleFinding = `בנושא ${name}, בהקשר תחרותי/מהירות, ${brief}.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (hasMixed || topicStatus === "mixed" || findingType === "mixed_pattern") {
    templateId = "mixed";
    parentWordingLevel = "pattern_observed";
    parentVisibleFinding =
      `בנושא ${name} יש גם הצלחות וגם חלקים שדורשים חיזוק. ` +
      `כדאי להמשיך לתרגל את מה שכבר עובד ולחזור בצורה ממוקדת על החלקים שבהם הופיעו טעויות.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "difficulty_repeated" && canUseRepeatedWording) {
    if (isBlockedParentPatternLabel(rawPatternLabel)) {
      // Fall through to difficulty_observed — no "דפוס חוזר" for unknown/missing labels.
    } else if (isUsableParentPatternLabel(patternLabel)) {
      templateId = "difficulty_repeated";
      parentWordingLevel =
        evidenceStrength === "strong" ? "strong_pattern" : "repeated_pattern";
      parentVisibleFinding =
        `בנושא ${name} חזר אותו סוג של טעות: ${patternLabel}. כדאי לתרגל את החלק הזה בצורה ממוקדת.${contextSuffix}`;
      return { parentVisibleFinding, parentWordingLevel, templateId };
    } else if (rawPatternLabel) {
      templateId = "difficulty_repeated_evidence_tag";
      parentWordingLevel =
        evidenceStrength === "strong" ? "strong_pattern" : "repeated_pattern";
      parentVisibleFinding =
        `בנושא ${name} חזר אותו סוג של טעות: ${rawPatternLabel}. כדאי לתרגל את החלק הזה בצורה ממוקדת.${contextSuffix}`;
      return { parentVisibleFinding, parentWordingLevel, templateId };
    } else {
      templateId = "difficulty_repeated_generic";
      parentWordingLevel = "repeated_pattern";
      parentVisibleFinding =
        `בנושא ${name} מופיע דפוס חוזר של טעויות. כדאי לחזק את הנושא.${contextSuffix}`;
      return { parentVisibleFinding, parentWordingLevel, templateId };
    }
  }

  if (
    topicStatus === "difficulty_observed" ||
    findingType === "difficulty_pattern" ||
    topicStatus === "practice_focus" ||
    findingType === "practice_focus"
  ) {
    templateId = topicStatus === "practice_focus" || findingType === "practice_focus"
      ? "practice_focus"
      : "difficulty_observed";
    parentWordingLevel = q >= 5 ? "pattern_observed" : "factual_observation";
    parentVisibleFinding =
      `בנושא ${name} נרשמו כמה טעויות בשאלות שנפתרו. כדאי לעבור על הטעויות ולתרגל שוב את החלקים שבהם הופיע קושי.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "positive_repeated") {
    templateId = "positive_repeated";
    parentWordingLevel =
      evidenceStrength === "strong" ? "strong_pattern" : "pattern_observed";
    parentVisibleFinding =
      `בנושא ${name} נראית הצלחה יציבה בשאלות שנפתרו.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "positive_observed" || findingType === "success_pattern") {
    templateId = "positive_observed";
    parentWordingLevel =
      q >= 8 ? "pattern_observed" : "factual_observation";
    parentVisibleFinding =
      `בנושא ${name} נראית הצלחה טובה בשאלות שנפתרו עד עכשיו.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "no_clear_pattern") {
    if (q >= 5 && w >= 2 && acc < 70) {
      templateId = "no_clear_pattern_difficulty_fallback";
      parentWordingLevel = "pattern_observed";
      parentVisibleFinding =
        `בנושא ${name} נרשמו כמה טעויות בשאלות שנפתרו. כדאי לעבור על הטעויות ולתרגל שוב את החלקים שבהם הופיע קושי.${contextSuffix}`;
      return { parentVisibleFinding, parentWordingLevel, templateId };
    }
    templateId = "no_clear_pattern";
    parentWordingLevel = "no_parent_text";
    parentVisibleFinding = "";
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (q >= 5 && w >= 2 && acc < 70) {
    templateId = "difficulty_observed_fallback";
    parentWordingLevel = "pattern_observed";
    parentVisibleFinding =
      `בנושא ${name} נרשמו כמה טעויות בשאלות שנפתרו. כדאי לעבור על הטעויות ולתרגל שוב את החלקים שבהם הופיע קושי.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  templateId = "no_clear_pattern";
  parentWordingLevel = "no_parent_text";
  parentVisibleFinding = "";
  return { parentVisibleFinding, parentWordingLevel, templateId };
}
