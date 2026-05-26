/** Hebrew UI strings for school manager portal. */

export const SCHOOL_PLATFORM_LABEL = "ניהול בית ספר";
export const SCHOOL_NAV_DASHBOARD = "לוח בקרה";
export const SCHOOL_NAV_TEACHERS = "מורים";
export const SCHOOL_NAV_CLASSES = "כיתות";
export const SCHOOL_NAV_STUDENTS = "תלמידים";
export const SCHOOL_NAV_MY_TEACHER = "לוח המורה שלי";
export const SCHOOL_LOADING = "טוען…";
export const SCHOOL_LOAD_ERROR = "שגיאה בטעינת הנתונים";
export const SCHOOL_DASHBOARD_TITLE = "לוח בקרת בית הספר";
export const SCHOOL_STAT_TEACHERS = "מורים";
export const SCHOOL_STAT_STUDENTS = "תלמידים רשומים";
export const SCHOOL_STAT_CLASSES = "כיתות פעילות";
export const SCHOOL_STAT_ACTIVITIES = "פעילויות פעילות";
export const SCHOOL_TEACHERS_TITLE = "מורים בבית הספר";
export const SCHOOL_CLASSES_TITLE = "כיתות בבית הספר";
export const SCHOOL_STUDENTS_TITLE = "תלמידים רשומים";
export const SCHOOL_SUBJECTS_TITLE = "הרשאות מקצועות";
export const SCHOOL_SUBJECT_ADD = "הוספת מקצוע";
export const SCHOOL_SUBJECT_REMOVE = "הסרה";
export const SCHOOL_ENROLL_STUDENT = "רישום תלמיד";
export const SCHOOL_STUDENT_ID = "מזהה תלמיד (UUID)";
export const SCHOOL_LINKED_TEACHERS = "מורים מקושרים";
export const SCHOOL_NO_LINKED_TEACHERS = "אין מורים מקושרים";
export const SCHOOL_VIEW_REPORT = "צפייה בדוח";
export const SCHOOL_VIEW_CLASS = "כיתה";
export const TEACHER_NAV_SCHOOL = "ניהול בית הספר";
export const TEACHER_SCHOOL_BADGE = "בית ספר";

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
