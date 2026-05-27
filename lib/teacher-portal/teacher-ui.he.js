/**
 * Hebrew UI strings and label helpers for Teacher Portal + Guardian Access.
 * Client-safe — no server secrets.
 */

import { topicBucketLabelHe } from "../../utils/diagnostic-labels-he.js";
import {
  subjectLabelHe as platformSubjectLabelHe,
  SUBJECT_LABEL_HE,
} from "../platform-ui/hebrew-display-labels.js";

export const REPORT_SUBJECTS = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
];

export { SUBJECT_LABEL_HE };

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

const CLASS_HEALTH_HE = {
  no_data: "אין מספיק נתונים",
  needs_support: "הכיתה זקוקה לתמיכה",
  strong: "ביצועים טובים בכיתה",
  progressing: "הכיתה מתקדמת כסדרה",
};

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

export function subjectLabelHe(subjectId) {
  return platformSubjectLabelHe(subjectId);
}

export function topicLabelHe(subjectId, topicKey) {
  if (!topicKey) return null;
  const sid =
    subjectId === "moledet_geography" ? "moledet-geography" : String(subjectId || "");
  const label = topicBucketLabelHe(sid, topicKey);
  if (!label || label === "נושא זה") return null;
  return label;
}

export function formatTopicLineHe(subjectId, topicKey) {
  const subj = subjectLabelHe(subjectId);
  const rawTopic = String(topicKey || "").trim();
  if (!rawTopic) return subj || null;
  const normalizedTopic = rawTopic.toLowerCase();
  if (normalizedTopic === String(subjectId || "").toLowerCase()) return subj || null;
  if (REPORT_SUBJECTS.includes(normalizedTopic)) {
    return subjectLabelHe(normalizedTopic) || subj || null;
  }
  const topic = topicLabelHe(subjectId, topicKey);
  if (topic && topic === rawTopic) return subj || null;
  if (subj && topic) return `${subj} — ${topic}`;
  if (subj) return subj;
  return topic || null;
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
  return GROUP_TIER_HE[tier] || "—";
}

export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

export function formatDateHe(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function riskLevelHe(level) {
  if (level === "high") return "דורש תשומת לב";
  if (level === "moderate") return "כדאי לעקוב";
  if (level === "low") return "בקצב תקין";
  return null;
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
  "צור כיתה חדשה למטה, ואז הוסף תלמידים דרך «ניהול כיתה» בכרטיס הכיתה.";
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
    return `כל התלמידים (${count})`;
  }
  if (option.type === "direct" || option.labelKey === "teacher.roster.filter.directStudents") {
    return `תלמידים פרטיים (${count})`;
  }
  return null;
}

export function teacherAuthFetch(token, url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
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
