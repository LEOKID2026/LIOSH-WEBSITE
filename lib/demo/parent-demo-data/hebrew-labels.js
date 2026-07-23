import { resolveDemoTopicLabelHe } from "./subject-topics.js";

/** Hebrew titles for parent-assigned activities — never English in UI. */
const ACTIVITY_TITLE_TEMPLATES = Object.freeze([
  "תרגול {subject} - {topic}",
  "חיזוק ב{subject}: {topic}",
  "שיעורי בית - {topic}",
  "תרגול ממוקד - {topic}",
]);

/**
 * @param {string} subjectLabelHe
 * @param {string} topicLabelHe
 * @param {number} seq
 */
export function buildDemoActivityTitleHe(subjectLabelHe, topicLabelHe, seq) {
  const tpl = ACTIVITY_TITLE_TEMPLATES[seq % ACTIVITY_TITLE_TEMPLATES.length];
  return tpl.replace("{subject}", subjectLabelHe).replace("{topic}", topicLabelHe);
}

/**
 * @param {string} gradeLevel
 * @param {string} subjectKey
 * @param {string} topicKey
 * @param {number} seq
 */
export function buildDemoActivityCopyHe(gradeLevel, subjectKey, topicKey, seq) {
  const topicLabelHe = resolveDemoTopicLabelHe(gradeLevel, subjectKey, topicKey);
  const subjectLabels = {
    math: "חשבון",
    hebrew: "עברית",
    english: "אנגלית",
    geometry: "גאומטריה",
    science: "מדעים",
  };
  const subjectLabelHe = subjectLabels[subjectKey] || "לימוד";
  return {
    titleHe: buildDemoActivityTitleHe(subjectLabelHe, topicLabelHe, seq),
    topicLabelHe,
    subjectLabelHe,
  };
}

export const DEMO_READONLY_MESSAGE_HE =
  "מצב הדגמה - צפייה בלבד. לא ניתן לשמור שינויים.";

/** @type {Record<string, string>} */
export const DEMO_READONLY_ACTION_MESSAGES_HE = Object.freeze({
  create_student: DEMO_READONLY_MESSAGE_HE,
  update_student: DEMO_READONLY_MESSAGE_HE,
  delete_student: DEMO_READONLY_MESSAGE_HE,
  assign_activity: DEMO_READONLY_MESSAGE_HE,
  save_permissions: DEMO_READONLY_MESSAGE_HE,
  share: "מצב הדגמה - לא ניתן לשתף מחוץ לדמו.",
  guest_link: DEMO_READONLY_MESSAGE_HE,
  credentials: DEMO_READONLY_MESSAGE_HE,
  worksheets_generate: "מצב הדגמה - ניתן לצפות בדפי עבודה, לא ליצור חדשים.",
});
