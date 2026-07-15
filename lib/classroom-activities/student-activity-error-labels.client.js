/**
 * Student-facing Hebrew labels for classroom activity API errors.
 * Internal codes stay English in APIs — children must never see raw snake_case keys.
 */

/** @type {Record<string, string>} */
export const STUDENT_ACTIVITY_ERROR_LABEL_HE = {
  activity_not_available: "הפעילות אינה זמינה כרגע",
  activity_not_found: "לא נמצאה פעילות כזו",
  activity_not_started: "הפעילות עדיין לא התחילה",
  activity_not_accepting_answers: "לא ניתן לשלוח תשובות לפעילות זו כרגע",
  activity_closed: "הפעילות נסגרה",
  activity_expired: "הזמן לפעילות הסתיים",
  invalid_activity: "לא ניתן לפתוח את הפעילות כרגע",
  not_found: "לא נמצא",
  unauthorized: "נדרשת התחברות",
  not_authenticated: "נדרשת התחברות",
  forbidden: "אין הרשאה לפתוח את הפעילות",
  not_assigned: "הפעילות לא משויכת אליך",
  student_not_assigned: "הפעילות לא משויכת אליך",
  student_not_in_activity: "הפעילות לא משויכת אליך",
  missing_student: "לא ניתן לזהות את החשבון",
  validation_failed: "לא ניתן לבצע את הפעולה כרגע",
  already_submitted: "כבר הגשת את הפעילות",
  question_already_answered: "כבר שלחת תשובה לשאלה זו",
  question_not_broadcast: "ממתינים למורה…",
  answer_not_required: "אין צורך להגיש תשובה",
  db_schema_not_ready: "המערכת מתעדכנת - נסו שוב מאוחר יותר",
  internal_error: "שגיאה - נסו שוב",
  unexpected_error: "שגיאה - נסו שוב",
  server_error: "שגיאת שרת - נסו שוב",
  method_not_allowed: "פעולה לא נתמכת",
  question_missing: "לא ניתן לטעון את השאלה כרגע",
  question_missing_answer: "לא ניתן לשלוח תשובה כרגע",
};

/** @type {Record<string, string>} */
const STUDENT_ACTIVITY_ENGLISH_LITERAL_HE = {
  not_authenticated: "נדרשת התחברות",
  server_error: "שגיאת שרת - נסו שוב",
  method_not_allowed: "פעולה לא נתמכת",
  questionindex_required: "לא ניתן לשלוח תשובה כרגע",
};

const INTERNAL_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * @param {unknown} value
 */
function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * @param {unknown} value
 */
export function isInternalLookingStudentActivityErrorCode(value) {
  const key = normalizeKey(value);
  return Boolean(key && INTERNAL_CODE_PATTERN.test(key));
}

/**
 * @param {unknown} codeOrMessage
 * @param {string} [fallback]
 */
export function formatStudentActivityErrorHe(
  codeOrMessage,
  fallback = "לא ניתן לפתוח את הפעילות כרגע"
) {
  const raw = String(codeOrMessage ?? "").trim();
  if (!raw) return fallback;

  const key = normalizeKey(raw);
  if (STUDENT_ACTIVITY_ERROR_LABEL_HE[key]) {
    return STUDENT_ACTIVITY_ERROR_LABEL_HE[key];
  }
  if (STUDENT_ACTIVITY_ENGLISH_LITERAL_HE[key]) {
    return STUDENT_ACTIVITY_ENGLISH_LITERAL_HE[key];
  }

  if (/[\u0590-\u05FF]/.test(raw)) {
    return raw;
  }

  if (isInternalLookingStudentActivityErrorCode(key)) {
    return fallback;
  }

  if (/^[a-z0-9_.\s-]+$/i.test(raw)) {
    return fallback;
  }

  return raw;
}

/**
 * @param {{ error?: unknown, code?: unknown, message?: unknown }|string|null|undefined} payload
 * @param {string} [fallback]
 */
export function resolveStudentActivityApiErrorHe(
  payload,
  fallback = "לא ניתן לפתוח את הפעילות כרגע"
) {
  if (typeof payload === "string") {
    return formatStudentActivityErrorHe(payload, fallback);
  }
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidates = [payload.error, payload.code, payload.message].filter(
    (value) => value != null && String(value).trim()
  );

  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (STUDENT_ACTIVITY_ERROR_LABEL_HE[key]) {
      return STUDENT_ACTIVITY_ERROR_LABEL_HE[key];
    }
    if (STUDENT_ACTIVITY_ENGLISH_LITERAL_HE[key]) {
      return STUDENT_ACTIVITY_ENGLISH_LITERAL_HE[key];
    }
    if (/[\u0590-\u05FF]/.test(String(candidate))) {
      return String(candidate).trim();
    }
  }

  for (const candidate of candidates) {
    if (isInternalLookingStudentActivityErrorCode(candidate)) {
      return fallback;
    }
  }

  return fallback;
}
