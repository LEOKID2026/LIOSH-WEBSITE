/**
 * Central Hebrew display labels for school / admin / teacher management UI.
 * Internal keys stay English in code — browser-visible text must use these helpers.
 */

export const SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
];

/** @type {Record<string, string>} */
export const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גיאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet: "מולדת וגאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
  "moledet-geography": "מולדת וגאוגרפיה",
};

/** @type {Record<string, string>} */
export const ACTIVITY_MODE_LABEL_HE = {
  live_lesson: "שיעור חי",
  guided_practice: "תרגול מודרך",
  quiz: "בוחן",
  homework: "שיעורי בית",
  discussion: "דיון",
  practice: "תרגול",
  review: "חזרה",
};

/** @type {Record<string, string>} */
export const ACTIVITY_STATUS_LABEL_HE = {
  draft: "טיוטה",
  active: "פעילה",
  paused: "מושהית",
  closed: "נסגרה",
  archived: "בארכיון",
};

/** @type {Record<string, string>} */
export const STUDENT_ACTIVITY_STATUS_LABEL_HE = {
  not_started: "טרם התחיל",
  in_progress: "בתהליך",
  submitted: "הוגש",
  completed: "הושלם",
  timed_out: "נגמר הזמן",
};

/** @type {Record<string, string>} */
export const ROLE_LABEL_HE = {
  teacher: "מורה",
  school_admin: "מנהל/ת בית ספר",
  admin: "מנהל מערכת",
};

/** @type {Record<string, string>} */
export const AUDIT_ACTION_LABEL_HE = {
  school_subject_granted: "מתן הרשאת מקצוע",
  school_subject_revoked: "הסרת הרשאת מקצוע",
  school_student_enrolled: "רישום תלמיד",
  school_student_unenrolled: "ביטול רישום תלמיד",
  school_class_viewed: "צפייה בדוח כיתה",
  school_student_report_viewed: "צפייה בדוח תלמיד",
  school_student_class_transferred: "העברת תלמיד",
  school_class_teacher_reassigned: "שינוי מורה בכיתה",
  school_class_archived: "ארכוב כיתה",
  assign_teacher: "שיוך מורה",
  assign_manager: "מינוי מנהל/ת",
  class_transfer: "העברת תלמיד",
  grant: "מתן הרשאה",
  revoke: "הסרת הרשאה",
  archive: "ארכוב",
  viewed_student_report: "צפייה בדוח תלמיד",
  viewed_class_report: "צפייה בדוח כיתה",
  grant_created: "יצירת הרשאת גישה",
  grant_revoked: "ביטול הרשאת גישה",
  magic_link_issued: "הנפקת קישור כניסה",
  pin_rotated: "החלפת קוד PIN",
  username_rotated: "החלפת שם משתמש",
  teacher_quota_updated: "עדכון מכסות",
  teacher_features_updated: "עדכון הרשאות תכונות",
  teacher_status_updated: "עדכון סטטוס חשבון",
};

/** @type {Record<string, string>} */
export const API_ERROR_LABEL_HE = {
  not_a_school_manager: "אין הרשאת מנהל/ת בית ספר",
  school_inactive: "בית הספר אינו פעיל",
  feature_disabled: "הפורטל אינו זמין כרגע",
  unauthorized: "נדרשת התחברות",
  forbidden: "אין הרשאה",
  validation_failed: "נתונים לא תקינים",
  method_not_allowed: "פעולה לא נתמכת",
  internal_error: "שגיאת שרת — נסו שוב",
  db_schema_not_ready: "המערכת עדיין מתעדכנת — נסו מאוחר יותר",
  subject_already_granted: "המקצוע כבר משויך למורה",
  teacher_subject_not_granted: "למורה אין הרשאה במקצוע זה",
  invalid_audit_action: "סוג פעולה לא תקין",
  not_found: "לא נמצא",
};

const RAW_KEY_PATTERN =
  /^(math|geometry|hebrew|english|science|moledet_geography|moledet|guided_practice|quiz|homework|practice|review|draft|active|paused|closed|archived|submitted|in_progress|not_started|school_admin|teacher|admin)$/i;

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function unknownDisplayHe() {
  return "—";
}

/**
 * @param {string|null|undefined} key
 */
export function subjectLabelHe(key) {
  if (!key) return unknownDisplayHe();
  const k = normalizeKey(key);
  return SUBJECT_LABEL_HE[k] || unknownDisplayHe();
}

/**
 * @param {string|null|undefined} mode
 */
export function activityModeLabelHe(mode) {
  if (!mode) return unknownDisplayHe();
  const k = normalizeKey(mode);
  return ACTIVITY_MODE_LABEL_HE[k] || unknownDisplayHe();
}

/**
 * @param {string|null|undefined} status
 */
export function activityStatusLabelHe(status) {
  if (!status) return unknownDisplayHe();
  const k = normalizeKey(status);
  return ACTIVITY_STATUS_LABEL_HE[k] || unknownDisplayHe();
}

/**
 * @param {string|null|undefined} status
 */
export function studentActivityStatusLabelHe(status) {
  if (!status) return unknownDisplayHe();
  const k = normalizeKey(status);
  return STUDENT_ACTIVITY_STATUS_LABEL_HE[k] || unknownDisplayHe();
}

/**
 * @param {string|null|undefined} role
 */
export function roleLabelHe(role) {
  if (!role) return unknownDisplayHe();
  const k = normalizeKey(role);
  return ROLE_LABEL_HE[k] || unknownDisplayHe();
}

/**
 * @param {string|null|undefined} action
 */
export function auditActionLabelHe(action) {
  if (!action) return unknownDisplayHe();
  const k = normalizeKey(action);
  return AUDIT_ACTION_LABEL_HE[k] || "פעולת מערכת";
}

/**
 * @param {{ code?: string|null, message?: string|null }|string|null|undefined} error
 * @param {string} [fallback]
 */
export function apiErrorMessageHe(error, fallback = "שגיאה — נסו שוב") {
  if (!error) return fallback;
  if (typeof error === "string") {
    const k = normalizeKey(error);
    return API_ERROR_LABEL_HE[k] || (RAW_KEY_PATTERN.test(k) ? fallback : error);
  }
  const code = normalizeKey(error.code);
  if (code && API_ERROR_LABEL_HE[code]) return API_ERROR_LABEL_HE[code];
  const message = String(error.message || "").trim();
  if (message && !RAW_KEY_PATTERN.test(normalizeKey(message)) && !/^[a-z][a-z0-9_]*$/i.test(message)) {
    return message;
  }
  if (code && API_ERROR_LABEL_HE[code]) return API_ERROR_LABEL_HE[code];
  return fallback;
}

/**
 * @returns {{ value: string, label: string }[]}
 */
export function subjectSelectOptionsHe() {
  return SUBJECT_ORDER.map((value) => ({
    value,
    label: SUBJECT_LABEL_HE[value],
  }));
}

/**
 * @param {string|null|undefined} title
 * @param {string|null|undefined} subject
 */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace raw internal keys embedded anywhere in visible copy. */
function replaceRawKeysInText(text) {
  let out = String(text || "");
  const replacements = [
    ...SUBJECT_ORDER.map((sid) => [sid, SUBJECT_LABEL_HE[sid]]),
    ["moledet-geography", SUBJECT_LABEL_HE.moledet_geography],
    ...Object.entries(ACTIVITY_MODE_LABEL_HE),
    ...Object.entries(ACTIVITY_STATUS_LABEL_HE),
  ];
  for (const [key, heLabel] of replacements) {
    if (!key || !heLabel) continue;
    const pattern = escapeRegExp(key).replace(/_/g, "[_\\s-]+");
    out = out.replace(new RegExp("\\b" + pattern + "\\b", "gi"), heLabel);
    if (out.toLowerCase() === key.toLowerCase()) out = heLabel;
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeActivityTitleHe(title, subject) {
  const raw = String(title || "").trim();
  const subjHe = subjectLabelHe(subject);
  if (!raw) return subjHe !== "—" ? `פעילות ${subjHe}` : "פעילות כיתה";
  let out = raw;
  for (const sid of SUBJECT_ORDER) {
    const re = new RegExp("^" + sid.replace("_", "[_ ]") + "\\s*[-:\\u2014]\\s*", "i");
    if (re.test(out)) {
      out = out.replace(re, subjHe !== "—" ? `${subjHe} · ` : "");
      break;
    }
    if (out.toLowerCase() === sid || out.toLowerCase().startsWith(`${sid} `)) {
      out = out.replace(new RegExp(`^${sid}`, "i"), subjHe !== "—" ? subjHe : "פעילות");
      break;
    }
  }
  out = replaceRawKeysInText(out);
  if (subjHe !== "—" && !out.includes(subjHe)) {
    out = out.replace(/\s*[-:\u2014]\s*$/u, "").trim();
  }
  return out || (subjHe !== "—" ? `פעילות ${subjHe}` : "פעילות כיתה");
}

/** Keys that must never appear as visible UI text when mapped through helpers. */
export const RAW_VISIBLE_KEY_DENYLIST = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
  "guided_practice",
  "quiz",
  "homework",
  "draft",
  "active",
  "paused",
  "closed",
  "archived",
  "submitted",
  "in_progress",
  "not_started",
  "school_admin",
  "teacher",
];
