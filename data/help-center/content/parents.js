import {
  baseArticle,
  paragraph,
  heading,
  list,
  callout,
  screenshotBlock,
  videoBlock,
  relatedLinks,
} from "../articleHelpers";

const S = "parents";

export const welcomeAndOverview = baseArticle({
  slug: "welcome-and-overview",
  section: S,
  title: "ברוכים הבאים למדריך להורים",
  summary: "מה זה ליאו, מה ההורה יכול לעשות באתר, ואיך מתחילים.",
  keywords: ["הורים", "התחלה", "סקירה"],
  toc: [
    { id: "what-is-leo", title: "מה זה ליאו?" },
    { id: "parent-role", title: "תפקיד ההורה" },
  ],
  blocks: [
    heading(2, "what-is-leo", "מה זה ליאו?"),
    paragraph(
      "ליאו הוא מרחב לימודי בעברית לילד/הי כיתות א׳–ו׳, עם תרגול במקצועות שונים, משחקים ודוחות התקדמות להורים."
    ),
    screenshotBlock(S, "welcome-and-overview", "overview", "דף הבית של ליאו עם אזורי לימוד ומשחקים"),
    videoBlock(S, "welcome-and-overview"),
    heading(2, "parent-role", "תפקיד ההורה"),
    list([
      "יצירת חשבון הורה והתחברות",
      "הוספת ילדים וניהול פרטי כניסה",
      "צפייה בדוחות והמלצות תרגול",
    ]),
    relatedLinks([
      { href: "/help/parents/create-parent-account", label: "יצירת חשבון הורה" },
      { href: "/help/parents/parent-dashboard-tour", label: "סיור בעמוד ההורה" },
    ]),
  ],
});

export const createParentAccount = baseArticle({
  slug: "create-parent-account",
  section: S,
  title: "יצירת חשבון הורה",
  summary: "איך נרשמים ונכנסים לעמוד ההורים.",
  keywords: ["הרשמה", "התחברות", "הורים"],
  toc: [{ id: "login-page", title: "עמוד הכניסה" }],
  blocks: [
    heading(2, "login-page", "עמוד הכניסה"),
    paragraph("גלשו לעמוד כניסת ההורים והשלימו הרשמה או התחברות עם האימייל והסיסמה שלכם."),
    screenshotBlock(S, "create-parent-account", "login", "מסך כניסת הורים"),
    videoBlock(S, "create-parent-account"),
    callout("tip", "שמרו את פרטי ההתחברות במקום בטוח - הם נדרשים לכל כניסה חוזרת."),
    relatedLinks([{ href: "/parent/login", label: "מעבר לכניסת הורים" }]),
  ],
});

export const parentDashboardTour = baseArticle({
  slug: "parent-dashboard-tour",
  section: S,
  title: "סיור בעמוד ההורה",
  summary: "רשימת הילדים, יצירת ילד/ה חדש ומגבלת מספר ילדים בחשבון.",
  keywords: ["לוח בקרה", "ילדים", "הורים"],
  toc: [
    { id: "children-list", title: "רשימת הילדים" },
    { id: "limits", title: "מגבלות חשבון" },
  ],
  blocks: [
    heading(2, "children-list", "רשימת הילדים"),
    paragraph("בעמוד ההורה תראו את כל הילדים המשויכים לחשבון, עם שם, כיתה ואפשרויות ניהול."),
    screenshotBlock(S, "parent-dashboard-tour", "dashboard", "עמוד ההורה עם רשימת ילדים"),
    videoBlock(S, "parent-dashboard-tour"),
    heading(2, "limits", "מגבלות חשבון"),
    paragraph("ברירת המחדל מאפשרת עד שלושה ילדים לכל חשבון הורה."),
    callout("info", "אם הגעתם למגבלה, יש לערוך או למחוק ילד/ה קיים לפני הוספת חדש."),
  ],
});

export const addStudents = baseArticle({
  slug: "add-students",
  section: S,
  title: "הוספת ילד/ה",
  summary: "יצירת פרופיל ילד/ה, בחירת כיתה ושמירה.",
  keywords: ["ילד/ה", "כיתה", "הוספה"],
  toc: [{ id: "add-form", title: "טופס הוספה" }],
  blocks: [
    heading(2, "add-form", "טופס הוספה"),
    paragraph("הזינו שם לילד/ה ובחרו כיתה (א׳ עד ו׳). לאחר השמירה יוצגו פרטי כניסה לילד/ה."),
    videoBlock(S, "add-students"),
    screenshotBlock(S, "add-students", "form", "טופס הוספת ילד/ה עם בחירת כיתה"),
    list(["כיתה א׳ - grade_1", "כיתה ב׳ - grade_2", "ועד כיתה ו׳ - grade_6"], false),
  ],
});

export const studentPinAndCredentials = baseArticle({
  slug: "student-pin-and-credentials",
  section: S,
  title: "קוד PIN ופרטי כניסה לילד/ה",
  summary: "מה זה PIN, מתי הוא מוצג פעם אחת, ואיך מאפסים.",
  keywords: ["PIN", "סיסמה", "ילד/ה"],
  toc: [
    { id: "what-is-pin", title: "מה זה PIN?" },
    { id: "reset", title: "איפוס" },
  ],
  blocks: [
    heading(2, "what-is-pin", "מה זה PIN?"),
    paragraph("הילד/ה נכנס עם שם משתמש וקוד בן 4 ספרות. לאחר יצירה או איפוס, הקוד מוצג פעם אחת - שמרו אותו."),
    screenshotBlock(S, "student-pin-and-credentials", "pin-display", "הודעה עם קוד PIN חדש"),
    videoBlock(S, "student-pin-and-credentials"),
    heading(2, "reset", "איפוס"),
    paragraph("בעמוד ההורה אפשר ליצור קוד כניסה חדש לילד/ה. הקוד הישן יפסיק לעבוד."),
    callout("warning", "אל תשתפו את הקוד ברשתות חברתיות או בקבוצות ציבוריות."),
  ],
});

export const editOrDeleteStudent = baseArticle({
  slug: "edit-or-delete-student",
  section: S,
  title: "עריכה ומחיקת ילד/ה",
  summary: "שינוי שם או כיתה, ומחיקה עם אישור.",
  keywords: ["עריכה", "מחיקה", "ילד/ה"],
  toc: [{ id: "edit", title: "עריכה" }, { id: "delete", title: "מחיקה" }],
  blocks: [
    heading(2, "edit", "עריכה"),
    paragraph("לחצו על עריכה ליד שם הילד/ה, עדכנו פרטים ושמרו."),
    screenshotBlock(S, "edit-or-delete-student", "edit", "מצב עריכת פרטי ילד/ה"),
    videoBlock(S, "edit-or-delete-student"),
    heading(2, "delete", "מחיקה"),
    paragraph("מחיקה דורשת הקלדת שם הילד/ה לאישור - פעולה שלא ניתן לבטל."),
    callout("warning", "מחיקת ילד/ה מסירה את הגישה והנתונים המשויכים אליו מהחשבון שלכם."),
  ],
});

export const howToReadReport = baseArticle({
  slug: "how-to-read-report",
  section: S,
  title: "איך מתחילים לקרוא את הדוח?",
  summary: "מבוא קצר לדוח ההורים וקישור למדריכי הפרטים.",
  keywords: ["דוח", "הורים", "קריאה"],
  toc: [{ id: "open-report", title: "פתיחת דוח" }],
  blocks: [
    heading(2, "open-report", "פתיחת דוח"),
    paragraph("מעמוד ההורה בחרו ילד ולחצו על צפייה בדוח. תוכלו לעבור בין דוח מקוצר לדוח מפורט."),
    videoBlock(S, "how-to-read-report"),
    screenshotBlock(S, "how-to-read-report", "report-link", "כפתור מעבר לדוח מהורה"),
    relatedLinks([
      { href: "/help/parent-report/report-overview", label: "סקירת הדוח" },
      { href: "/help/parent-report/summary-card", label: "כרטיס סיכום" },
    ]),
  ],
});

export const parentCopilot = baseArticle({
  slug: "parent-copilot",
  section: S,
  title: "שאלו על הדוח (Copilot)",
  summary: "איך לשאול שאלות על הדוח ומה המערכת יודעת לענות.",
  keywords: ["Copilot", "שאלות", "דוח"],
  toc: [
    { id: "how-to-ask", title: "איך שואלים?" },
    { id: "limits", title: "מגבלות" },
  ],
  blocks: [
    heading(2, "how-to-ask", "איך שואלים?"),
    paragraph("בתוך הדוח פתחו את אזור \"שאלו על הדוח\" והקלידו שאלה בעברית על הביצועים, הנושאים או ההמלצות."),
    videoBlock(S, "parent-copilot"),
    screenshotBlock(S, "parent-copilot", "copilot-panel", "פאנל שאלות על הדוח"),
    heading(2, "limits", "מגבלות"),
    list([
      "התשובות מבוססות על נתוני התרגול באתר",
      "אין להחליף ייעוץ חינוכי מקצועי",
      "שאלות שלא קשורות לדוח עלולות לקבל תשובה כללית",
    ]),
  ],
});

export const monthlyRewards = baseArticle({
  slug: "monthly-rewards",
  section: S,
  title: "פרס התמדה חודשי",
  summary: "מסע התמדה לפי מקצוע ופרסים להורים.",
  keywords: ["פרס", "התמדה", "חודשי"],
  toc: [{ id: "journey", title: "מסע התמדה" }],
  blocks: [
    heading(2, "journey", "מסע התמדה"),
    paragraph("הילד צובר התמדה בתרגול חודשי. בעמוד הפרסים תוכלו לראות התקדמות לפי מקצוע."),
    screenshotBlock(S, "monthly-rewards", "rewards", "עמוד פרסי התמדה"),
    videoBlock(S, "monthly-rewards"),
    relatedLinks([{ href: "/parent/rewards", label: "מעבר לעמוד הפרסים" }]),
  ],
});

export const installAsApp = baseArticle({
  slug: "install-as-app",
  section: S,
  title: "התקנה כיישומון",
  summary: "הוספת ליאו למסך הבית בטלפון או בטאבלט.",
  keywords: ["PWA", "התקנה", "אפליקציה"],
  toc: [{ id: "install", title: "התקנה" }],
  blocks: [
    heading(2, "install", "התקנה"),
    paragraph("בדף הבית או בדפדפן תופיע אפשרות \"התקן כאפליקציה\" - לחצו ואשרו. כך תוכלו לפתוח את ליאו כמו אפליקציה."),
    screenshotBlock(S, "install-as-app", "install-prompt", "הודעת התקנת אפליקציה"),
    videoBlock(S, "install-as-app"),
    callout("tip", "באייפון: שתפו → הוסף למסך הבית."),
  ],
});

export const mobileAndOffline = baseArticle({
  slug: "mobile-and-offline",
  section: S,
  title: "נייד ומשחקים לא מקוונים",
  summary: "שימוש בטלפון ובמשחקים ללא אינטרנט.",
  keywords: ["נייד", "לא מקוון", "offline"],
  toc: [
    { id: "mobile", title: "שימוש בנייד" },
    { id: "offline", title: "לא מקוון" },
  ],
  blocks: [
    heading(2, "mobile", "שימוש בנייד"),
    paragraph("האתר מותאם למסכים קטנים. התחברות ילד/ה והורה עובדת גם מהטלפון."),
    heading(2, "offline", "לא מקוון"),
    paragraph("באזור \"לא מקוון\" יש משחקים שעובדים על אותו מכשיר בלי חיבור לאינטרנט."),
    screenshotBlock(S, "mobile-and-offline", "offline-hub", "עמוד משחקים לא מקוונים"),
    videoBlock(S, "mobile-and-offline"),
    relatedLinks([{ href: "/offline", label: "משחקים לא מקוונים" }]),
  ],
});

export const troubleshootingLogin = baseArticle({
  slug: "troubleshooting-login",
  section: S,
  title: "פתרון בעיות כניסה",
  summary: "PIN שגוי, חשבון נעול וניקוי דפדפן.",
  keywords: ["תקלה", "כניסה", "PIN"],
  toc: [{ id: "common", title: "בעיות נפוצות" }],
  blocks: [
    heading(2, "common", "בעיות נפוצות"),
    list([
      "PIN שגוי - בקשו מההורה קוד חדש",
      "שם משתמש לא מזוהה - ודאו איות נכון",
      "דף לא נטען - נסו רענון או ניקוי מטמון הדפדפן",
    ]),
    callout("info", "אם הבעיה נמשכת, פנו אלינו דרך עמוד צור קשר."),
    videoBlock(S, "troubleshooting-login"),
    relatedLinks([{ href: "/contact", label: "צור קשר" }]),
  ],
});

export const privacyAndData = baseArticle({
  slug: "privacy-and-data",
  section: S,
  title: "פרטיות ונתונים",
  summary: "מה נאסף בתרגול ואיך לפנות בנושאי פרטיות.",
  keywords: ["פרטיות", "נתונים"],
  toc: [{ id: "data", title: "נתוני תרגול" }],
  blocks: [
    heading(2, "data", "נתוני תרגול"),
    paragraph(
      "המערכת שומרת נתוני תרגול כדי להציג התקדמות ודוחות. אין לשתף קודי כניסה של ילדים עם אחרים."
    ),
    callout("info", "לשאלות או בקשות בנושא פרטיות - ראו מדיניות פרטיות או פנו אלינו בצור קשר."),
    videoBlock(S, "privacy-and-data"),
    relatedLinks([
      { href: "/privacy", label: "מדיניות פרטיות" },
      { href: "/legal", label: "תנאים, פרטיות ונגישות" },
      { href: "/contact", label: "צור קשר" },
    ]),
  ],
});

export const PARENT_ARTICLES = [
  welcomeAndOverview,
  createParentAccount,
  parentDashboardTour,
  addStudents,
  studentPinAndCredentials,
  editOrDeleteStudent,
  howToReadReport,
  parentCopilot,
  monthlyRewards,
  installAsApp,
  mobileAndOffline,
  troubleshootingLogin,
  privacyAndData,
];
