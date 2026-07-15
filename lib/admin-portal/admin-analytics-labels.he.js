/**
 * Hebrew display labels for Admin Analytics (`/admin/analytics`).
 * Internal keys stay English — visible UI must use these helpers.
 */

import {
  adminGradeLabelHe,
  entitlementStatusLabelHe,
  personaLabelHe,
} from "./admin-ui.he.js";
import { subjectLabelHe as platformSubjectLabelHe } from "../platform-ui/hebrew-display-labels.js";
import {
  formatParentReportGradeLabel,
  getEnglishTopicName,
  getHebrewTopicName,
  getMoledetGeographyTopicName,
  getOperationName,
  getScienceTopicName,
  getTopicName,
} from "../../utils/math-report-generator.js";
import { hebrewFromEnglishSlug, topicBucketLabelHe } from "../../utils/diagnostic-labels-he.js";

/** @type {Record<string, string>} */
export const ANALYTICS_EVENT_LABELS_HE = {
  parent_login: "כניסת הורה",
  teacher_login: "כניסת מורה",
  teacher_dashboard_opened: "פתיחת דשבורד מורה",
  teacher_report_opened: "פתיחת דוח מורה",
  teacher_activity_created: "יצירת פעילות מורה",
  teacher_worksheet_created: "יצירת דף עבודה מורה",
  parent_dashboard_opened: "פתיחת דשבורד הורה",
  child_created: "יצירת ילד",
  parent_report_opened: "פתיחת דוח הורים",
  parent_report_pdf_exported: "ייצוא PDF של דוח",
  personal_activity_created: "יצירת פעילות אישית",
  personal_activity_results_opened: "פתיחת תוצאות פעילות אישית",
  student_login: "כניסת ילד",
  student_home_opened: "פתיחת בית תלמיד",
  subject_opened: "פתיחת מקצוע",
  topic_opened: "פתיחת נושא",
  practice_started: "התחלת תרגול",
  question_answered: "מענה על שאלה",
  practice_completed: "השלמת תרגול",
  practice_abandoned: "נטישת תרגול",
  book_opened: "פתיחת ספר",
  book_section_opened: "פתיחת עמוד/חלק בספר",
  audio_played: "הפעלת שמע",
  explanation_opened: "פתיחת הסבר",
  worksheet_opened: "פתיחת דף עבודה",
  personal_activity_started: "התחלת פעילות אישית",
  personal_activity_completed: "השלמת פעילות אישית",
  reward_earned: "קבלת פרס",
  admin_analytics_opened: "פתיחת מסך אנליטיקה",
  analytics_truth_check_run: "הרצת בדיקת אמת",
  analytics_event_ingestion_error: "שגיאת קליטת אירוע",
};

/** @type {Record<string, string>} */
export const ANALYTICS_STATUS_LABELS_HE = {
  available: "זמין",
  partial: "חלקי",
  empty: "אין נתונים עדיין",
  not_enough_data: "אין מספיק נתונים עדיין",
  requires_events: "דורש איסוף אירועים",
  not_tracked: "עדיין לא נמדד",
  unavailable: "מקור נתונים לא זמין",
};

/** @type {Record<string, string>} */
export const ANALYTICS_ROLE_LABELS_HE = {
  parent: "הורה",
  student: "ילד",
  teacher: "מורה",
  private_teacher: "מורה פרטי",
  admin: "מנהל",
  unknown: "לא ידוע",
  unlinked: "לא משויך",
};

/** @type {Record<string, string>} */
const ANALYTICS_SUBJECT_LABELS_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet: "מולדת",
  geography: "גאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
  "moledet-geography": "מולדת וגאוגרפיה",
};

/** @type {Record<string, string>} */
const ANALYTICS_FEATURE_LABELS_HE = {
  practice: "תרגול",
  learning: "למידה",
  learning_book: "ספר לימוד",
  worksheet: "דף עבודה",
  parent_assigned_activity: "פעילות אישית",
  classroom_assigned_activity: "פעילות מהכיתה",
  personal_activity: "פעילות אישית",
  review: "חזרה",
  challenge: "אתגר",
  speed: "מהירות",
  marathon: "תרגול ארוך",
  diagnostic: "אבחון",
  guided_practice: "תרגול מודרך",
  quiz: "בוחן",
  homework: "שיעורי בית",
  report: "דוח",
  book: "ספר",
  audio: "שמע",
  explanation: "הסבר",
  reward: "פרס",
};

/** @type {Record<string, string>} */
const ANALYTICS_MODE_SOURCE_LABELS_HE = {
  self_practice: "תרגול עצמי",
  parent_assigned_activity: "פעילות אישית",
  learning_book: "ספר לימוד",
  worksheet: "דף עבודה",
  classroom_assigned_activity: "פעילות מהכיתה",
  practice: "תרגול",
  learning: "למידה",
};

/** @type {Record<string, string>} */
const ANALYTICS_OBJECT_TYPE_LABELS_HE = {
  subject: "מקצוע",
  topic: "נושא",
  book: "ספר",
  worksheet: "דף עבודה",
  activity: "פעילות",
  student: "ילד",
  parent: "הורה",
  teacher: "מורה",
};

/** @type {Record<string, string>} */
const ANALYTICS_TABLE_LABELS_HE = {
  parent_profiles: "פרופילי הורים",
  account_persona_entitlements: "הרשאות פרסונה",
  teacher_profiles: "פרופילי מורים",
  learning_sessions: "מפגשי למידה",
  learning_sessions_all_time: "מפגשי למידה (כל הזמנים)",
  answers: "תשובות",
  student_sessions: "כניסות תלמידים",
  parent_assigned_activities: "פעילויות שהוקצו על ידי הורה",
  parent_activity_status: "סטטוס פעילות הורה",
  parent_activity_attempts: "ניסיונות פעילות הורה",
  book_reading_sessions: "מפגשי קריאת ספר",
  book_page_visits: "ביקורי עמודי ספר",
  worksheet_student_status: "סטטוס דפי עבודה",
  coin_transactions: "עסקאות מטבעות",
  analytics_events: "אירועי אנליטיקה",
  teacher_classes: "כיתות מורה",
  teacher_students: "ילדים מקושרים למורה",
  student_activities: "פעילויות תלמיד",
  classroom_activities: "פעילויות כיתה",
  worksheet_activities: "דפי עבודה של מורה",
  solo_game_sessions: "סשני משחקי Solo",
  students: "ילדים",
  auth: "אימות",
};

/** @type {Record<string, string>} */
const ANALYTICS_SOURCE_FRAGMENT_HE = {
  "auth.users": "משתמשי אימות",
  "existing db truth": "נתוני מאגר קיים",
  analytics_events: "אירועי אנליטיקה",
  vercel_web_analytics: "אנליטיקת תנועה (Vercel)",
  aggregateparentreportpayload: "סיכום דוח הורים",
};

/** @type {Record<string, string>} */
const ANALYTICS_UNIT_LABELS_HE = {
  minutes: "דקות",
  "%": "%",
};

/** @type {Record<string, string>} */
const ANALYTICS_GRADE_LABELS_HE = {
  all: "כל הכיתות",
  unknown: "לא ידוע",
  grade_1: "כיתה א׳",
  grade_2: "כיתה ב׳",
  grade_3: "כיתה ג׳",
  grade_4: "כיתה ד׳",
  grade_5: "כיתה ה׳",
  grade_6: "כיתה ו׳",
  g1: "כיתה א׳",
  g2: "כיתה ב׳",
  g3: "כיתה ג׳",
  g4: "כיתה ד׳",
  g5: "כיתה ה׳",
  g6: "כיתה ו׳",
  "1": "כיתה א׳",
  "2": "כיתה ב׳",
  "3": "כיתה ג׳",
  "4": "כיתה ד׳",
  "5": "כיתה ה׳",
  "6": "כיתה ו׳",
};

/** @type {Record<string, string>} */
const ANALYTICS_TOPIC_SKILL_OVERRIDES_HE = {
  body: "גוף האדם",
  reading: "קריאה",
  matter: "חומר",
  angles: "זוויות",
  addition: "חיבור",
  subtraction: "חיסור",
  multiplication: "כפל",
  division: "חילוק",
  vocabulary: "אוצר מילים",
  area: "שטח",
  perimeter: "היקף",
  volume: "נפח",
  fractions: "שברים",
  mixed: "ערבוב",
  unknown: "ללא נושא",
};

/** @type {Record<string, string>} */
const ANALYTICS_COIN_REASON_HE = {
  unknown: "לא ידוע",
  practice_complete: "השלמת תרגול",
  book_read: "קריאת ספר",
  streak_bonus: "בונוס רצף",
  daily_bonus: "בונוס יומי",
};

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const ASCII_IDENTIFIER = /^[a-z][a-z0-9_:-]*$/i;
const SUBJECT_IDS_FOR_TOPIC = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];

/** English enum tokens that must never appear as visible Admin Analytics labels. */
export const ADMIN_ANALYTICS_FORBIDDEN_ENGLISH_ENUMS = Object.freeze([
  "body",
  "reading",
  "unknown",
  "multiplication",
  "matter",
  "angles",
  "addition",
  "vocabulary",
  "area",
  "grade_2",
  "grade_3",
  "grade_4",
  "grade_5",
  "practice",
  "learning_book",
  "worksheet",
  "parent_assigned_activity",
  "teacher_dashboard_opened",
  "private_teacher",
  "self_practice",
  "guided_practice",
  "classroom_assigned_activity",
  "moledet_geography",
]);

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function looksHebrew(text) {
  return HEBREW_CHAR.test(String(text || ""));
}

function isMappedTopicResult(key, result) {
  const mapped = String(result || "").trim();
  if (!mapped || mapped === key || mapped === "נושא זה") return false;
  if (looksHebrew(mapped)) return true;
  return !ASCII_IDENTIFIER.test(mapped);
}

function lookupTopicSkillHe(raw) {
  const key = normalizeKey(raw);
  if (!key) return null;
  if (ANALYTICS_TOPIC_SKILL_OVERRIDES_HE[key]) return ANALYTICS_TOPIC_SKILL_OVERRIDES_HE[key];

  const slug = hebrewFromEnglishSlug(key);
  if (slug && looksHebrew(slug)) return slug;

  const mappers = [
    getOperationName,
    getTopicName,
    getEnglishTopicName,
    getScienceTopicName,
    getHebrewTopicName,
    getMoledetGeographyTopicName,
  ];
  for (const mapper of mappers) {
    const result = mapper(key);
    if (isMappedTopicResult(key, result)) return result;
  }

  for (const subjectId of SUBJECT_IDS_FOR_TOPIC) {
    const label = topicBucketLabelHe(subjectId, key);
    if (isMappedTopicResult(key, label)) return label;
  }

  return null;
}

/** @param {string|null|undefined} subjectId */
export function formatAnalyticsSubjectHe(subjectId) {
  const key = normalizeKey(subjectId);
  if (!key || key === "unknown") return "לא ידוע";
  if (ANALYTICS_SUBJECT_LABELS_HE[key]) return ANALYTICS_SUBJECT_LABELS_HE[key];
  const platform = platformSubjectLabelHe(key);
  if (platform && platform !== "-") return platform;
  return "לא ידוע";
}

/** @param {string|null|undefined} topic */
export function formatAnalyticsTopicHe(topic) {
  const raw = String(topic || "").trim();
  if (!raw) return "ללא נושא";
  if (looksHebrew(raw)) return raw;
  const key = normalizeKey(raw);
  if (key === "unknown") return "ללא נושא";
  return lookupTopicSkillHe(raw) || "לא ידוע";
}

/** @param {string|null|undefined} skill */
export function formatAnalyticsSkillHe(skill) {
  return formatAnalyticsTopicHe(skill);
}

/** @param {string|null|undefined} grade */
export function formatAnalyticsGradeHe(grade) {
  const raw = String(grade ?? "").trim();
  if (!raw || normalizeKey(raw) === "unknown") return "לא ידוע";

  const key = normalizeKey(raw);
  if (ANALYTICS_GRADE_LABELS_HE[key]) return ANALYTICS_GRADE_LABELS_HE[key];

  const gradeMatch = key.match(/^grade_([1-6])$/);
  if (gradeMatch) return ANALYTICS_GRADE_LABELS_HE[`grade_${gradeMatch[1]}`];

  const admin = adminGradeLabelHe(raw);
  if (admin && admin !== raw && admin !== "-") return admin;

  const parentGrade = formatParentReportGradeLabel(raw);
  if (parentGrade && parentGrade !== "לא זמין") {
    return parentGrade.includes("כיתה") ? parentGrade : `כיתה ${parentGrade}`;
  }

  return "לא ידוע";
}

/** @param {string|null|undefined} name */
export function formatAnalyticsCompositeNameHe(name) {
  const raw = String(name || "").trim();
  if (!raw) return "-";
  if (looksHebrew(raw) && !/\s(?:·|:)\s/.test(raw) && !raw.includes(":")) return raw;

  const parts = raw.split(/\s*(?:·|:)\s*/).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((part) => formatAnalyticsTokenHe(part.trim())).join(" · ");
  }
  return formatAnalyticsTokenHe(raw);
}

/** @param {string|null|undefined} eventName */
export function formatAnalyticsEventNameHe(eventName) {
  const key = normalizeKey(eventName);
  if (!key) return "-";
  if (ANALYTICS_EVENT_LABELS_HE[key]) return ANALYTICS_EVENT_LABELS_HE[key];
  if (key.endsWith("_opened")) {
    const base = key.replace(/_opened$/, "");
    if (ANALYTICS_EVENT_LABELS_HE[`${base}_opened`]) return ANALYTICS_EVENT_LABELS_HE[`${base}_opened`];
  }
  const feature = formatAnalyticsFeatureHe(eventName);
  if (feature !== "לא ידוע") return feature;
  return "לא ידוע";
}

/** @param {string|null|undefined} feature */
export function formatAnalyticsFeatureHe(feature) {
  const key = normalizeKey(feature);
  if (!key || key === "unknown") return "לא ידוע";
  if (ANALYTICS_FEATURE_LABELS_HE[key]) return ANALYTICS_FEATURE_LABELS_HE[key];
  if (ANALYTICS_EVENT_LABELS_HE[key]) return ANALYTICS_EVENT_LABELS_HE[key];
  if (ANALYTICS_MODE_SOURCE_LABELS_HE[key]) return ANALYTICS_MODE_SOURCE_LABELS_HE[key];
  if (ANALYTICS_OBJECT_TYPE_LABELS_HE[key]) return ANALYTICS_OBJECT_TYPE_LABELS_HE[key];
  const topic = lookupTopicSkillHe(key);
  if (topic) return topic;
  return "לא ידוע";
}

/** @param {string|null|undefined} persona */
export function formatAnalyticsPersonaHe(persona) {
  const key = normalizeKey(persona);
  if (!key || key === "unknown") return "לא ידוע";
  if (ANALYTICS_ROLE_LABELS_HE[key]) return ANALYTICS_ROLE_LABELS_HE[key];
  const personaLabel = personaLabelHe(key);
  if (personaLabel !== "-") return personaLabel;
  return "לא ידוע";
}

/** @param {string|null|undefined} role */
export function formatAnalyticsRoleHe(role) {
  const key = normalizeKey(role);
  if (!key || key === "unknown") return "לא ידוע";
  return ANALYTICS_ROLE_LABELS_HE[key] || formatAnalyticsPersonaHe(key);
}

/** @param {string|null|undefined} status */
export function formatAnalyticsStatusHe(status) {
  const key = normalizeKey(status);
  if (!key) return "-";
  return ANALYTICS_STATUS_LABELS_HE[key] || "-";
}

/** @param {string|null|undefined} value */
export function formatAnalyticsFallbackHe(value) {
  const key = normalizeKey(value);
  if (!key || key === "unknown") return "לא ידוע";
  return "לא ידוע";
}

/** @param {string|null|undefined} unit */
export function formatAnalyticsUnitHe(unit) {
  const key = normalizeKey(unit);
  if (!key) return null;
  return ANALYTICS_UNIT_LABELS_HE[key] || unit;
}

/** @param {string|null|undefined} table */
export function formatAnalyticsTableHe(table) {
  const key = normalizeKey(table);
  if (!key) return "-";
  return ANALYTICS_TABLE_LABELS_HE[key] || table || "-";
}

/** @param {string|null|undefined} reason */
function formatAnalyticsCoinReasonHe(reason) {
  const key = normalizeKey(reason);
  if (!key || key === "unknown") return "לא ידוע";
  return ANALYTICS_COIN_REASON_HE[key] || "לא ידוע";
}

/** @param {string|null|undefined} token */
function formatAnalyticsTokenHe(token) {
  const raw = String(token || "").trim();
  if (!raw) return "-";
  const key = normalizeKey(raw);

  if (looksHebrew(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^[0-9a-f-]{36}$/i.test(raw)) return "מזהה פנימי";

  if (ANALYTICS_EVENT_LABELS_HE[key]) return ANALYTICS_EVENT_LABELS_HE[key];
  if (ANALYTICS_ROLE_LABELS_HE[key]) return ANALYTICS_ROLE_LABELS_HE[key];
  if (ANALYTICS_GRADE_LABELS_HE[key]) return formatAnalyticsGradeHe(raw);
  if (ANALYTICS_STATUS_LABELS_HE[key]) return formatAnalyticsStatusHe(raw);
  if (ANALYTICS_FEATURE_LABELS_HE[key]) return ANALYTICS_FEATURE_LABELS_HE[key];
  if (ANALYTICS_MODE_SOURCE_LABELS_HE[key]) return ANALYTICS_MODE_SOURCE_LABELS_HE[key];
  if (ANALYTICS_OBJECT_TYPE_LABELS_HE[key]) return ANALYTICS_OBJECT_TYPE_LABELS_HE[key];
  if (ANALYTICS_COIN_REASON_HE[key]) return formatAnalyticsCoinReasonHe(key);

  const subject = formatAnalyticsSubjectHe(key);
  if (subject !== "לא ידוע") return subject;

  const topic = lookupTopicSkillHe(raw);
  if (topic) return topic;

  const persona = formatAnalyticsPersonaHe(key);
  if (persona !== "לא ידוע") return persona;

  const entitlement = entitlementStatusLabelHe(key);
  if (entitlement !== "-") return entitlement;

  const grade = formatAnalyticsGradeHe(raw);
  if (grade !== "לא ידוע") return grade;

  const feature = formatAnalyticsFeatureHe(raw);
  if (feature !== "לא ידוע") return feature;

  return formatAnalyticsFallbackHe(raw);
}

/** @param {string|null|undefined} label */
export function formatAnalyticsLabelHe(label) {
  const raw = String(label || "").trim();
  if (!raw) return "-";
  return formatAnalyticsCompositeNameHe(raw)
    .replace(/\bAuth\b/gi, "אימות")
    .replace(/\bDB\b/g, "מאגר נתונים")
    .replace(/\bpersona\b/gi, "פרסונה")
    .replace(/\bPhase 1\b/gi, "שלב 1");
}

/** @param {string|null|undefined} source */
export function formatAnalyticsSourceHe(source) {
  const raw = String(source || "").trim();
  if (!raw) return "-";

  const lower = raw.toLowerCase();
  for (const [fragment, heLabel] of Object.entries(ANALYTICS_SOURCE_FRAGMENT_HE)) {
    if (lower === fragment || lower.startsWith(`${fragment}.`) || lower.startsWith(`${fragment} `)) {
      return heLabel;
    }
  }

  if (lower.startsWith("analytics_events.")) {
    const eventPart = raw.slice("analytics_events.".length).split(/[\s+]/)[0];
    return `אירועי אנליטיקה · ${formatAnalyticsEventNameHe(eventPart)}`;
  }

  if (lower.includes("analytics_events")) {
    return raw
      .split(/\s+/)
      .map((part) => {
        const partLower = part.toLowerCase();
        if (partLower === "analytics_events") return "אירועי אנליטיקה";
        if (partLower.startsWith("analytics_events.")) {
          return `אירועי אנליטיקה · ${formatAnalyticsEventNameHe(part.slice("analytics_events.".length))}`;
        }
        if (ANALYTICS_EVENT_LABELS_HE[normalizeKey(part)]) return formatAnalyticsEventNameHe(part);
        if (partLower === "actor_type=parent") return "סוג משתמש: הורה";
        if (partLower === "actor_type=student") return "סוג משתמש: ילד";
        if (partLower === "actor_type=teacher") return "סוג משתמש: מורה";
        if (partLower.endsWith("_*")) return `${formatAnalyticsEventNameHe(part.slice(0, -2))} (כל הסוגים)`;
        return formatAnalyticsLabelHe(part.replace(/\./g, " · "));
      })
      .join(" ");
  }

  return raw
    .split("+")
    .map((part) =>
      part
        .trim()
        .split(".")
        .map((segment) => formatAnalyticsTableHe(segment.split(/[=(]/)[0]) || segment)
        .join(" · ")
    )
    .join(" + ");
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findAdminAnalyticsEnglishEnumLeaks(text) {
  const lower = String(text || "").toLowerCase();
  const hits = [];
  for (const token of ADMIN_ANALYTICS_FORBIDDEN_ENGLISH_ENUMS) {
    const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) hits.push(token);
  }
  for (const token of ["math", "english", "hebrew", "science", "geometry", "moledet"]) {
    const re = new RegExp(`\\b${token}\\b`, "i");
    if (re.test(lower) && !looksHebrew(text)) hits.push(token);
  }
  return hits;
}

const WEB_TRAFFIC_DEVICE_LABELS_HE = {
  mobile: "נייד",
  desktop: "מחשב",
  tablet: "טאבלט",
};

/**
 * Vercel Web Analytics labels — never route through learning topic/skill mappers.
 * @param {string|null|undefined} raw
 * @param {"daily"|"requestPath"|"referrerHostname"|"deviceType"|"browserName"|"country"|"generic"} [dimension]
 */
export function formatWebTrafficLabelHe(raw, dimension = "generic") {
  const value = String(raw ?? "").trim();
  if (!value) return "-";

  if (dimension === "daily") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const day = parsed.getUTCDate();
      const month = parsed.getUTCMonth() + 1;
      const year = parsed.getUTCFullYear();
      return `${day}.${month}.${year}`;
    }
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return `${Number(dateOnly[3])}.${Number(dateOnly[2])}.${dateOnly[1]}`;
    }
    return value;
  }

  if (dimension === "deviceType") {
    const key = value.toLowerCase();
    return WEB_TRAFFIC_DEVICE_LABELS_HE[key] || value;
  }

  if (dimension === "requestPath") {
    const WEB_TRAFFIC_PAGE_LABELS_HE = {
      "/": "דף הבית",
      "/parent/login": "כניסת הורים",
      "/student/login": "כניסת תלמידים",
      "/parent/dashboard": "אזור הורים",
    };
    return WEB_TRAFFIC_PAGE_LABELS_HE[value] || value;
  }

  return value;
}

/** Aliases requested for Admin Analytics SSOT naming. */
export const formatAdminAnalyticsSubjectHe = formatAnalyticsSubjectHe;
export const formatAdminAnalyticsTopicHe = formatAnalyticsTopicHe;
export const formatAdminAnalyticsSkillHe = formatAnalyticsSkillHe;
export const formatAdminAnalyticsGradeHe = formatAnalyticsGradeHe;
export const formatAdminAnalyticsCompositeNameHe = formatAnalyticsCompositeNameHe;
export const formatAdminAnalyticsEventNameHe = formatAnalyticsEventNameHe;
export const formatAdminAnalyticsFeatureHe = formatAnalyticsFeatureHe;
export const formatAdminAnalyticsPersonaHe = formatAnalyticsPersonaHe;
export const formatAdminAnalyticsStatusHe = formatAnalyticsStatusHe;
export const formatAdminAnalyticsFallbackHe = formatAnalyticsFallbackHe;
