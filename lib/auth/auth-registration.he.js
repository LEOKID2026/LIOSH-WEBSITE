export const REG_TEACHER_TITLE = "בקשה לפתיחת חשבון / גישה";
export const REG_TEACHER_NAME_LABEL = "שם מלא";
export const REG_TEACHER_EMAIL_LABEL = "כתובת דוא״ל";
export const REG_TEACHER_PHONE_LABEL = "מספר טלפון";
export const REG_TEACHER_INTENT_LABEL = "סוג הבקשה";
export const REG_TEACHER_EXPLANATION_LABEL = "תאר/י את הבקשה";
export const REG_TEACHER_EXPLANATION_HINT =
  "פרט/י את סוג הגישה הרצוי - מורה פרטי/ת, נציג/ת בית ספר, או כל בקשה אחרת.";
export const REG_TEACHER_SUBJECTS_LABEL = "מקצועות מבוקשים (אופציונלי)";
export const REG_TEACHER_DESCRIPTION_LABEL = REG_TEACHER_EXPLANATION_LABEL;
export const REG_TEACHER_INVITE_ONLY_LOGIN_NOTE =
  "יש לך כבר חשבון שהוזמן על ידי הצוות? התחבר/י כאן. מעוניינ/ת בגישה חדשה? עבר/י ללשונית רישום מורה פרטי.";

export const REG_REQUEST_INTENT_OPTIONS = [
  { id: "private_teacher", label: "חשבון מורה/ת פרטי/ת" },
  { id: "school_representative", label: "נציג/ת בית ספר / מנהל/ת בית ספר" },
  { id: "general_access", label: "בקשת גישה כללית למורים" },
  { id: "other", label: "אחר - אפרט/י בטקסט החופשי" },
];

/** @param {string} intentId */
export function regRequestIntentLabelHe(intentId) {
  const opt = REG_REQUEST_INTENT_OPTIONS.find((o) => o.id === intentId);
  return opt?.label || REG_REQUEST_INTENT_OPTIONS[REG_REQUEST_INTENT_OPTIONS.length - 1].label;
}
export const REG_TEACHER_SUBMIT = "שליחת בקשה";
export const REG_TEACHER_SUCCESS =
  "בקשתך התקבלה. הצוות יבדוק אותה ויצור קשר בהקדם.";
export const REG_TEACHER_ALREADY_PENDING = "בקשה כבר ממתינה לאישור.";
export const REG_TEACHER_TAB = "רישום מורה פרטי";
export const REG_TEACHER_LOGIN_TAB = "כניסה";

export const REG_SCHOOL_TITLE = "רישום בית ספר";
export const REG_SCHOOL_NAME_LABEL = "שם בית הספר";
export const REG_SCHOOL_CITY_LABEL = "עיר";
export const REG_SCHOOL_CONTACT_NAME_LABEL = "שם איש קשר";
export const REG_SCHOOL_CONTACT_EMAIL_LABEL = "דוא״ל איש קשר";
export const REG_SCHOOL_APPROX_TEACHERS_LABEL = "מספר מורים משוער";
export const REG_SCHOOL_APPROX_STUDENTS_LABEL = "מספר ילדים משוער";
export const REG_SCHOOL_MESSAGE_LABEL = "הערות (אופציונלי)";
export const REG_SCHOOL_SUBMIT = "שליחת בקשת רישום";
export const REG_SCHOOL_SUCCESS =
  "בקשת הרישום התקבלה. הצוות יבדוק אותה ויצור קשר בהקדם.";
export const REG_SCHOOL_LINK = "רישום בית ספר";

export const PENDING_TEACHER_HEADING = "בקשתך ממתינה לאישור";
export const PENDING_TEACHER_BODY =
  "בקשתך לפתיחת חשבון / גישה ממתינה לאישור. הצוות יבדוק את הבקשה ויעדכן אותך בהקדם.";
export const PENDING_SCHOOL_HEADING = "רישום בית הספר ממתין לאישור";
export const PENDING_SCHOOL_BODY =
  "בקשת רישום בית הספר התקבלה. לאחר האישור תקבל/י גישה לפורטל הניהול.";
export const PENDING_REJECTED_HEADING = "הבקשה נדחתה";
export const PENDING_REJECTED_BODY =
  "בקשתך נדחתה. לפרטים נוספים ניתן לפנות לצוות התמיכה.";

export const ADMIN_PENDING_REQUESTS_TAB = "בקשות ממתינות";
export const ADMIN_APPROVE_ACTION = "אישור בקשה";
export const ADMIN_REJECT_ACTION = "דחיית בקשה";
export const ADMIN_REJECT_REASON_LABEL = "סיבת דחייה (אופציונלי)";
export const ADMIN_APPROVED_SUCCESS = "הבקשה אושרה.";
export const ADMIN_REJECTED_SUCCESS = "הבקשה נדחתה.";
export const ADMIN_STATUS_PENDING = "ממתין לאישור";
export const ADMIN_REG_REQUEST_PHONE = "טלפון";
export const ADMIN_REG_REQUEST_INTENT = "סוג הבקשה";
export const ADMIN_SEND_PASSWORD_SETUP = "שליחת קישור להגדרת סיסמה";
export const ADMIN_PASSWORD_SETUP_SENT = "קישור להגדרת סיסמה נשלח";
export const ADMIN_PASSWORD_SETUP_NOT_SENT = "קישור להגדרת סיסמה טרם נשלח";
export const ADMIN_PASSWORD_SETUP_STATUS = "סטטוס הגדרת סיסמה";
export const ADMIN_PASSWORD_SETUP_SENDING = "שולח…";
export const ADMIN_PASSWORD_SETUP_FAILED = "שליחת קישור להגדרת סיסמה נכשלה";

export const SUBJECT_LABELS_HE = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet_geography: "מולדת וגאוגרפיה",
};
