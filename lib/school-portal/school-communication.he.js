/** Approved placeholder Hebrew copy (Section 16.2). Uncorrected strings are approved as-is. */

export const SC_TAB_LEARNING_REPORT = "דוח לימודי";
export const SC_TAB_ACCESS_ACCOUNTS = "גישה וחשבונות";
export const SC_TAB_STUDENT_ASSIGNMENT = "ניהול שיוך ילד/ה";

export const SC_SECTION_STUDENT_ACCOUNT = "חשבון ילד/ה";
export const SC_STATUS_ACTIVE = "פעיל";
export const SC_STATUS_BLOCKED = "חסום";
export const SC_STATUS_NOT_CREATED = "לא נוצר";
export const SC_STATUS_REVOKED = "בוטל";
export const SC_LAST_LOGIN_NEVER = "מעולם לא נכנס";
export const SC_LAST_LOGIN_DAYS_AGO = (days) => `לפני ${days} ימים`;
export const SC_LAST_LOGIN_TODAY = "היום";
export const SC_BTN_CREATE_ACCOUNT = "צור חשבון";
export const SC_BTN_RESET_PIN = "איפוס PIN";
export const SC_BTN_COPY_CREDENTIALS = "העתק פרטים";
export const SC_BTN_BLOCK = "חסום";
export const SC_BTN_UNBLOCK = "בטל חסימה";
export const SC_BTN_REVOKE = "בטל גישה";
export const SC_CONFIRM_REVOKE_STUDENT = "האם לבטל את גישת הילד/ה לצמיתות?";
export const SC_EMPTY_STUDENT_ACCOUNT = "לא נוצר חשבון לילד/ה זה";

export const SC_SECTION_PARENT_ACCOUNTS = "חשבונות הורים";
export const SC_BTN_ADD_PARENT = "הוסף גישת הורה";
export const SC_BTN_LINK_PARENT = "חבר הורה קיים";
export const SC_LABEL_RELATION = "קשר לילד/ה";
export const SC_RELATION_MOTHER = "אמא";
export const SC_RELATION_FATHER = "אבא";
export const SC_RELATION_GUARDIAN = "אפוטרופוס";
export const SC_RELATION_OTHER = "אחר";
export const SC_LABEL_DISPLAY_NAME = "שם הורה";
export const SC_BTN_DISCONNECT_PARENT = "נתק מילד/ה";
export const SC_CONFIRM_DISCONNECT_PARENT = "האם לנתק הורה זה מהילד/ה?";
export const SC_CONFIRM_REVOKE_PARENT = "האם לבטל את גישת ההורה לצמיתות?";
export const SC_MUST_CHANGE_PIN_PENDING = "שינוי PIN נדרש בכניסה הראשונה";
export const SC_MUST_CHANGE_PIN_DONE = "שינוי PIN הושלם";
export const SC_EMPTY_PARENT_ACCOUNTS = "לא נוצרו חשבונות הורים לילד/ה זה";

export const SC_CREDENTIAL_BOX_HEADING = "פרטי הגישה";
export const SC_CREDENTIAL_BOX_WARNING = "שמור את הפרטים עכשיו. הם לא יוצגו שוב.";
export const SC_CREDENTIAL_LABEL_USERNAME = "שם משתמש";
export const SC_CREDENTIAL_LABEL_PIN = "קוד גישה";
export const SC_CREDENTIAL_COPIED = "הועתק ללוח";
export const SC_CREDENTIAL_BTN_DISMISS = "אישור, שמרתי";

export const SC_PIN_GATE_HEADING = "שינוי קוד גישה";
export const SC_PIN_GATE_EXPLANATION =
  "קוד הגישה שקיבלת הוא זמני. יש לבחור קוד גישה חדש לפני הכניסה לפורטל.";
export const SC_PIN_GATE_FIELD_CURRENT = "קוד גישה זמני";
export const SC_PIN_GATE_FIELD_NEW = "קוד גישה חדש";
export const SC_PIN_GATE_FIELD_CONFIRM = "אימות קוד גישה חדש";
export const SC_PIN_GATE_BTN_SUBMIT = "אשר שינוי";
export const SC_PIN_GATE_SUCCESS = "קוד הגישה עודכן בהצלחה";
export const SC_PIN_GATE_ERROR_WRONG_CURRENT = "קוד הגישה הנוכחי שגוי";
export const SC_PIN_GATE_ERROR_MISMATCH = "קודי הגישה אינם תואמים";
export const SC_PIN_GATE_ERROR_TOO_SHORT = "קוד הגישה חייב להכיל 6 ספרות";
export const SC_PIN_GATE_ERROR_DIGITS_ONLY = "קוד הגישה חייב להכיל ספרות בלבד";

export const SC_NAV_MESSAGES = "הודעות";
export const SC_PAGE_MESSAGES_TITLE = "הודעות בית ספר";
export const SC_BTN_COMPOSE = "הודעה חדשה";
export const SC_MESSAGES_EMPTY = "לא נשלחו הודעות עדיין";
export const SC_COL_SUBJECT = "נושא";
export const SC_COL_AUDIENCE = "נמענים";
export const SC_COL_DATE = "תאריך";
export const SC_COL_READ_COUNT = "קראו";
export const SC_FILTER_ALL = "הכל";
export const SC_FILTER_PARENTS = "הורים";
export const SC_FILTER_TEACHERS = "מורים";
export const SC_BADGE_REGULAR = "רגיל";
export const SC_BADGE_IMPORTANT = "חשוב";
export const SC_BADGE_URGENT = "דחוף";
export const SC_BADGE_REQUIRES_CONFIRMATION = "דורש אישור קבלה";

export const SC_COMPOSE_TITLE = "הודעה חדשה";
export const SC_COMPOSE_FIELD_SUBJECT = "נושא (אופציונלי)";
export const SC_COMPOSE_FIELD_BODY = "תוכן ההודעה";
export const SC_COMPOSE_FIELD_TYPE = "סוג הודעה";
export const SC_COMPOSE_FIELD_AUDIENCE = "נמענים";
export const SC_COMPOSE_BTN_SEND = "שלח הודעה";
export const SC_COMPOSE_BTN_CANCEL = "ביטול";
export const SC_COMPOSE_PREVIEW_COUNT = (count) => `${count} נמענים ייקבלו הודעה זו`;
export const SC_COMPOSE_ERROR_EMPTY_BODY = "יש להזין תוכן להודעה";
export const SC_COMPOSE_SUCCESS = "ההודעה נשלחה בהצלחה";

export const SC_AUDIENCE_ALL_PARENTS = "כל הורי בית הספר";
export const SC_AUDIENCE_GRADE_PARENTS = "הורי שכבה";
export const SC_AUDIENCE_CLASS_PARENTS = "הורי כיתה";
export const SC_AUDIENCE_SPECIFIC_PARENT = "הורה ספציפי";
export const SC_AUDIENCE_ALL_TEACHERS = "כל מורי בית הספר";
export const SC_AUDIENCE_GRADE_TEACHERS = "מורי שכבה";
export const SC_AUDIENCE_SUBJECT_TEACHERS = "מורי מקצוע";
export const SC_AUDIENCE_CLASS_TEACHERS = "צוות מורי כיתה";
export const SC_AUDIENCE_SPECIFIC_TEACHER = "מורה ספציפי";

export const SC_NAV_SCHOOL_INBOX_PARENT = "הודעות בית הספר";
export const SC_INBOX_TITLE_PARENT = "הודעות מבית הספר";
export const SC_INBOX_EMPTY = "אין הודעות מבית הספר";
export const SC_BTN_MARK_RECEIVED = "קיבלתי";
export const SC_CONFIRMED_RECEIPT = "אישרת קבלה";
export const SC_BTN_OPEN = "פתח";
export const SC_BTN_CLOSE_MESSAGE_DETAIL = "סגירה";
export const SC_MESSAGE_FROM_SCHOOL_ADMIN = "מהנהלת בית הספר";
export const SC_MESSAGE_FROM_SCHOOL_PARENT = "מבית הספר";
export const SC_BTN_MARK_READ = "סמן כנקרא";
export const SC_COL_ACTION = "פעולה";

export const SC_FILTER_LAST_7_DAYS = "7 ימים אחרונים";
export const SC_FILTER_LAST_30_DAYS = "30 ימים אחרונים";
export const SC_FILTER_CUSTOM_RANGE = "טווח תאריכים מותאם";
export const SC_LABEL_DATE_FROM = "מתאריך";
export const SC_LABEL_DATE_TO = "עד תאריך";

export const SC_SECTION_LEGACY_ACCESS = "גישה קיימת שאינה בית ספרית";
export const SC_LEGACY_ACCESS_HINT = "חשבון זה נוצר מחוץ למערכת בית הספר ואינו ניתן לניהול מכאן.";
export const SC_BTN_CREATE_NEW_ACCOUNT = "צור חשבון חדש";
export const SC_REVOKE_RECOVERY_HINT =
  "הגישה הקודמת בוטלה. ניתן ליצור חשבון בית-ספרי חדש עם שם משתמש וקוד גישה חדשים.";

export const SC_NAV_SCHOOL_MESSAGES_TEACHER = "הודעות בית הספר";
export const SC_TEACHER_INBOX_TITLE = "הודעות מהנהלת בית הספר";
export const SC_TEACHER_INBOX_EMPTY = "אין הודעות מבית הספר";

export const SC_RECEIPTS_PANEL_TITLE = "מצב קריאה";
export const SC_RECEIPTS_TAB_PARENTS = "הורים";
export const SC_RECEIPTS_TAB_TEACHERS = "מורים";
export const SC_RECEIPTS_READ_COUNT = (read, total) => `קראו ${read} מתוך ${total}`;
export const SC_RECEIPTS_STATUS_READ = "קרא";
export const SC_RECEIPTS_STATUS_UNREAD = "לא קרא";
export const SC_RECEIPTS_STATUS_CONFIRMED = "אישר קבלה";

export const SC_MINI_REPORT_CARD_TITLE = "דוח למידה קצר";
export const SC_MINI_REPORT_LINK_FULL = "לדוח המלא";
export const SC_MINI_REPORT_NO_DATA = "אין נתוני למידה עדיין";

export const SC_COUNTER_UNREAD_PARENTS = "הודעות לא נקראו - הורים";
export const SC_COUNTER_UNREAD_TEACHERS = "הודעות לא נקראו - מורים";
export const SC_COUNTER_IMPORTANT_ACTIVE = "הודעות חשובות פעילות";

export const SC_LOADING = "טוען…";
export const SC_ERROR_GENERIC = "שגיאה. נסו שוב.";

export const SC_BTN_STUDENT_DETAILS = "פרטים";
export const SC_BTN_EDIT_DETAILS = "עריכה";
export const SC_BTN_SAVE_DETAILS = "שמירה";
export const SC_BTN_CANCEL_DETAILS = "ביטול";
export const SC_BTN_ADD_DETAILS = "הוספת פרטים";
export const SC_BTN_HIDE_DETAILS = "הסתר פרטים נוספים";
export const SC_BTN_CLOSE_DETAILS = "סגירה";

export const SC_DETAILS_MODAL_TITLE = "פרטי ילד/ה";

export const SC_DETAILS_SECTION_STUDENT = "פרטי ילד/ה";
export const SC_DETAILS_SECTION_PARENTS = "פרטי הורים";
export const SC_DETAILS_SECTION_ADDRESS = "כתובת ויצירת קשר";
export const SC_DETAILS_SECTION_EMERGENCY = "איש קשר לחירום";
export const SC_DETAILS_SECTION_MEDICAL = "מידע רפואי ואלרגיות";
export const SC_DETAILS_SECTION_TRANSPORT = "הסעות והערות";
export const SC_DETAILS_SECTION_INTERNAL = "הערות פנימיות";

export const SC_DETAILS_FIELD_STUDENT_NAME = "שם הילד/ה";
export const SC_DETAILS_FIELD_GRADE = "שכבה";
export const SC_DETAILS_FIELD_CLASS = "כיתה";
export const SC_DETAILS_FIELD_CHILD_AGE = "גיל הילד";
export const SC_DETAILS_FIELD_DATE_OF_BIRTH = "תאריך לידה";
export const SC_DETAILS_FIELD_PARENT1_NAME = "שם הורה 1";
export const SC_DETAILS_FIELD_PARENT1_PHONE = "טלפון הורה 1";
export const SC_DETAILS_FIELD_PARENT1_NATIONAL_ID = "תעודת זהות הורה 1";
export const SC_DETAILS_FIELD_PARENT2_NAME = "שם הורה 2";
export const SC_DETAILS_FIELD_PARENT2_PHONE = "טלפון הורה 2";
export const SC_DETAILS_FIELD_PARENT2_NATIONAL_ID = "תעודת זהות הורה 2";
export const SC_DETAILS_FIELD_PARENT_EMAIL = "אימייל הורה";
export const SC_DETAILS_FIELD_ADDRESS = "כתובת";
export const SC_DETAILS_FIELD_EMERGENCY_NAME = "שם איש קשר לחירום";
export const SC_DETAILS_FIELD_EMERGENCY_PHONE = "טלפון חירום";
export const SC_DETAILS_FIELD_MEDICAL_NOTES = "הערות רפואיות / אלרגיות";
export const SC_DETAILS_FIELD_TRANSPORT_NOTES = "הערות הסעה";
export const SC_DETAILS_FIELD_INTERNAL_NOTES = "הערות פנימיות";

export const SC_DETAILS_EMPTY_STATE = "לא הוזנו פרטים נוספים לילד/ה זה.";
export const SC_DETAILS_SAVE_SUCCESS = "הפרטים נשמרו בהצלחה.";
export const SC_DETAILS_SAVE_ERROR = "לא ניתן לשמור את הפרטים כרגע. נסה שוב.";
export const SC_DETAILS_NAME_UPDATE_SUCCESS = "שם הילד/ה עודכן בהצלחה.";
export const SC_DETAILS_NAME_UPDATE_ERROR = "לא ניתן לעדכן את שם הילד/ה כרגע. נסה שוב.";
export const SC_DETAILS_READONLY_BADGE = "צפייה בלבד";
