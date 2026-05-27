/** Hebrew UI strings for platform admin / school-manager console. */

import {
  apiErrorMessageHe,
  auditActionLabelHe,
  roleLabelHe,
} from "../platform-ui/hebrew-display-labels.js";

export { apiErrorMessageHe, auditActionLabelHe, roleLabelHe };

export const ADMIN_PLATFORM_LABEL = "ניהול מערכת";
export const ADMIN_NAV_TEACHERS = "מורים";
export const ADMIN_NAV_SCHOOLS = "בתי ספר";
export const ADMIN_NAV_TEACHER_PORTAL = "פורטל מורים";
export const ADMIN_LOGOUT = "יציאה";
export const ADMIN_LOGOUT_BUSY = "יוצא…";

export const ADMIN_TEACHERS_TITLE = "ניהול מורים";
export const ADMIN_TEACHER_DETAIL_FALLBACK = "פרטי מורה";
export const ADMIN_LOADING = "טוען…";
export const ADMIN_NO_TEACHERS = "לא נמצאו מורים.";
export const ADMIN_LOAD_ERROR = "שגיאה בטעינת הנתונים";
export const ADMIN_BACK_TO_TEACHERS = "← חזרה לרשימת מורים";

export const ADMIN_COL_EMAIL = "דוא״ל";
export const ADMIN_COL_NAME = "שם";
export const ADMIN_COL_CLASSES = "כיתות";
export const ADMIN_COL_STUDENTS = "תלמידים";
export const ADMIN_COL_DIRECT = "פרטיים";
export const ADMIN_COL_INDIV_ACTIVITIES = "פעילויות אישיות";
export const ADMIN_COL_PER_CLASS_CAP = "מגבלת כיתה";
export const ADMIN_COL_ACTIVE = "פעיל";
export const ADMIN_COL_ACTIONS = "פעולות";
export const ADMIN_COL_SCHOOL = "בית ספר";
export const ADMIN_MANAGE = "ניהול";
export const ADMIN_YES = "כן";
export const ADMIN_NO = "לא";

export const ADMIN_SUMMARY_TEACHERS = "מורים";
export const ADMIN_SUMMARY_ACTIVE_ACCOUNTS = "חשבונות פעילים";
export const ADMIN_SUMMARY_LINKED_STUDENTS = "תלמידים מקושרים";
export const ADMIN_SUMMARY_CLASSES = "כיתות פעילות";

export const ADMIN_SECTION_IDENTITY = "פרטי מורה";
export const ADMIN_SECTION_USAGE = "סיכום שימוש";
export const ADMIN_SECTION_CLASSES = "כיתות";
export const ADMIN_SECTION_QUOTAS = "מכסות";
export const ADMIN_SECTION_FEATURES = "הרשאות תכונות";
export const ADMIN_SECTION_PERMISSIONS = "הרשאות";
export const ADMIN_SECTION_ACCOUNT = "גישה לחשבון";
export const ADMIN_SECTION_MANAGEMENT = "מכסות והרשאות";
export const ADMIN_SECTION_AUDIT = "יומן פעולות";
export const ADMIN_TEACHER_DETAIL_NAV = "ניווט בדף מורה";

/** @param {number} count @param {boolean} expanded */
export function ADMIN_SMOKE_CLASSES_TOGGLE(count, expanded) {
  if (expanded) return `הסתר ${count} כיתות בדיקה`;
  return `הצג ${count} כיתות בדיקה (לא מוצגות בניהול)`;
}

export const ADMIN_LABEL_EMAIL = "דוא״ל";
export const ADMIN_LABEL_NAME = "שם תצוגה";
export const ADMIN_LABEL_PLAN = "תוכנית";
export const ADMIN_LABEL_STATUS = "סטטוס";
export const ADMIN_LABEL_CREATED = "נוצר";
export const ADMIN_LABEL_CLASSES = "כיתות";
export const ADMIN_LABEL_TOTAL_STUDENTS = "סה״כ תלמידים";
export const ADMIN_LABEL_CLASS_STUDENTS = "תלמידים בכיתות";
export const ADMIN_LABEL_DIRECT_STUDENTS = "תלמידים פרטיים";
export const ADMIN_LABEL_INDIV_ACTIVITIES = "פעילויות אישיות";
export const ADMIN_LABEL_EFFECTIVE_CLASS_CAP = "מגבלה בפועל לכיתה";
export const ADMIN_LABEL_OVERRIDE = "דריסת מגבלה לכיתה";
export const ADMIN_LABEL_NOTES = "הערות פנימיות";
export const ADMIN_PLACEHOLDER_OVERRIDE = "ריק = ברירת מחדל (40)";
export const ADMIN_OVERRIDE_HINT =
  "ערך ריק משתמש במגבלה מהתוכנית. ברירת מחדל: 40 תלמידים לכיתה.";

export const ADMIN_CLASS_COL_NAME = "שם כיתה";
export const ADMIN_CLASS_COL_STUDENTS = "תלמידים";
export const ADMIN_NO_CLASSES = "אין כיתות פעילות.";
export const ADMIN_NO_AUDIT = "אין רשומות ביומן.";

export const ADMIN_SAVE_QUOTAS = "שמירת מכסות";
export const ADMIN_SAVE_FEATURES = "שמירת הרשאות";
export const ADMIN_SAVE_STATUS = "שמירת סטטוס";
export const ADMIN_ACCOUNT_ACTIVE_LABEL = "חשבון מורה פעיל (גישה ל-API)";

export const ADMIN_STATUS_ACTIVE = "פעיל";
export const ADMIN_STATUS_INACTIVE = "לא פעיל";

export const ADMIN_FEATURE_LABELS_HE = {
  classroom_activities: "פעילויות כיתה",
  individual_activities: "פעילויות אישיות",
  parent_messaging: "הודעות להורים",
  ai_reports: "דוחות AI",
  live_audio: "שיעור חי (עתידי)",
};

/** @param {boolean|undefined|null} active */
export function adminYesNoHe(active) {
  return active ? ADMIN_YES : ADMIN_NO;
}

/** @param {{ isAccountActive?: boolean, isActive?: boolean }|null|undefined} teacher */
export function adminAccountStatusHe(teacher) {
  const active = teacher?.isAccountActive !== false && teacher?.isActive;
  return active ? ADMIN_STATUS_ACTIVE : ADMIN_STATUS_INACTIVE;
}

/** @param {string|null|undefined} iso */
export function adminFormatDateHe(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** @param {string|null|undefined} gradeLevel */
export const ADMIN_SCHOOLS_TITLE = "ניהול בתי ספר";
export const ADMIN_SCHOOL_DETAIL_FALLBACK = "פרטי בית ספר";
export const ADMIN_SCHOOL_CREATE = "יצירת בית ספר";
export const ADMIN_SCHOOL_NAME = "שם בית הספר";
export const ADMIN_SCHOOL_CITY = "עיר";
export const ADMIN_SCHOOL_CONTACT = "דוא״ל ליצירת קשר";
export const ADMIN_SCHOOL_MAX_TEACHERS = "מגבלת מורים";
export const ADMIN_SCHOOL_ACTIVE = "בית ספר פעיל";
export const ADMIN_SCHOOL_TEACHERS = "מורים בבית הספר";
export const ADMIN_SCHOOL_ASSIGN_TEACHER = "שיוך מורה";
export const ADMIN_SCHOOL_ASSIGN_MANAGER = "מינוי מנהל/ת בית ספר";
export const ADMIN_SCHOOL_REMOVE_TEACHER = "הסרה מבית הספר";
export const ADMIN_SCHOOL_ROLE_MANAGER = "מנהל/ת";
export const ADMIN_SCHOOL_ROLE_TEACHER = "מורה";
export const ADMIN_SCHOOL_NO_SCHOOLS = "אין בתי ספר.";
export const ADMIN_SCHOOL_FORCE_REASSIGN = "החלפת בית ספר קיים (force)";
export const ADMIN_TEACHER_SCHOOL_SECTION = "שיוך לבית ספר";
export const ADMIN_TEACHER_NO_SCHOOL = "לא משויך לבית ספר";
export const ADMIN_TEACHER_VIEW_SCHOOL = "לפרטי בית הספר";

export function adminGradeLabelHe(gradeLevel) {
  const map = {
    g1: "כיתה א׳",
    g2: "כיתה ב׳",
    g3: "כיתה ג׳",
    g4: "כיתה ד׳",
    g5: "כיתה ה׳",
    g6: "כיתה ו׳",
  };
  const key = String(gradeLevel || "").trim().toLowerCase();
  return map[key] || gradeLevel || "—";
}
