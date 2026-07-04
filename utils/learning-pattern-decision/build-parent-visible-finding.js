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
  if (/בתרגול האחרון/i.test(text)) hits.push("בתרגול האחרון");
  return hits;
}

/**
 * @param {number} wrongCount
 * @param {number} questionCount
 * @param {number} accuracy
 */
function difficultyVolumePhrase(wrongCount, questionCount, accuracy) {
  const w = Math.max(0, Number(wrongCount) || 0);
  const q = Math.max(0, Number(questionCount) || 0);
  const acc = Number(accuracy) || 0;
  const ratio = q > 0 ? w / q : 0;
  if (ratio >= 0.5 || acc <= 40) return "הרבה טעויות";
  return "כמה טעויות";
}

/**
 * @param {number} wrongCount
 * @param {number} questionCount
 * @param {number} accuracy
 */
function difficultyActionPhrase(wrongCount, questionCount, accuracy) {
  const w = Math.max(0, Number(wrongCount) || 0);
  const q = Math.max(0, Number(questionCount) || 0);
  const acc = Number(accuracy) || 0;
  if (q >= 5 && (acc < 55 || w >= Math.ceil(q * 0.4))) return "לחזור ולחזק";
  return "לחזור ולתרגל";
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
        ? `בנושא ${name} יש נתונים ראשוניים בלבד. ככל שיהיו עוד שאלות בנושא, נוכל להציג תמונה מדויקת יותר.`
        : `בנושא ${name} נפתרו ${q} שאלות. עדיין מוקדם לזהות דפוס ברור בנושא.`;
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
      `בנושא ${name} יש גם הצלחות וגם נקודות שכדאי לחזק. ` +
      `כדאי לחזק חלקים שדורשים תשומת לב, ובמקביל להמשיך לחזק את מה שכבר עובד.${contextSuffix}`;
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
        `בנושא ${name} מופיע דפוס חוזר של טעויות (${patternLabel}). כדאי לחזק את הנושא.${contextSuffix}`;
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
    const volume = difficultyVolumePhrase(w, q, acc);
    const action = difficultyActionPhrase(w, q, acc);
    templateId = topicStatus === "practice_focus" || findingType === "practice_focus"
      ? "practice_focus"
      : "difficulty_observed";
    parentWordingLevel = q >= 5 ? "pattern_observed" : "factual_observation";
    parentVisibleFinding =
      `בנושא ${name} ${volume === "הרבה טעויות" ? "היו הרבה טעויות" : "היו כמה טעויות"} בשאלות שנפתרו. כדאי ${action} את הנושא.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "positive_repeated") {
    templateId = "positive_repeated";
    parentWordingLevel =
      evidenceStrength === "strong" ? "strong_pattern" : "pattern_observed";
    parentVisibleFinding =
      `בנושא ${name} נראית הצלחה טובה ועקבית בשאלות שנפתרו.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "positive_observed" || findingType === "success_pattern") {
    templateId = "positive_observed";
    parentWordingLevel =
      q >= 8 ? "pattern_observed" : "factual_observation";
    parentVisibleFinding =
      `בנושא ${name} נראית הצלחה טובה בשאלות שנפתרו.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (topicStatus === "no_clear_pattern") {
    if (q >= 5 && w >= 2 && acc < 70) {
      const volume = difficultyVolumePhrase(w, q, acc);
      const action = difficultyActionPhrase(w, q, acc);
      templateId = "no_clear_pattern_difficulty_fallback";
      parentWordingLevel = "pattern_observed";
      parentVisibleFinding =
        `בנושא ${name} ${volume === "הרבה טעויות" ? "היו הרבה טעויות" : "היו כמה טעויות"} בשאלות שנפתרו. כדאי ${action} את הנושא.${contextSuffix}`;
      return { parentVisibleFinding, parentWordingLevel, templateId };
    }
    templateId = "no_clear_pattern";
    parentWordingLevel = "no_parent_text";
    parentVisibleFinding = "";
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  if (q >= 5 && w >= 2 && acc < 70) {
    const volume = difficultyVolumePhrase(w, q, acc);
    const action = difficultyActionPhrase(w, q, acc);
    templateId = "difficulty_observed_fallback";
    parentWordingLevel = "pattern_observed";
    parentVisibleFinding =
      `בנושא ${name} ${volume === "הרבה טעויות" ? "היו הרבה טעויות" : "היו כמה טעויות"} בשאלות שנפתרו. כדאי ${action} את הנושא.${contextSuffix}`;
    return { parentVisibleFinding, parentWordingLevel, templateId };
  }

  templateId = "no_clear_pattern";
  parentWordingLevel = "no_parent_text";
  parentVisibleFinding = "";
  return { parentVisibleFinding, parentWordingLevel, templateId };
}
