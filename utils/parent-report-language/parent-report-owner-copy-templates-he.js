/**
 * Owner-authored subject-level Hebrew copy — Phase A (templateId + slots only).
 * Editorial strings supplied by product owner; render functions interpolate slots only.
 */

import { parentReportOwnerTopicCopyTemplatesHe } from "./parent-report-owner-topic-copy-templates-he.js";

/** @typedef {{
 *   topicName: string,
 *   questions: number,
 *   correct: number,
 *   wrong: number,
 *   accuracy: number,
 *   detectedPattern: string|null,
 *   affectedSubskill: string|null,
 *   evidenceStrength: string,
 * }|null} OwnerPriorityTopicSlots */

/** @typedef {{
 *   subjectName: string,
 *   subjectDecision: string,
 *   recommendedSubjectAction: string,
 *   priorityTopic0: OwnerPriorityTopicSlots,
 *   priorityTopic1: OwnerPriorityTopicSlots,
 *   prioritySpeedTopic0: OwnerPriorityTopicSlots,
 * }} SubjectOwnerCopySlots */

export const SUBJECT_OWNER_COPY_TEMPLATE_IDS = Object.freeze({
  OPENING: "SUBJECT_OPENING_PRIORITY_TOPIC_0",
  DIAGNOSIS_0: "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_0",
  DIAGNOSIS_1: "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1",
  CLOSING: "SUBJECT_CLOSING_ENGINE_CONTRACT",
  HOME_ACTION: "remediate_priority_topics_same_level",
});

/** @param {unknown} v */
function str(v) {
  return v != null ? String(v).trim() : "";
}

/** @param {OwnerPriorityTopicSlots|null|undefined} t */
function hasPattern(t) {
  return !!str(t?.detectedPattern);
}

/**
 * @param {Record<string, unknown>|null|undefined} topic
 * @returns {OwnerPriorityTopicSlots|null}
 */
function buildPriorityTopicSlot(topic) {
  if (!topic || typeof topic !== "object") return null;
  const topicName = str(topic.topicLabelKey || topic.displayName || topic.topicName);
  if (!topicName) return null;
  return {
    topicName,
    questions: Number(topic.questions) || 0,
    correct: Number(topic.correct) || 0,
    wrong: Number(topic.wrong) || 0,
    accuracy: Number(topic.accuracy) || 0,
    detectedPattern: topic.detectedPattern ? str(topic.detectedPattern) : null,
    affectedSubskill: topic.affectedSubskill ? str(topic.affectedSubskill) : null,
    evidenceStrength: str(topic.evidenceStrength),
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {string} [subjectLabelHe]
 * @returns {SubjectOwnerCopySlots|null}
 */
export function buildSubjectOwnerCopySlots(contract, subjectLabelHe = "") {
  if (!contract || typeof contract !== "object") return null;
  const p0 = buildPriorityTopicSlot(contract.priorityTopics?.[0]);
  const p1 = buildPriorityTopicSlot(contract.priorityTopics?.[1]);
  const speedTopic0 = buildPriorityTopicSlot(contract.prioritySpeedTopic);
  return {
    subjectName: str(subjectLabelHe || contract.subjectLabelKey),
    subjectDecision: str(contract.subjectDecision),
    recommendedSubjectAction: str(contract.recommendedSubjectAction),
    priorityTopic0: p0,
    priorityTopic1: p1,
    prioritySpeedTopic0: speedTopic0,
  };
}

/** @param {SubjectOwnerCopySlots} slots */
function renderSubjectOpeningPriorityTopic0(slots) {
  const sn = slots.subjectName;
  const t0 = slots.priorityTopic0;

  // speed_check_only_subject has NO actionable gap topic (t0 is always null for it —
  // enforced upstream: gaps.length===0 && stable.length===0 && speedCheckTopics.length>=1).
  // Uses its own dedicated slot (prioritySpeedTopic0) so this branch never depends on t0.
  // Product-owner-approved wording — must not claim a knowledge gap, must not say "נושא
  // אחד" (the sentence just names the single highest-priority speed-check topic, per the
  // existing priority order, without counting them).
  if (slots.subjectDecision === "speed_check_only_subject") {
    const speedTopic = slots.prioritySpeedTopic0;
    if (!speedTopic || !sn) return "";
    return `ב${sn} עדיין נדרש לבדוק את הביצוע ללא הגבלת זמן. בנושא ${speedTopic.topicName} הטעויות הופיעו בתרגול מהיר, ולכן עדיין מוקדם לקבוע אם נדרש חיזוק בידע.`;
  }

  if (!t0 || !sn) return "";

  // mixed_subject_profile ALWAYS describes exactly one topic needing strengthening
  // (gaps.length === 1 && stable.length >= 1 — enforced upstream in
  // build-subject-engine-decision-contract.js). Product-owner-approved wording — must
  // never say "כמה נושאים" (several topics), since only one topic is a gap here. Also
  // uses "בחלק מהנושאים" (in some of the topics) rather than "נושאים שבהם" (topics
  // where...), which was imprecise when stable.length===1 (a single stable topic is
  // not "topics", plural).
  if (slots.subjectDecision === "mixed_subject_profile") {
    return `ב${sn} נראית יציבות בחלק מהנושאים, ולצדה נושא אחד שכדאי לחזק. מומלץ להתחיל ב${t0.topicName}.`;
  }
  if (slots.subjectDecision === "multiple_topic_gaps") {
    if (hasPattern(t0)) {
      return `ב${sn} בולטים כמה נושאים שדורשים חיזוק. הנושא הראשון הוא ${t0.topicName}: נפתרו ${t0.questions} שאלות, הדיוק עומד על ${t0.accuracy}%, וזוהה דפוס שחוזר בטעויות: ${t0.detectedPattern}. לכן כדאי להתחיל ממנו.`;
    }
    return `ב${sn} בולטים כמה נושאים שדורשים חיזוק. הנושא הראשון הוא ${t0.topicName}: נפתרו ${t0.questions} שאלות, והדיוק עומד על ${t0.accuracy}%. לכן כדאי להתחיל ממנו.`;
  }
  if (slots.subjectDecision === "focused_strengthening_needed") {
    return `ב${sn} בולט כרגע נושא אחד שדורש חיזוק: ${t0.topicName}. נפתרו ${t0.questions} שאלות, והדיוק עומד על ${t0.accuracy}%. מומלץ לחזק את הנושא לפני שממשיכים.`;
  }
  return "";
}

/** @param {SubjectOwnerCopySlots} slots */
function renderSubjectDiagnosisPriorityTopic0(slots) {
  const t0 = slots.priorityTopic0;
  if (!t0) return "";
  if (hasPattern(t0)) {
    return `עיקר הקושי כרגע נמצא ב${t0.topicName}. נפתרו ${t0.questions} שאלות בדיוק של ${t0.accuracy}%, וזוהה דפוס שחוזר בטעויות: ${t0.detectedPattern}. זה מצביע על צורך בחיזוק ממוקד באותו נושא.`;
  }
  return `עיקר הקושי כרגע נמצא ב${t0.topicName}. נפתרו ${t0.questions} שאלות בדיוק של ${t0.accuracy}%. זה מספיק כדי להמליץ על חיזוק ממוקד באותו נושא, ולא רק על המשך תרגול כללי.`;
}

/** @param {SubjectOwnerCopySlots} slots */
function renderSubjectDiagnosisPriorityTopic1(slots) {
  const t1 = slots.priorityTopic1;
  if (!t1) return "";
  if (hasPattern(t1)) {
    return `נושא נוסף שחשוב לחזק הוא ${t1.topicName}. נפתרו ${t1.questions} שאלות בדיוק של ${t1.accuracy}%, וזוהה דפוס שחוזר בטעויות: ${t1.detectedPattern}.`;
  }
  return `נושא נוסף שחשוב לחזק הוא ${t1.topicName}. נפתרו ${t1.questions} שאלות בדיוק של ${t1.accuracy}%, ולכן כדאי לכלול גם אותו בתרגול הקרוב.`;
}

/** @param {SubjectOwnerCopySlots} slots */
function renderRemediatePriorityTopicsSameLevel(slots) {
  const t0 = slots.priorityTopic0;
  if (!t0) return "";
  const t1 = slots.priorityTopic1;
  if (t1) {
    return `בשבוע הקרוב מומלץ לתרגל באותה רמה, בלי להעלות רמת קושי בינתיים. התחילו ב${t0.topicName}, ולאחר מכן עברו ל${t1.topicName}. בכל פעם תרגלו מספר קטן של שאלות ובדקו שהילד מסביר את דרך הפתרון.`;
  }
  return `בשבוע הקרוב מומלץ לתרגל באותה רמה, בלי להעלות רמת קושי בינתיים. התמקדו ב${t0.topicName}, עם מספר קטן של שאלות בכל פעם, ובדקו שהילד מסביר את דרך הפתרון.`;
}

/** @param {SubjectOwnerCopySlots} _slots */
function renderSubjectClosingEngineContract(_slots) {
  return "עדיף לעבוד קצר וממוקד: לבחור נושא אחד בכל פעם, לפתור 5–8 שאלות, ואז לבקש מהילד להסביר איך הגיע לתשובה. אחרי כמה תרגולים אפשר לבדוק אם הדיוק והיציבות משתפרים.";
}

/** @type {Record<string, (slots: SubjectOwnerCopySlots) => string>} */
const subjectOwnerCopyTemplatesHe = Object.freeze({
  [SUBJECT_OWNER_COPY_TEMPLATE_IDS.OPENING]: renderSubjectOpeningPriorityTopic0,
  [SUBJECT_OWNER_COPY_TEMPLATE_IDS.DIAGNOSIS_0]: renderSubjectDiagnosisPriorityTopic0,
  [SUBJECT_OWNER_COPY_TEMPLATE_IDS.DIAGNOSIS_1]: renderSubjectDiagnosisPriorityTopic1,
  [SUBJECT_OWNER_COPY_TEMPLATE_IDS.CLOSING]: renderSubjectClosingEngineContract,
  [SUBJECT_OWNER_COPY_TEMPLATE_IDS.HOME_ACTION]: renderRemediatePriorityTopicsSameLevel,
});

/** Subject + topic owner templates (Phase A + B+C+D). */
export const parentReportOwnerCopyTemplatesHe = Object.freeze({
  ...subjectOwnerCopyTemplatesHe,
  ...parentReportOwnerTopicCopyTemplatesHe,
});

/**
 * @param {string} templateId
 * @param {SubjectOwnerCopySlots|null|undefined} slots
 * @returns {string|null}
 */
export function renderOwnerSubjectCopyTemplateHe(templateId, slots) {
  const id = str(templateId);
  if (!id || !slots) return null;
  const fn = parentReportOwnerCopyTemplatesHe[id];
  if (!fn) return null;
  const text = str(fn(slots));
  return text || null;
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {string} templateId
 * @param {string} [subjectLabelHe]
 * @returns {string|null}
 */
export function resolveSubjectOwnerCopyFromContract(contract, templateId, subjectLabelHe = "") {
  if (!contract?.blockedLegacySummary) return null;
  const slots = buildSubjectOwnerCopySlots(contract, subjectLabelHe);
  if (!slots) return null;
  return renderOwnerSubjectCopyTemplateHe(templateId, slots);
}
