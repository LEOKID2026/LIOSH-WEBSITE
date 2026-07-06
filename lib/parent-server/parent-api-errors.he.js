/**
 * Hebrew error mappers for parent dashboard and report surfaces.
 * Never pass raw English API errors to parents.
 */

const PARENT_REPORT_LOAD_FALLBACK = "לא ניתן לטעון את דוח ההורה.";

const CODE_TO_HE = {
  guest_not_eligible: "לא זמין לאורח",
  grade_required: "יש לבחור כיתה",
  not_a_parent: "חשבון זה אינו מורשה לגישת הורים.",
  student_not_found: "ילד/ה לא נמצא/ה.",
  reports_disabled: "דוחות הורים אינם זמינים כרגע.",
  invalid_date_params: "טווח התאריכים אינו תקין.",
  unauthorized: "נדרשת התחברות מחדש.",
  forbidden: "אין גישה לדוח של ילד/ה זה.",
};

const ENGLISH_SNIPPET_RE = /[A-Za-z]{4,}/;

/**
 * @param {number} status
 * @param {string|null|undefined} code
 * @param {string|null|undefined} rawError
 * @param {{ isTeacher?: boolean }} [opts]
 */
export function mapParentReportLoadError(status, code, rawError, opts = {}) {
  const normalizedCode = String(code || "").trim();
  if (normalizedCode && CODE_TO_HE[normalizedCode]) {
    return CODE_TO_HE[normalizedCode];
  }

  if (status === 401) {
    return opts.isTeacher ? "נדרשת התחברות מחדש כמורה." : "נדרשת התחברות מחדש כהורה.";
  }
  if (status === 403 || status === 404) {
    return "אין גישה לדוח של ילד/ה זה.";
  }
  if (status === 400) {
    return CODE_TO_HE.invalid_date_params;
  }

  const raw = String(rawError || "").trim();
  if (raw && !ENGLISH_SNIPPET_RE.test(raw)) {
    return raw;
  }

  return PARENT_REPORT_LOAD_FALLBACK;
}

/**
 * @param {number} status
 * @param {string|null|undefined} code
 * @param {string|null|undefined} rawError
 * @param {"load_students"|"create_student"|"update_student"|"generic"} context
 */
export function mapParentDashboardApiError(status, code, rawError, context = "generic") {
  const normalizedCode = String(code || "").trim();
  if (normalizedCode && CODE_TO_HE[normalizedCode]) {
    return CODE_TO_HE[normalizedCode];
  }

  if (status === 401) return "נדרשת התחברות מחדש.";
  if (status === 403) return "אין הרשאה לפעולה זו.";

  const raw = String(rawError || "").trim();
  if (raw && !ENGLISH_SNIPPET_RE.test(raw)) {
    return raw;
  }

  if (context === "load_students") return "לא הצלחנו לטעון את רשימת הילדים.";
  if (context === "create_student") return "לא הצלחנו להוסיף את הילד/ה.";
  if (context === "update_student") return "לא הצלחנו לעדכן את פרטי הילד/ה.";
  return "לא ניתן להשלים את הפעולה. נסו שוב.";
}

export function parentDashboardCreateSuccessHe() {
  return "הילד/ה נוסף/ה בהצלחה.";
}

export function parentDashboardUpdateSuccessHe() {
  return "עדכון הילד/ה נשמר.";
}

/**
 * @param {unknown} raw
 * @param {"load"|"save"|"generic"} context
 */
export function mapParentPanelApiError(raw, context = "generic") {
  const s = String(raw || "").trim();
  if (s && !ENGLISH_SNIPPET_RE.test(s)) return s;
  if (context === "load") return "לא הצלחנו לטעון את הנתונים.";
  if (context === "save") return "לא הצלחנו לשמור את השינויים.";
  return "לא ניתן להשלים את הפעולה. נסו שוב.";
}
