/** Hebrew UI strings for platform admin / school-manager console. */

import {
  apiErrorMessageHe,
  auditActionLabelHe,
  roleLabelHe,
} from "../platform-ui/hebrew-display-labels.js";

export { apiErrorMessageHe, auditActionLabelHe, roleLabelHe };

export const ADMIN_PLATFORM_LABEL = "ניהול מערכת";
export const ADMIN_NAV_TEACHERS = "מורים פרטיים";
export const ADMIN_NAV_SCHOOLS = "בתי ספר";
export const ADMIN_NAV_PARENTS = "הורים רשומים";
export const ADMIN_NAV_ALL_ACCOUNTS = "כל החשבונות";
export const ADMIN_NAV_ANALYTICS = "אנליטיקה";
export const ADMIN_NAV_REWARDS = "תגמולים וקלפים";
export const ADMIN_NAV_GAMES = "משחקים";
export const ADMIN_NAV_GUEST = "אורח";
export const ADMIN_NAV_VIDEO_BUILDER = "יוצר סרטונים";
export const ADMIN_NAV_PROTOTYPES = "מעבדת פיתוח";
export const ADMIN_NAV_ENGINE_REVIEW = "סקירת מנוע";
export const ADMIN_NAV_TEACHER_PORTAL = "פורטל מורים";
export const ADMIN_LOGOUT = "יציאה";
export const ADMIN_LOGOUT_BUSY = "יוצא…";

export const ADMIN_TEACHERS_TITLE = "ניהול מורים פרטיים";
export const ADMIN_PARENTS_TITLE = "הורים רשומים והגדרות חשבון";
export const ADMIN_ALL_ACCOUNTS_TITLE = "כל חשבונות המערכת";
export const ADMIN_ANALYTICS_TITLE = "מרכז אנליטיקה פנימי";
export const ADMIN_ALL_ACCOUNTS_MAIN_ADMIN_ONLY =
  "עמוד זה זמין למנהל הראשי בלבד.";
export const ADMIN_ALL_ACCOUNTS_LOGGED_IN_AS = "מחובר/ת כ:";
export const ADMIN_ALL_ACCOUNTS_LIST_DEGRADED =
  "הרשימה נבנתה ממסד הנתונים (רשימת משתמשי האימות לא החזירה תוצאות).";
export const ADMIN_NO_ALL_ACCOUNTS = "לא נמצאו חשבונות.";
export const ADMIN_COL_USER_ID = "מזהה משתמש";
export const ADMIN_COL_CLASSIFICATION = "סיווג";
export const ADMIN_COL_CONFIRMED = "אימות דוא״ל";
export const ADMIN_COL_FROZEN = "מוקפא";
export const ADMIN_COL_PROTECTED = "מוגן";
export const ADMIN_COL_DELETABLE = "ניתן למחיקה";
export const ADMIN_COL_LINKED = "קישורים";
export const ADMIN_COL_LAST_SIGN_IN = "כניסה אחרונה";
export const ADMIN_COL_CREATED = "נוצר";
export const ADMIN_ACCOUNT_CLASS_PLATFORM_ADMIN = "אדמין מערכת";
export const ADMIN_ACCOUNT_CLASS_QA = "חשבון בדיקה";
export const ADMIN_ACCOUNT_CLASS_PENDING_CONFIRM = "ממתין לאימות";
export const ADMIN_ACCOUNT_CLASS_UNLINKED = "חשבון לא מקושר";
export const ADMIN_ACCOUNT_CLASS_SCHOOL_STAFF = "צוות בית ספר / מזכירות";
export const ADMIN_ALL_ACCOUNTS_DELETE_EXPAND = "מחיקה";
export const ADMIN_ALL_ACCOUNTS_SCHOOLS_LINK = "ניהול בתי ספר";
export const ADMIN_PARENT_DETAIL_FALLBACK = "הגדרות חשבון הורה";
export const ADMIN_NO_PARENTS = "לא נמצאו הורים רשומים.";
export const ADMIN_BACK_TO_PARENTS = "← חזרה לרשימת הורים";
export const ADMIN_PARENT_SETTINGS_SECTION = "הגדרות חשבון";
export const ADMIN_PARENT_UNLINKED_STATUS = "חשבון לא מקושר - חסר הרשאה";
export const ADMIN_PARENT_UNLINKED_DETAIL_NOTE =
  "לחשבון זה יש רשומת פרופיל אך אין הרשאת הורה פעילה. ניתן לנהל מחיקה; הגדרות חשבון אינן זמינות.";
export const ADMIN_COL_PLAN = "תוכנית";
export const ADMIN_COL_ACCOUNT_STATUS = "סטטוס חשבון";
export const ADMIN_TEACHER_DETAIL_FALLBACK = "פרטי מורה פרטי";
export const ADMIN_LOADING = "טוען…";
export const ADMIN_NO_TEACHERS = "לא נמצאו מורים פרטיים.";
export const ADMIN_LOAD_ERROR = "שגיאה בטעינת הנתונים";
export const ADMIN_BACK_TO_TEACHERS = "← חזרה לרשימת מורים";

export const ADMIN_COL_EMAIL = "דוא״ל";
export const ADMIN_COL_NAME = "שם";
export const ADMIN_COL_CLASSES = "כיתות";
export const ADMIN_COL_STUDENTS = "ילדים";
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
export const ADMIN_SUMMARY_LINKED_STUDENTS = "ילדים מקושרים";
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
export const ADMIN_LABEL_TOTAL_STUDENTS = "סה״כ ילדים";
export const ADMIN_LABEL_CLASS_STUDENTS = "ילדים בכיתות";
export const ADMIN_LABEL_DIRECT_STUDENTS = "ילדים פרטיים";
export const ADMIN_LABEL_INDIV_ACTIVITIES = "פעילויות אישיות";
export const ADMIN_LABEL_EFFECTIVE_CLASS_CAP = "מגבלה בפועל לכיתה";
export const ADMIN_LABEL_OVERRIDE = "דריסת מגבלה לכיתה";
export const ADMIN_LABEL_NOTES = "הערות פנימיות";
export const ADMIN_PLACEHOLDER_OVERRIDE = "ריק = ברירת מחדל (40)";
export const ADMIN_OVERRIDE_HINT =
  "ערך ריק משתמש במגבלה מהתוכנית. ברירת מחדל: 40 ילדים לכיתה.";

export const ADMIN_CLASS_COL_NAME = "שם כיתה";
export const ADMIN_CLASS_COL_STUDENTS = "ילדים";
export const ADMIN_NO_CLASSES = "אין כיתות פעילות.";
export const ADMIN_NO_AUDIT = "אין רשומות ביומן.";

export const ADMIN_SAVE_QUOTAS = "שמירת מכסות";
export const ADMIN_SAVE_FEATURES = "שמירת הרשאות";
export const ADMIN_SAVE_STATUS = "שמירת סטטוס";
export const ADMIN_ACCOUNT_ACTIVE_LABEL = "חשבון מורה פעיל (גישה לממשק)";

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
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
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
export const ADMIN_SCHOOL_ROLE_MANAGER = "מנהל/ת";
export const ADMIN_SCHOOL_ROLE_TEACHER = "מורה";
export const ADMIN_SCHOOL_NO_SCHOOLS = "אין בתי ספר.";
export const ADMIN_SCHOOL_FORCE_REASSIGN = "החלפת שיוך לבית ספר קיים";
export const ADMIN_TEACHER_SCHOOL_SECTION = "שיוך לבית ספר";
export const ADMIN_TEACHER_NO_SCHOOL = "לא משויך לבית ספר";
export const ADMIN_TEACHER_VIEW_SCHOOL = "לפרטי בית הספר";
export const ADMIN_TEACHER_SCHOOL_STAFF_READONLY =
  "משתמש/ת זה/ו שייך/ת לצוות בית ספר. ניהול מקצועות, מכסות והרשאות מתבצע בפורטל בית הספר - לא כאן.";

export const ADMIN_LIFECYCLE_SECTION = "ניהול סטטוס והרשאות";
export const ADMIN_LIFECYCLE_ACCOUNT_STATUS = "סטטוס חשבון";
export const ADMIN_LIFECYCLE_ENTITLEMENT_STATUS = "סטטוס הרשאה";
export const ADMIN_LIFECYCLE_SUSPEND = "הקפאת גישה";
export const ADMIN_LIFECYCLE_REACTIVATE = "החזרת גישה";
export const ADMIN_LIFECYCLE_REVOKE = "ביטול הרשאה";
export const ADMIN_LIFECYCLE_SAVE = "שמירה";
export const ADMIN_LIFECYCLE_BUSY = "מעדכן…";
export const ADMIN_LIFECYCLE_CONFIRM_REVOKE =
  "לבטל את ההרשאה? ניתן לשחזר רק באישור מחדש.";
export const ADMIN_LIFECYCLE_TEACHER_LIMITS = "מגבלות חשבון מורה";
export const ADMIN_LIFECYCLE_LOADING = "טוען…";
export const ADMIN_LIFECYCLE_NETWORK_ERROR = "שגיאת רשת";

export const ADMIN_LIFECYCLE_DELETE = "מחיקת חשבון";
export const ADMIN_LIFECYCLE_DELETE_BUSY = "מוחק…";
export const ADMIN_LIFECYCLE_DELETE_CONFIRM_LABEL =
  "לאישור מחיקה סופית - הקלידו קוד אישור:";
export const ADMIN_LIFECYCLE_DELETE_SUBMIT = "מחיקה סופית";
export const ADMIN_LIFECYCLE_DELETE_CANCEL = "ביטול";
export const ADMIN_LIFECYCLE_DELETE_SUCCESS = "החשבון נמחק.";
export const ADMIN_LIFECYCLE_DELETE_PROTECTED = "לא ניתן למחוק חשבון מוגן.";
export const ADMIN_LIFECYCLE_DELETE_BLOCKED =
  "לא ניתן למחוק - יש רשומות תלויות. פרטים מוצגים למטה.";

export const ADMIN_SCHOOL_LIFECYCLE_SECTION = "ניהול סטטוס בית ספר";
export const ADMIN_SCHOOL_LIFECYCLE_STATUS = "סטטוס בית ספר";
export const ADMIN_SCHOOL_LIFECYCLE_ACTIVE = "בית הספר פעיל";
export const ADMIN_SCHOOL_LIFECYCLE_SUSPENDED = "בית הספר מוקפא";
export const ADMIN_SCHOOL_LIFECYCLE_SUSPEND = "הקפאת בית ספר";
export const ADMIN_SCHOOL_LIFECYCLE_REACTIVATE = "החזרת בית ספר לפעילות";

export const ADMIN_PARENT_MAX_CHILDREN = "מקסימום ילדים";
export const ADMIN_PARENT_FEATURE_REPORTS = "דוחות";
export const ADMIN_PARENT_FEATURE_COPILOT = "עוזר הורים";
export const ADMIN_PARENT_FEATURE_DIAGNOSTICS = "אבחון מתקדם";
export const ADMIN_PARENT_FEATURE_EXPORT = "ייצוא";

/** @type {Record<string, string>} */
export const PERSONA_LABELS_HE = {
  parent: "הורה",
  private_teacher: "מורה פרטי",
  school_teacher: "מורה בית ספר",
  school_manager: "מנהל/ת בית ספר",
  school_operator: "מזכירות / תפעול",
  admin: "מנהל מערכת",
};

/** @type {Record<string, string>} */
export const ENTITLEMENT_STATUS_LABELS_HE = {
  active: "פעיל",
  suspended: "מוקפא",
  revoked: "הרשאה בוטלה",
  cancelled: "מבוטל",
  pending: "ממתין לאישור",
  approved: "אושר",
  rejected: "נדחה",
  trial: "ניסיון",
  none: "לא הוגדר",
};

/** @type {Record<string, string>} */
export const PLAN_CODE_LABELS_HE = {
  free: "חינמי",
  trial: "ניסיון",
  basic: "בסיסי",
  family: "משפחתי",
  premium: "פרימיום",
  school_linked: "קישור לבית ספר",
  teacher_basic_20: "תוכנית בסיסית - עד 20 ילדים",
  teacher_pro_50: "תוכנית מתקדמת - עד 50 ילדים",
  teacher_school_unlimited: "תוכנית בית ספר - ללא הגבלה",
};

/** @param {string|null|undefined} status */
export function entitlementStatusLabelHe(status) {
  const key = String(status || "").trim().toLowerCase();
  return ENTITLEMENT_STATUS_LABELS_HE[key] || "-";
}

/** @param {string|null|undefined} persona */
export function personaLabelHe(persona) {
  const key = String(persona || "").trim().toLowerCase();
  return PERSONA_LABELS_HE[key] || "-";
}

/** @type {Record<string, string>} */
export const ACCOUNT_CLASSIFICATION_LABELS_HE = {
  platform_admin: ADMIN_ACCOUNT_CLASS_PLATFORM_ADMIN,
  parent: PERSONA_LABELS_HE.parent,
  private_teacher: PERSONA_LABELS_HE.private_teacher,
  school_manager: PERSONA_LABELS_HE.school_manager,
  school_teacher: PERSONA_LABELS_HE.school_teacher,
  school_operator: ADMIN_ACCOUNT_CLASS_SCHOOL_STAFF,
  unlinked: ADMIN_ACCOUNT_CLASS_UNLINKED,
  pending_confirmation: ADMIN_ACCOUNT_CLASS_PENDING_CONFIRM,
  qa_test: ADMIN_ACCOUNT_CLASS_QA,
};

/** @param {string|null|undefined} key */
export function accountClassificationLabelHe(key) {
  const k = String(key || "").trim().toLowerCase();
  return ACCOUNT_CLASSIFICATION_LABELS_HE[k] || "-";
}

/** @param {string[]} classifications */
export function accountClassificationsLabelHe(classifications) {
  if (!Array.isArray(classifications) || !classifications.length) return "-";
  return classifications.map((c) => accountClassificationLabelHe(c)).join(" · ");
}

/** @param {string|null|undefined} status */
export function accountStatusLabelHe(status) {
  return entitlementStatusLabelHe(status);
}

/** @param {{ isOrphanUnlinked?: boolean, settings?: object|null, entitlementStatus?: string|null }} parent */
export function parentListStatusLabelHe(parent) {
  if (parent?.isOrphanUnlinked) return ADMIN_PARENT_UNLINKED_STATUS;
  if (parent?.settings?.accountStatus) return accountStatusLabelHe(parent.settings.accountStatus);
  if (parent?.entitlementStatus) return entitlementStatusLabelHe(parent.entitlementStatus);
  return "-";
}

/** @param {string|null|undefined} planCode */
export function planCodeLabelHe(planCode) {
  const key = String(planCode || "").trim().toLowerCase();
  return PLAN_CODE_LABELS_HE[key] || "-";
}

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
  return map[key] || gradeLevel || "-";
}

export const ADMIN_REG_REQUEST_SECTION = "בקשת רישום / גישה";
export const ADMIN_REG_REQUEST_DETAILS = "פירוט הבקשה";
export const ADMIN_REG_REQUEST_SUBJECTS = "מקצועות מבוקשים";
export const ADMIN_REG_REQUEST_STATUS = "סטטוס בקשה";
export const ADMIN_REG_REQUEST_SUBMITTED = "תאריך הגשה";
export const ADMIN_REG_REQUEST_NO_SUBJECTS = "לא צוינו מקצועות";

/** @type {Record<string, string>} */
export const ADMIN_DEPENDENCY_LABEL_HE = {
  "school_messages.author_id": "הודעות בית ספר",
  "school_teacher_subjects.teacher_id": "שיוך מקצועות בית ספר (מורה)",
  "school_teacher_subjects.granted_by": "שיוך מקצועות בית ספר (מעניק)",
  "private_teacher_subjects.teacher_id": "שיוך מקצועות מורה פרטי",
  "private_teacher_subjects.granted_by": "שיוך מקצועות מורה פרטי (מעניק)",
  "student_guardian_access.created_by_teacher_id": "גישת הורה לילד (מורה)",
  "school_staff_access_codes.user_id": "קודי גישה לצוות",
  "school_staff_access_codes.created_by": "קודי גישה לצוות (יוצר)",
  "school_staff_sessions.user_id": "הפעלות צוות בית ספר",
  "school_operator_grants.operator_user_id": "הרשאות מפעיל בית ספר",
  "school_teacher_memberships.teacher_id": "שיוך מורה לבית ספר",
  "teacher_registration_requests.user_id": "בקשות רישום מורה",
  "school_registration_requests.contact_user_id": "בקשות רישום בית ספר",
  "account_persona_entitlements.user_id": "הרשאות חשבון",
  "parent_account_settings.parent_user_id": "הגדרות חשבון הורה",
  "parent_profiles.id": "פרופיל הורה",
  "teacher_profiles.id": "פרופיל מורה",
  "students.parent_id": "ילדים משויכים",
  "parent_copilot_usage_log.parent_user_id": "שימוש בקופיילוט הורה",
};

/**
 * @param {string|null|undefined} label
 */
export function formatAdminDependencyLabelHe(label) {
  const key = String(label || "").trim();
  if (!key) return "-";
  return ADMIN_DEPENDENCY_LABEL_HE[key] || "רשומה תלויה";
}
