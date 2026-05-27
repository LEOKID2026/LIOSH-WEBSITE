/** Hebrew UI strings for school manager portal. */

import {
  ACTIVITY_MODE_LABEL_HE,
  ACTIVITY_STATUS_LABEL_HE,
  SUBJECT_LABEL_HE,
  SUBJECT_ORDER,
  activityModeLabelHe as platformActivityModeLabelHe,
  activityStatusLabelHe as platformActivityStatusLabelHe,
  apiErrorMessageHe,
  auditActionLabelHe,
  roleLabelHe,
  sanitizeActivityTitleHe,
  subjectLabelHe as platformSubjectLabelHe,
  subjectSelectOptionsHe,
} from "../platform-ui/hebrew-display-labels.js";

export {
  apiErrorMessageHe,
  auditActionLabelHe,
  roleLabelHe,
  sanitizeActivityTitleHe,
  subjectSelectOptionsHe,
};

export const SCHOOL_PLATFORM_LABEL = "ניהול בית ספר";
export const SCHOOL_NAV_DASHBOARD = "לוח בקרה";
export const SCHOOL_NAV_TEACHERS = "מורים";
export const SCHOOL_NAV_CLASSES = "כיתות";
export const SCHOOL_NAV_STUDENTS = "תלמידים";
export const SCHOOL_NAV_MY_TEACHER = "לוח המורה שלי";
export const SCHOOL_LOADING = "טוען…";
export const SCHOOL_LOADING_DATA = "טוען נתונים…";
export const SCHOOL_LOAD_ERROR = "שגיאה בטעינת הנתונים";
export const SCHOOL_CLASS_REPORT_TITLE = "דוח כיתה";
export const SCHOOL_STUDENT_REPORT_TITLE = "דוח תלמיד";
export const SCHOOL_RETRY = "נסו שוב";
export const SCHOOL_REFRESH = "רענון נתונים";

export const SCHOOL_DASHBOARD_TITLE = "לוח בקרת בית הספר";
export const SCHOOL_DASHBOARD_SUBTITLE = "סקירה כללית, פעולות מהירות ומעקב אחרי פעילות בבית הספר";
export const SCHOOL_STAT_TEACHERS = "מורים בבית הספר";
export const SCHOOL_STAT_STUDENTS = "תלמידים רשומים";
export const SCHOOL_STAT_CLASSES = "כיתות פעילות";
export const SCHOOL_STAT_ACTIVITIES = "פעילויות פעילות";

export const SCHOOL_QUICK_TEACHERS = "ניהול מורים";
export const SCHOOL_QUICK_TEACHERS_DESC = "צפייה במורים, תפקידים והרשאות מקצועות";
export const SCHOOL_QUICK_CLASSES = "ניהול כיתות";
export const SCHOOL_QUICK_CLASSES_DESC = "כיתות לפי מורה, כיתה ומקצוע";
export const SCHOOL_QUICK_STUDENTS = "ניהול תלמידים";
export const SCHOOL_QUICK_STUDENTS_DESC = "רישום תלמידים וקישור למורים";
export const SCHOOL_QUICK_ACTIVITIES = "פעילויות כיתה";
export const SCHOOL_QUICK_ACTIVITIES_DESC = "מעקב אחרי פעילויות אחרונות בבית הספר";

export const SCHOOL_SECTION_RECENT = "פעילויות אחרונות";
export const SCHOOL_SECTION_ALERTS = "דורש תשומת לב";
export const SCHOOL_SECTION_QUICK = "פעולות מהירות";
export const SCHOOL_EMPTY_ACTIVITIES = "אין פעילויות כיתה להצגה כרגע.";
export const SCHOOL_EMPTY_ACTIVITIES_HINT = "כשמורים ייצרו פעילויות, הן יופיעו כאן.";
export const SCHOOL_EMPTY_TEACHERS = "אין מורים משויכים מלבד מנהל/ת בית הספר.";
export const SCHOOL_EMPTY_CLASSES = "אין כיתות רשומות לבית הספר.";
export const SCHOOL_EMPTY_STUDENTS = "אין תלמידים רשומים לבית הספר.";
export const SCHOOL_EMPTY_STUDENTS_HINT = "ניתן לרשום תלמיד לפי מזהה UUID בטופס למעלה.";

export const SCHOOL_ALERT_NO_STUDENTS = "אין תלמידים רשומים — מומלץ לרשום תלמידים לבית הספר.";
export const SCHOOL_ALERT_FEW_TEACHERS = "יש מעט מורים פעילים — שקלו לשייך מורים נוספים.";
export const SCHOOL_ALERT_ACTIVE_ACTIVITIES = "יש פעילויות כיתה פעילות כעת.";

export const SCHOOL_TEACHERS_TITLE = "מורים בבית הספר";
export const SCHOOL_TEACHERS_SUBTITLE = "רשימת מורים, תפקידים, מקצועות ופעילות";
export const SCHOOL_COL_NAME = "שם";
export const SCHOOL_COL_ROLE = "תפקיד";
export const SCHOOL_COL_SUBJECTS = "מקצועות";
export const SCHOOL_COL_CLASSES = "כיתות";
export const SCHOOL_COL_STUDENTS = "תלמידים מקושרים";
export const SCHOOL_COL_ACTIONS = "פעולות";
export const SCHOOL_ROLE_MANAGER = "מנהל/ת בית ספר";
export const SCHOOL_ROLE_TEACHER = "מורה";
export const SCHOOL_MANAGE_SUBJECTS = "הרשאות מקצועות";
export const SCHOOL_VIEW_DETAILS = "פרטים";
export const SCHOOL_ALL_SUBJECTS = "כל המקצועות";
export const SCHOOL_INACTIVE = "לא פעיל";

export const SCHOOL_CLASSES_TITLE = "כיתות בבית הספר";
export const SCHOOL_CLASSES_SUBTITLE = "בחירת שכבה, כיתה פיזית ומקצוע — דוחות וניהול לפי שכבות";
export const SCHOOL_CHOOSE_GRADE = "בחרו שכבה";
export const SCHOOL_CHOOSE_PHYSICAL_CLASS = "בחרו כיתה";
export const SCHOOL_CHOOSE_SUBJECT = "מקצועות הכיתה";
export const SCHOOL_CHOOSE_STUDENTS = "תלמידי הכיתה";
export const SCHOOL_BACK = "חזרה";
export const SCHOOL_BACK_GRADES = "← חזרה לשכבות";
export const SCHOOL_BACK_CLASSES = "← חזרה לכיתות";
export const SCHOOL_STUDENTS_IN_CLASS = "תלמידים בכיתה";
export const SCHOOL_ACTIVITIES_IN_CLASS = "פעילויות";
export const SCHOOL_TEACHER_LABEL = "מורה";
export const SCHOOL_SUBJECT_LABEL = "מקצוע";
export const SCHOOL_CLASS_LABEL = "כיתה";
export const SCHOOL_STATUS_LABEL = "סטטוס";
export const SCHOOL_ACTIVITY_TYPE_LABEL = "סוג פעילות";
export const SCHOOL_ARCHIVED = "בארכיון";
export const SCHOOL_COL_CLASS = "כיתה";
export const SCHOOL_COL_GRADE = "שכבה";
export const SCHOOL_COL_SUBJECT_FOCUS = "מקצוע";
export const SCHOOL_COL_TEACHER = "מורה";
export const SCHOOL_COL_MEMBERS = "תלמידים בכיתה";
export const SCHOOL_VIEW_CLASS_REPORT = "דוח כיתה";

export const SCHOOL_STUDENTS_TITLE = "תלמידים רשומים";
export const SCHOOL_STUDENTS_SUBTITLE = "עיון לפי שכבה וכיתה — דוחות תלמיד ללא הזנת מזהים";
export const SCHOOL_COL_STUDENT = "תלמיד/ה";
export const SCHOOL_COL_LINKED = "מורים מקושרים";
export const SCHOOL_SEARCH_STUDENTS = "חיפוש לפי שם (אופציונלי)";
export const SCHOOL_SEARCH_STUDENTS_PLACEHOLDER = "הקלידו שם תלמיד/ה";
export const SCHOOL_ENROLL_SECTION = "רישום תלמיד חדש (מתקדם)";
export const SCHOOL_VIEW_STUDENT_REPORT = "דוח תלמיד";
export const SCHOOL_REPORT_LOADING = "טוען דוח…";
export const SCHOOL_REPORT_SUMMARY = "סיכום דוח";
export const SCHOOL_REPORT_CLOSE = "סגירה";

export const SCHOOL_TEACHER_CLASSES_TITLE = "כיתות של המורה";
export const SCHOOL_TEACHER_EMPTY_CLASSES = "אין כיתות משויכות למורה/ה זו.";
export const SCHOOL_TEACHER_CLASS_SUBJECTS_PREFIX = "מקצועות";
export const SCHOOL_SUBJECTS_TITLE = "הרשאות מקצועות";
export const SCHOOL_SUBJECT_ADD = "הוספת מקצוע";
export const SCHOOL_SUBJECT_REMOVE = "הסרה";
export const SCHOOL_ENROLL_STUDENT = "רישום תלמיד";
export const SCHOOL_STUDENT_ID = "מזהה תלמיד (UUID)";
export const SCHOOL_LINKED_TEACHERS = "מורים מקושרים";
export const SCHOOL_NO_LINKED_TEACHERS = "אין מורים מקושרים";
export const SCHOOL_VIEW_REPORT = "צפייה בדוח";
export const SCHOOL_VIEW_CLASS = "כיתה";
export const SCHOOL_BACK_TEACHERS = "← חזרה למורים";
export const SCHOOL_MANAGER_ALL_SUBJECTS = "למנהל/ת בית הספר יש גישה לכל המקצועות.";

export const SCHOOL_ACTIVITY_COL_TITLE = "פעילות";
export const SCHOOL_ACTIVITY_COL_META = "פרטים";
export const SCHOOL_ACTIVITY_COL_STATUS = "סטטוס";

export const TEACHER_NAV_SCHOOL = "ניהול בית הספר";
export const TEACHER_SCHOOL_BADGE = "בית ספר";

/** @type {Record<string, string>} */
export const SCHOOL_SUBJECT_LABELS = { ...SUBJECT_LABEL_HE };

/** @type {Record<string, string>} */
export const SCHOOL_ACTIVITY_MODE_LABELS = { ...ACTIVITY_MODE_LABEL_HE };

/** @type {Record<string, string>} */
export const SCHOOL_ACTIVITY_STATUS_LABELS = { ...ACTIVITY_STATUS_LABEL_HE };

/** @type {string[]} */
export const SCHOOL_SUBJECT_ORDER = [...SUBJECT_ORDER];

/**
 * @param {string|null|undefined} key
 */
export function schoolSubjectLabelHe(key) {
  return platformSubjectLabelHe(key);
}

export function schoolActivityModeHe(mode) {
  return platformActivityModeLabelHe(mode);
}

export function schoolActivityStatusHe(status) {
  return platformActivityStatusLabelHe(status);
}

/**
 * @param {unknown} body
 */
export function schoolClassReportSummaryFromBody(body, classLabel) {
  const cohort = body?.cohortSummary || body?.summary || {};
  const accuracy = cohort.accuracy != null ? `${cohort.accuracy}%` : "—";
  return {
    title: `${SCHOOL_REPORT_SUMMARY}: ${classLabel}`,
    line: `תשובות: ${cohort.totalAnswers ?? 0} · דיוק: ${accuracy} · תלמידים: ${cohort.studentCount ?? cohort.studentsCount ?? "—"}`,
  };
}

/**
 * @param {unknown} body
 * @param {string} studentLabel
 * @param {string|null|undefined} gradeLevel
 */
export function schoolStudentReportSummaryFromBody(body, studentLabel, gradeLevel) {
  const summary = body?.summary || {};
  const accuracy = summary.accuracy != null ? `${summary.accuracy}%` : "—";
  return {
    title: `${SCHOOL_REPORT_SUMMARY}: ${studentLabel}`,
    line: `תשובות: ${summary.totalAnswers ?? 0} · דיוק: ${accuracy} · שכבה: ${gradeLevel || "—"}`,
  };
}

/**
 * Same Bearer session as teacher portal.
 * @param {string} accessToken
 * @param {string} path
 * @param {RequestInit} [init]
 */
export async function schoolAuthFetch(accessToken, path, init = {}) {
  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
}
