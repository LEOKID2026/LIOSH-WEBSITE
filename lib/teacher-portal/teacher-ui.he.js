/**
 * Hebrew UI strings and label helpers for Teacher Portal + Guardian Access.
 * Client-safe — no server secrets.
 */

import { topicBucketLabelHe } from "../../utils/diagnostic-labels-he.js";
import {
  subjectLabelHe as platformSubjectLabelHe,
  SUBJECT_LABEL_HE,
} from "../platform-ui/hebrew-display-labels.js";
import { isMoledetGeographyGradeAllowed } from "../../utils/moledet-geography-curriculum-gates.js";

export const REPORT_SUBJECTS = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
  "history",
];

export { SUBJECT_LABEL_HE };

/** Activity/report subject list with moledet gated below official teach grade. */
export function activitySubjectsForGrade(gradeKey, subjects = REPORT_SUBJECTS) {
  return subjects.filter((s) => {
    if (s === "moledet_geography") return isMoledetGeographyGradeAllowed(gradeKey);
    return true;
  });
}

const RISK_SIGNAL_HE = {
  inactive_recent_days: "חוסר פעילות ממושך",
  no_sessions_in_range: "לא היו מפגשי תרגול בתקופה",
  low_overall_accuracy: "קשיים בביצועים הכלליים",
  many_recent_mistakes: "מספר טעויות אחרונות גבוה",
  never_active_in_range: "לא הייתה פעילות בתקופה",
  insufficient_answers: "אין מספיק נתונים לניתוח",
};

const SUPPORT_SUGGESTION_HE = {
  review_fundamentals: "מומלץ לחזור על יסודות המקצוע",
  encourage_session_start: "מומלץ לעודד התחלת תרגול",
};

const ATTENTION_REASON_HE = {
  no_activity_in_range: "לא פעיל בתקופה",
  low_accuracy: "קשיים בביצועים",
  many_recent_mistakes: "מספר טעויות אחרונות גבוה",
  recent_mistakes: "טעויות חוזרות",
};

const GUIDANCE_SEVERITY_TIER_HE = {
  critical: "דורש התערבות מיידית",
  needs_reinforcement: "דורש חיזוק",
  monitor: "כדאי לעקוב",
  on_track: "בקצב תקין",
};

const CLASS_GUIDANCE_SEVERITY_TIER_HE = {
  critical_class: "הכיתה דורשת התערבות מיידית",
  class_needs_reinforcement: "הכיתה דורשת חיזוק",
  class_monitor: "הכיתה דורשת מעקב ותרגול ממוקד",
  class_on_track: "הכיתה בקצב תקין",
};

const CLASS_HEALTH_HE = {
  no_data: "אין מספיק נתונים",
  critical_class: "הכיתה דורשת התערבות מיידית",
  needs_reinforcement: "הכיתה דורשת חיזוק",
  monitor: "הכיתה דורשת מעקב ותרגול ממוקד",
  strong: "הכיתה בקצב תקין",
};

export const STUDENT_FOCUS_CALM_MESSAGE = "אין נושאים דחופים כרגע - המשך כרגיל.";
export const HUB_STUDENT_FOCUS_CALM_MESSAGE = "אין נושאים ממוקדים - המשיכו מעקב.";
export const HUB_CLASS_WEAK_TOPICS_CALM_MESSAGE =
  "לא זוהו נושאים חלשים משמעותיים - המשיכו מעקב.";
export const STUDENT_FOCUS_FALLBACK_BANNER =
  "יש קושי במקצוע - נדרש תרגול אבחוני לזיהוי נושא מדויק";
export const CLASS_WEAK_TOPICS_FALLBACK_BANNER =
  "הכיתה מציגה קושי במקצוע - מומלץ חיזוק כיתתי אבחוני";

const GROUP_TIER_HE = {
  struggling: "קבוצת תמיכה",
  on_track: "קבוצת חיזוק",
  advanced: "קבוצת התקדמות",
};

const GUARDIAN_ACCESS_STATE_HE = {
  active: "פעילה",
  expired: "פגת תוקף",
  revoked: "בוטלה",
};

const GENERIC_SUGGESTION_HE = "המשיכו לעקוב אחר ההתקדמות";

const ACTION_TYPE_LABEL_HE = {
  class_reteach: "חזרה פרונטלית בכיתה",
  small_group: "עבודה בקבוצה קטנה",
  individual_practice: "תרגול אישי ממוקד",
  collect_more_data: "המתן לנתונים נוספים",
};

const ASSIGNMENT_TYPE_LABEL_HE = {
  classroom_activity: "פעילות כיתה",
  worksheet_pdf: "דף עבודה",
  focused_practice: "תרגול ממוקד",
};

export function actionTypeLabelHe(code) {
  return ACTION_TYPE_LABEL_HE[code] || null;
}

export function assignmentTypeLabelHe(code) {
  return ASSIGNMENT_TYPE_LABEL_HE[code] || null;
}

export function subjectLabelHe(subjectId) {
  return platformSubjectLabelHe(subjectId);
}

const TOPIC_GRADE_SEP = "::grade:";

function subjectIdForTopicLabels(subject) {
  if (subject === "moledet_geography") return "moledet-geography";
  return String(subject || "");
}

/**
 * @param {string|null|undefined} topicKey
 */
export function normalizeTopicKeyForLabel(topicKey) {
  if (topicKey == null) return "";
  const k = String(topicKey).trim();
  if (!k) return "";
  const i = k.indexOf(TOPIC_GRADE_SEP);
  return i === -1 ? k : k.slice(0, i);
}

const NON_RECOMMENDABLE_TOPIC_KEYS = new Set(["general", "mixed"]);

/**
 * @param {string|null|undefined} topicKey
 */
export function isTeacherRecommendableTopicKey(topicKey) {
  const base = normalizeTopicKeyForLabel(topicKey);
  if (!base) return false;
  return !NON_RECOMMENDABLE_TOPIC_KEYS.has(base.toLowerCase());
}

/**
 * @param {string} subject
 * @param {string|null|undefined} topicKey
 * @returns {string|null}
 */
export function resolveTopicLabelHe(subject, topicKey) {
  if (!isTeacherRecommendableTopicKey(topicKey)) return null;
  const baseKey = normalizeTopicKeyForLabel(topicKey);
  const sid = subjectIdForTopicLabels(subject);
  let label = topicBucketLabelHe(sid, topicKey);
  if (!label || label === "נושא זה" || label === baseKey || label === String(topicKey)) {
    label = topicBucketLabelHe(sid, baseKey);
  }
  if (!label || label === "נושא זה" || label === baseKey) return null;
  return label;
}

export function topicLabelHe(subjectId, topicKey) {
  return resolveTopicLabelHe(subjectId, topicKey);
}

/**
 * Teacher recommendation line: subject + mapped Hebrew topic only (never subject-only).
 * @param {string} subjectId
 * @param {string|null|undefined} topicKey
 */
export function formatTopicRecommendationLineHe(subjectId, topicKey) {
  const topic = resolveTopicLabelHe(subjectId, topicKey);
  if (!topic) return null;
  const subj = subjectLabelHe(subjectId);
  return subj ? `${subj} - ${topic}` : topic;
}

export function formatTopicLineHe(subjectId, topicKey) {
  return formatTopicRecommendationLineHe(subjectId, topicKey);
}

/**
 * @param {string|null|undefined} classDisplayLabel
 */
export function formatTeacherClassSuffixHe(classDisplayLabel) {
  const raw = String(classDisplayLabel || "").trim();
  if (!raw) return null;
  if (/^כיתה(\s|$)/u.test(raw)) return raw;
  return `כיתה ${raw}`;
}

/**
 * @param {string} studentName
 * @param {string|null|undefined} classDisplayLabel
 */
export function formatTeacherAttentionStudentLineHe(studentName, classDisplayLabel) {
  const name = String(studentName || "").trim() || "ילד/ה";
  const suffix = formatTeacherClassSuffixHe(classDisplayLabel);
  return suffix ? `${name} · ${suffix}` : name;
}

/**
 * Dedupe recommendation rows by subject + topic label + action type.
 * @param {Array<{ subject?: string, topicLabelHe?: string|null, recommendedActionType?: string, code?: string }>} items
 */
export function dedupeTeacherRecommendationItems(items) {
  const byKey = new Map();
  for (const item of items || []) {
    const subject = String(item.subject || "");
    const topicLabelHe =
      item.topicLabelHe ||
      item.headlineHe ||
      resolveTopicLabelHe(subject, item.topic) ||
      null;
    if (!topicLabelHe) continue;
    const action = String(item.recommendedActionType || item.code || "");
    const key = `${subject}::${topicLabelHe}::${action}`;
    if (!byKey.has(key)) byKey.set(key, { ...item, topicLabelHe });
  }
  return [...byKey.values()];
}

export function guidanceSeverityTierHe(tier) {
  return GUIDANCE_SEVERITY_TIER_HE[tier] || null;
}

export function classGuidanceSeverityTierHe(tier) {
  return CLASS_GUIDANCE_SEVERITY_TIER_HE[tier] || null;
}

export function formatStudentSubjectFallbackHeadlineHe(subjectLabel) {
  const lab = String(subjectLabel || "").trim();
  return lab ? `${lab} - קושי ברמת מקצוע` : "קושי ברמת מקצוע";
}

export function formatStudentSubjectFallbackEvidenceHe(accuracyPct, totalAnswers) {
  return `${formatPercent(accuracyPct)} הצלחה מתוך ${totalAnswers} תשובות`;
}

export function formatStudentSubjectFallbackActionHe() {
  return "מומלץ לפתוח תרגול אבחוני קצר כדי לזהות את הנושא המדויק";
}

export function formatClassSubjectFallbackHeadlineHe(subjectLabel) {
  const lab = String(subjectLabel || "").trim();
  return lab ? `${lab} - קושי ברמת מקצוע בכיתה` : "קושי ברמת מקצוע בכיתה";
}

export function formatClassSubjectFallbackActionHe() {
  return "מומלץ לפתוח פעילות אבחונית קצרה או חזרה כיתתית ממוקדת";
}

/**
 * @param {Record<string, unknown>|null|undefined} guidance
 */
export function hasActionableGuidanceV2(guidance) {
  if (!guidance || guidance.version !== "v2") return false;
  const units = guidance.recommendationUnits || guidance.classRecommendationUnits;
  return Array.isArray(units) && units.length > 0;
}

/**
 * @param {Record<string, unknown>|null|undefined} guidance
 * @param {Record<string, unknown>|null|undefined} [report]
 */
export function canShowStudentCalmFocusMessage(guidance, report) {
  if (hasActionableGuidanceV2(guidance)) return false;
  const tier = guidance?.guidanceSeverityTier;
  if (tier === "critical" || tier === "needs_reinforcement") return false;
  const overall = guidance?.overallStats?.accuracyPct;
  const totalAnswers = guidance?.overallStats?.totalAnswers;
  if (
    Number.isFinite(overall) &&
    overall < 65 &&
    safeNumLocal(totalAnswers) >= 5
  ) {
    return false;
  }
  const subjects = report?.subjects;
  if (subjects && typeof subjects === "object") {
    for (const subj of Object.values(subjects)) {
      if (!subj || typeof subj !== "object") continue;
      const acc = Number(subj.accuracy);
      const ans = Number(subj.answers);
      if (Number.isFinite(acc) && acc < 65 && ans >= 5) return false;
    }
  }
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} guidance
 * @param {Record<string, unknown>|null|undefined} [report]
 */
export function canShowClassCalmWeakTopicsMessage(guidance, report) {
  if (hasActionableGuidanceV2(guidance)) return false;
  const tier = guidance?.guidanceSeverityTier || guidance?.cohortStats?.guidanceSeverityTier;
  if (
    tier === "critical_class" ||
    tier === "class_needs_reinforcement" ||
    tier === "class_monitor"
  ) {
    return false;
  }
  const cohort = report?.cohortSummary || {};
  const acc = Number(cohort.accuracy);
  const totalAnswers = Number(cohort.totalAnswers);
  if (Number.isFinite(acc) && acc < 65 && totalAnswers >= 10) return false;
  return true;
}

function safeNumLocal(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function riskSignalHe(code) {
  return RISK_SIGNAL_HE[code] || null;
}

export function supportSuggestionHe(code) {
  if (!code) return null;
  const s = String(code);
  if (SUPPORT_SUGGESTION_HE[s]) return SUPPORT_SUGGESTION_HE[s];
  if (s.startsWith("targeted_review:")) {
    const sub = s.split(":")[1];
    const lab = subjectLabelHe(sub);
    return lab ? `מומלץ לחזק את ${lab} בשיעור` : GENERIC_SUGGESTION_HE;
  }
  if (s.startsWith("focus_practice:")) {
    const sub = s.split(":")[1];
    const lab = subjectLabelHe(sub);
    return lab ? `מומלץ להתמקד בתרגול ב${lab}` : GENERIC_SUGGESTION_HE;
  }
  return null;
}

export function attentionReasonHe(code) {
  return ATTENTION_REASON_HE[code] || null;
}

export function classHealthHe(signal) {
  return CLASS_HEALTH_HE[signal] || null;
}

export function guardianAccessStateHe(state) {
  return GUARDIAN_ACCESS_STATE_HE[state] || state;
}

export function groupTierHe(tier) {
  return GROUP_TIER_HE[tier] || "-";
}

export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${Math.round(n)}%`;
}

export function formatDateHe(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function riskLevelHe(level) {
  if (level === "high") return "דורש התערבות מיידית";
  if (level === "moderate") return "כדאי לעקוב";
  if (level === "low") return "בקצב תקין";
  return null;
}

/**
 * Prefer canonical tier label; fall back to legacy riskLevel.
 * @param {Record<string, unknown>|null|undefined} guidance
 */
export function studentGuidanceHeadlineHe(guidance) {
  const tier = guidance?.guidanceSeverityTier;
  if (tier) return guidanceSeverityTierHe(tier);
  const tg = guidance?.teacherGuidance || {};
  return riskLevelHe(tg.riskLevel);
}

/** Owner-approved Hebrew labels for teacher/student activity UI. */
export function personalActivitiesSectionTitleHe() {
  return "פעילויות אישיות";
}

export function individualActivityBadgeHe() {
  return "אישי";
}

/**
 * @param {{ type?: string, className?: string, studentCount?: number, labelKey?: string }|null|undefined} option
 * @returns {string|null}
 */
export const DASHBOARD_NO_CLASSES_TITLE = "אין כיתות פעילות";
export const DASHBOARD_NO_CLASSES_HINT =
  "צור כיתה חדשה למטה, ואז הוסף ילדים דרך «ניהול כיתה» בכרטיס הכיתה.";
export const DASHBOARD_CREATE_CLASS_LABEL = "שם הכיתה";
export const DASHBOARD_CREATE_CLASS_BUTTON = "יצירת כיתה";
export const DASHBOARD_CREATE_CLASS_PLACEHOLDER = "למשל: כיתה ג׳ - LEO";

export function rosterFilterLabelHe(option) {
  if (!option) return null;
  const count = option.studentCount ?? 0;
  if ((option.type === "class" || option.type === "physical_class") && option.className) {
    return `${option.className} (${count})`;
  }
  if (option.type === "all" || option.labelKey === "teacher.roster.filter.allStudents") {
    return `כל הילדים (${count})`;
  }
  if (option.type === "direct" || option.labelKey === "teacher.roster.filter.directStudents") {
    return `ילדים פרטיים (${count})`;
  }
  return null;
}

export function teacherAuthFetch(token, url, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
}
