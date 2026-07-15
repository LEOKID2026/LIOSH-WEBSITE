import {
  baseArticle,
  paragraph,
  heading,
  list,
  callout,
  screenshotBlock,
  videoBlock,
  relatedLinks,
  disclaimerQuoteBlock,
} from "../articleHelpers";

const S = "parent-report";

export const reportOverview = baseArticle({
  slug: "report-overview",
  section: S,
  title: "סקירת דוח ההורים",
  summary: "דוח מקוצר לעומת דוח מפורט - מתי משתמשים בכל אחד.",
  keywords: ["דוח", "סקירה"],
  toc: [
    { id: "short", title: "דוח מקוצר" },
    { id: "detailed", title: "דוח מפורט" },
  ],
  blocks: [
    heading(2, "short", "דוח מקוצר"),
    paragraph("מציג תמונת מצב מהירה: ביצועים, מגמות והמלצות עיקריות."),
    videoBlock(S, "report-overview"),
    screenshotBlock(S, "report-overview", "short-report", "דף דוח הורים מקוצר"),
    heading(2, "detailed", "דוח מפורט"),
    paragraph("כולל פירוט לפי מקצוע, נושאים, מכתב הורי והמלצות ממוקדות."),
    screenshotBlock(S, "report-overview", "detailed-report", "דף דוח מפורט"),
  ],
});

export const summaryCard = baseArticle({
  slug: "summary-card",
  section: S,
  title: "כרטיס סיכום",
  summary: "החלק העליון של הדוח - תמונת מצב כללית.",
  keywords: ["סיכום", "כרטיס"],
  toc: [{ id: "card", title: "כרטיס הסיכום" }],
  blocks: [
    heading(2, "card", "כרטיס הסיכום"),
    paragraph("מציג בקצרה את רמת הביצועים, כמות התרגול והמסר העיקרי להמשך."),
    screenshotBlock(S, "summary-card", "summary", "כרטיס סיכום בראש הדוח"),
    videoBlock(S, "summary-card"),
  ],
});

export const dataPresence = baseArticle({
  slug: "data-presence",
  section: S,
  title: "מספיק נתונים?",
  summary: "מתי לדוח יש מספיק תרגול כדי להציג מסקנות.",
  keywords: ["נתונים", "נוכחות"],
  toc: [{ id: "presence", title: "נוכחות נתונים" }],
  blocks: [
    heading(2, "presence", "נוכחות נתונים"),
    paragraph("אם הילד/ה תרגל מעט, הדוח יציין שאין עדיין מספיק מידע. זה תקין - המשיכו לתרגל."),
    callout("info", "ככל שיש יותר תרגול, התובנות בדוח נעשות מדויקות יותר."),
    screenshotBlock(S, "data-presence", "low-data", "הודעה על מעט נתונים בדוח"),
    videoBlock(S, "data-presence"),
  ],
});

export const trendsAndConfidence = baseArticle({
  slug: "trends-and-confidence",
  section: S,
  title: "מגמות ורמת ביטחון",
  summary: "איך לקרוא מגמה ותגיות ביטחון בדוח.",
  keywords: ["מגמה", "ביטחון"],
  toc: [{ id: "trends", title: "מגמות" }],
  blocks: [
    heading(2, "trends", "מגמות"),
    paragraph("מגמה מראה אם הביצועים משתפרים, יציבים או דורשים חיזוק. רמת הביטחון מסבירה כמה הנתון אמין."),
    screenshotBlock(S, "trends-and-confidence", "trend", "שורת מגמה בדוח"),
    videoBlock(S, "trends-and-confidence"),
  ],
});

export const strengthsAndImprovements = baseArticle({
  slug: "strengths-and-improvements",
  section: S,
  title: "חוזקות ונקודות לשיפור",
  summary: "מה הילד עושה טוב ומה כדאי לחזק.",
  keywords: ["חוזקות", "שיפור"],
  toc: [{ id: "blocks", title: "חלקים בדוח" }],
  blocks: [
    heading(2, "blocks", "חלקים בדוח"),
    list([
      "חוזקות - נושאים שבהם הביצועים טובים",
      "לשיפור - נושאים שדורשים תרגול נוסף",
    ]),
    screenshotBlock(S, "strengths-and-improvements", "strengths", "רשימת חוזקות ושיפורים"),
    videoBlock(S, "strengths-and-improvements"),
  ],
});

export const topicsAndBuckets = baseArticle({
  slug: "topics-and-buckets",
  section: S,
  title: "נושאים לפי מקצוע",
  summary: "פירוט לפי נושאי תרגול (באקטים) בכל מקצוע.",
  keywords: ["נושאים", "מקצוע"],
  toc: [{ id: "topics", title: "טבלאות נושאים" }],
  blocks: [
    heading(2, "topics", "טבלאות נושאים"),
    paragraph("לכל מקצוע מופיעים נושאים ספציפיים - למשל חיבור במתמטיקה או אוצר מילים באנגלית."),
    screenshotBlock(S, "topics-and-buckets", "topics-table", "טבלת נושאים במתמטיקה"),
    videoBlock(S, "topics-and-buckets"),
  ],
});

export const subjectsOverview = baseArticle({
  slug: "subjects-overview",
  section: S,
  title: "סקירת שש המקצועות",
  summary: "תרשים או טבלה המשווה בין המקצועות.",
  keywords: ["מקצועות", "תרשים"],
  toc: [{ id: "chart", title: "תרשים מקצועות" }],
  blocks: [
    heading(2, "chart", "תרשים מקצועות"),
    paragraph("מאפשר לראות במבט אחד איפה הילד חזק ואיפה פחות."),
    screenshotBlock(S, "subjects-overview", "six-subjects", "תרשים שש מקצועות"),
    videoBlock(S, "subjects-overview"),
  ],
});

export const recommendations = baseArticle({
  slug: "recommendations",
  section: S,
  title: "המלצות תרגול",
  summary: "מה המערכת ממליצה לתרגל בהמשך.",
  keywords: ["המלצות"],
  toc: [{ id: "rec", title: "המלצות" }],
  blocks: [
    heading(2, "rec", "המלצות"),
    paragraph("ההמלצות מבוססות על טעויות חוזרות ונושאים שטרם הותקפו."),
    screenshotBlock(S, "recommendations", "recommendations", "אזור המלצות בדוח"),
    videoBlock(S, "recommendations"),
  ],
});

export const challengesSection = baseArticle({
  slug: "challenges-section",
  section: S,
  title: "אתגרים מומלצים",
  summary: "אתגרים שנבחרו להעמקה.",
  keywords: ["אתגרים"],
  toc: [{ id: "challenges", title: "אתגרים" }],
  blocks: [
    heading(2, "challenges", "אתגרים"),
    paragraph("אתגרים מציעים תרגול ממוקד בנושאים שדורשים חיזוק."),
    screenshotBlock(S, "challenges-section", "challenges", "אזור אתגרים בדוח"),
    videoBlock(S, "challenges-section"),
  ],
});

export const detailedReport = baseArticle({
  slug: "detailed-report",
  section: S,
  title: "דוח מפורט",
  summary: "סיכום מנהלים, מכתב הורי ופירוט לפי מקצוע.",
  keywords: ["מפורט", "מכתב"],
  toc: [
    { id: "exec", title: "סיכום מנהלים" },
    { id: "letter", title: "מכתב הורי" },
  ],
  blocks: [
    heading(2, "exec", "סיכום מנהלים"),
    paragraph("פתיח כללי לדוח המפורט עם המסר המרכזי."),
    heading(2, "letter", "מכתב הורי"),
    paragraph("לכל מקצוע יש הסבר מילולי להורים - מה הילד/ה יודע ומה כדאי לחזק."),
    screenshotBlock(S, "detailed-report", "letter", "מכתב הורי במקצוע אחד"),
    videoBlock(S, "detailed-report"),
  ],
});

export const printingAndPdf = baseArticle({
  slug: "printing-and-pdf",
  section: S,
  title: "הדפסה וייצוא PDF",
  summary: "איך לשמור או להדפיס את הדוח.",
  keywords: ["הדפסה", "PDF"],
  toc: [{ id: "export", title: "ייצוא" }],
  blocks: [
    heading(2, "export", "ייצוא"),
    paragraph("בדוח יש אפשרות לייצא לקובץ PDF או להדפיס - שימושי לפגישה עם המורה."),
    screenshotBlock(S, "printing-and-pdf", "pdf", "כפתור ייצוא PDF"),
    videoBlock(S, "printing-and-pdf"),
    callout("tip", "בהדפסה - בדקו בתצוגה מקדימה שהכל נכנס לעמוד."),
  ],
});

export const understandingTheDisclaimer = baseArticle({
  slug: "understanding-the-disclaimer",
  section: S,
  title: "הבנת ההבהרה החשובה",
  summary: "מה אומרת ההבהרה בתחתית הדוח - נוסח מלא.",
  keywords: ["הבהרה", "משפטי"],
  toc: [{ id: "disclaimer", title: "הבהרה חשובה" }],
  blocks: [
    heading(2, "disclaimer", "הבהרה חשובה"),
    paragraph("בכל דוח מופיעה הבהרה שמבהירה שהדוח הוא כלי עזר ולא אבחון מקצועי. הנוסח המלא:"),
    disclaimerQuoteBlock(),
    screenshotBlock(
      S,
      "understanding-the-disclaimer",
      "disclaimer",
      "תיבת הבהרה חשובה בדוח הורים"
    ),
    videoBlock(S, "understanding-the-disclaimer"),
  ],
});

export const PARENT_REPORT_ARTICLES = [
  reportOverview,
  summaryCard,
  dataPresence,
  trendsAndConfidence,
  strengthsAndImprovements,
  topicsAndBuckets,
  subjectsOverview,
  recommendations,
  challengesSection,
  detailedReport,
  printingAndPdf,
  understandingTheDisclaimer,
];
