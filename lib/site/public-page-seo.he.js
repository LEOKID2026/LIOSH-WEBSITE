/**
 * Hebrew SEO metadata for public marketing and legal pages.
 * @typedef {{ title: string; description: string; canonicalPath: string; noindex?: boolean }} PublicPageSeoEntry
 */

/** @type {Record<string, PublicPageSeoEntry>} */
export const PUBLIC_PAGE_SEO = {
  home: {
    title: "LEO KIDS - למידה, משחקים ומעקב התקדמות לילדים",
    description:
      "מערכת למידה לילדים בגילאי 6–12, המשלבת תרגול ומשחקים עם מעקב לפי מקצועות, נושאים, מיומנויות ותתי-מיומנויות ודוחות ברורים להורים.",
    canonicalPath: "/",
  },
  privacy: {
    title: "מדיניות פרטיות · LEO KIDS",
    description: "מדיניות פרטיות Leo Kids - איזה מידע נאסף, איך הוא נשמר ומהן זכויות המשתמשים.",
    canonicalPath: "/privacy",
  },
  terms: {
    title: "תנאי שימוש · LEO KIDS",
    description: "תנאי שימוש Leo Kids - כללי שימוש במתמטיקה, בתרגול, בדוחות ובמשחקים.",
    canonicalPath: "/terms",
  },
  legal: {
    title: "מסמכים משפטיים · LEO KIDS",
    description:
      "תנאים, פרטיות, נגישות, אבטחה, גילוי בינה מלאכותית ומחיקת נתונים - כל המסמכים המשפטיים של Leo Kids.",
    canonicalPath: "/legal",
  },
  security: {
    title: "אבטחת מידע · LEO KIDS",
    description: "אבטחת מידע ב-Leo Kids - איך אנחנו מגנים על נתוני ילדים, הורים ומורים.",
    canonicalPath: "/security",
  },
  accessibility: {
    title: "הצהרת נגישות · LEO KIDS",
    description: "הצהרת נגישות Leo Kids - מחויבות לשיפור הנגישות ודרכי פנייה בנושא.",
    canonicalPath: "/accessibility",
  },
  "ai-disclosure": {
    title: "גילוי שימוש בבינה מלאכותית · LEO KIDS",
    description: "גילוי שימוש בבינה מלאכותית ב-Leo Kids - היכן משתמשים בבינה מלאכותית ומה המגבלות.",
    canonicalPath: "/ai-disclosure",
  },
  "data-deletion": {
    title: "מחיקת נתונים · LEO KIDS",
    description: "מחיקת נתונים ב-Leo Kids - איך לבקש מחיקה ומה קורה אחרי הבקשה.",
    canonicalPath: "/data-deletion",
  },
  contact: {
    title: "יצירת קשר · LEO KIDS",
    description: "יצירת קשר עם Leo Kids - שאלות, תמיכה, דיווח על תקלה או הצעה לשיפור.",
    canonicalPath: "/contact",
  },
  about: {
    title: "אודות · LEO KIDS",
    description: "אודות ליאו - תרגול לפי מקצוע, דוחות להורים, משחקים, מטבעות וקלפים לילדים.",
    canonicalPath: "/about",
  },
  help: {
    title: "מרכז עזרה · LEO KIDS",
    description: "מרכז עזרה בעברית - מדריכים להורים, לילדים, לדוחות ולמקצועות.",
    canonicalPath: "/help",
  },
  kids: {
    title: "לומדים ומשחקים עם ליאו · LEO KIDS",
    description:
      "תרגול במתמטיקה, עברית, אנגלית וגאומטריה - עם משחקים, מטבעות, קלפים והפתעות בדרך.",
    canonicalPath: "/kids",
  },
  parents: {
    title: "פורטל הורים · LEO KIDS",
    description:
      "דוחות התקדמות, זיהוי נקודות לחיזוק ושליחת פעילויות אישיות - כלים להורים ב-Leo Kids.",
    canonicalPath: "/parents",
  },
  teachers: {
    title: "פורטל מורים · LEO KIDS",
    description: "כלי מעקב, פעילויות אישיות ודוחות - פתרון למורים פרטיים ב-Leo Kids.",
    canonicalPath: "/teachers",
  },
  games: {
    title: "משחקים · LEO KIDS",
    description: "משחקי ליאו, משחקים חינוכיים ומשחקים עם חברים - הכל במקום אחד.",
    canonicalPath: "/games",
  },
  learning: {
    title: "למידה ותרגול · LEO KIDS",
    description: "תרגול במתמטיקה, גאומטריה, עברית, אנגלית, מדעים ומולדת - לפי מקצוע ורמה.",
    canonicalPath: "/learning",
  },
  gallery: {
    title: "הגלריה של ליאו · LEO KIDS",
    description: "תמונות וסרטונים של ליאו - הכלב שמלווה את עולם הילדים באתר.",
    canonicalPath: "/gallery",
  },
  "parent-login": {
    title: "כניסת הורים · LEO KIDS",
    description: "כניסה לפורטל ההורים של Leo Kids.",
    canonicalPath: "/parent/login",
    noindex: true,
  },
  "teacher-login": {
    title: "כניסת מורים · LEO KIDS",
    description: "כניסה לפורטל המורים של Leo Kids.",
    canonicalPath: "/teacher/login",
    noindex: true,
  },
  "student-home": {
    title: "בית הילד · LEO KIDS",
    description: "אזור אישי לילדים ב-Leo Kids.",
    canonicalPath: "/student/home",
    noindex: true,
  },
  "practice-hub": {
    title: "תרגול לילדי יסודי לפי מקצוע וכיתה · LEO KIDS",
    description:
      "Leo Kids מציע תרגול דיגיטלי לילדי יסודי במגוון תחומים - מתמטיקה, עברית, קריאה, אנגלית, גאומטריה, מדעים ועוד. ההורה יכול להתחיל בקלות ולעקוב אחרי ההתקדמות.",
    canonicalPath: "/practice",
  },
  "practice-math": {
    title: "תרגול מתמטיקה לפי כיתה ונושא · LEO KIDS",
    description:
      "תרגול מתמטיקה לילדי יסודי ב-Leo Kids - חיבור, חיסור, כפל, חילוק, שברים, אחוזים ונושאים מתקדמים יותר, עם תרגול דיגיטלי ומעקב להורים.",
    canonicalPath: "/practice/math",
  },
  "practice-hebrew": {
    title: "תרגול עברית לפי כיתה ונושא · LEO KIDS",
    description:
      "תרגול עברית לילדי יסודי ב-Leo Kids - שפה, אוצר מילים, הבנה, כתיבה, דקדוק וניסוח, עם תרגול הדרגתי ומעקב פשוט להורים.",
    canonicalPath: "/practice/hebrew",
  },
  "practice-reading": {
    title: "תרגול קריאה והבנת הנקרא לילדי יסודי · LEO KIDS",
    description:
      "תרגול קריאה והבנת הנקרא לילדי יסודי: זיהוי מילים, איתור מידע, רעיון מרכזי, סיבה ותוצאה והסקת מסקנות.",
    canonicalPath: "/practice/reading",
  },
  "practice-english": {
    title: "תרגול אנגלית לפי כיתה ונושא · LEO KIDS",
    description:
      "תרגול אנגלית לילדי יסודי ב-Leo Kids - אוצר מילים, הבנה בסיסית, קריאה, כתיבה ודקדוק לפי רמה, עם תרגול קצר ומשחקי בבית.",
    canonicalPath: "/practice/english",
  },
  "practice-geometry": {
    title: "תרגול גאומטריה לפי כיתה ונושא · LEO KIDS",
    description:
      "תרגול גאומטריה לילדי יסודי ב-Leo Kids - צורות, קווים, זוויות, מדידה, היקף, שטח ונושאים מתקדמים יותר, עם הסברים חזותיים ותרגול דיגיטלי.",
    canonicalPath: "/practice/geometry",
  },
  "practice-science": {
    title: "תרגול מדעים לפי נושא · LEO KIDS",
    description:
      "תרגול מדעים לילדי יסודי ב-Leo Kids - גוף האדם, בעלי חיים, צמחים, חומרים, כדור הארץ והחלל, סביבה וחשיבה מדעית, בצורה פשוטה וברורה.",
    canonicalPath: "/practice/science",
  },
  "practice-moledet": {
    title: "תרגול מולדת - משפחה, קהילה וסביבה · LEO KIDS",
    description:
      "תרגול מולדת לכיתות ב׳-ד׳ בנושאי משפחה, קהילה, יישוב, מפות, סמלים, אחריות וקשר בין אדם לסביבה.",
    canonicalPath: "/practice/moledet",
  },
  "practice-geography": {
    title: "תרגול גאוגרפיה - מפות, אזורים ואדם בסביבה · LEO KIDS",
    description:
      "תרגול גאוגרפיה לכיתות ה׳-ו׳ בנושאי מפות, כיוונים, אזורים, אקלים, אוכלוסייה וקשרים בין אדם לסביבה.",
    canonicalPath: "/practice/geography",
  },
  "practice-history": {
    title: "תרגול היסטוריה - אירועים, תקופות ומקורות · LEO KIDS",
    description:
      "תרגול היסטוריה לכיתה ו׳ בנושאי רצף זמנים, אירועים, דמויות, מקורות, סיבה ותוצאה והשוואה בין תקופות.",
    canonicalPath: "/practice/history",
  },
  "practice-games": {
    title: "משחקי למידה לילדים לפי מקצוע ורמה · LEO KIDS",
    description:
      "משחקי למידה לילדים ב-Leo Kids - תרגול דיגיטלי שמרגיש משחקי יותר, עם אתגרים, חיזוקים ומעקב להורים.",
    canonicalPath: "/practice/games",
  },
  "practice-no-print": {
    title: "תרגול דיגיטלי לילדים - בלי חובה להדפיס · LEO KIDS",
    description:
      "תרגול דיגיטלי לילדים לפי מקצוע, כיתה ונושא, עם שאלות משתנות, משחקי למידה ומעקב אחר הפעילות.",
    canonicalPath: "/practice/no-print",
  },
  "practice-parent-reports": {
    title: "דוחות התקדמות להורים - להבין מה הילד תרגל · LEO KIDS",
    description:
      "דוחות התקדמות להורים ב-Leo Kids - מעקב אחרי פעילות הילד, מקצועות שתורגלו, נושאים שכדאי לחזק ודוחות רגילים או מפורטים לפי הנתונים הקיימים.",
    canonicalPath: "/practice/parent-reports",
  },
  "practice-worksheets": {
    title: "דפי עבודה לילדים - לתרגל, להדפיס כשמתאים או לשלב עם תרגול אונליין · LEO KIDS",
    description:
      "דפי עבודה לילדים במתמטיקה, גאומטריה, עברית ואנגלית - התנסות עם 8 תרגילים, 35 דפים מוכנים, צפייה והדפסה כשמתאים, ודף תשובות בלי הרשמה.",
    canonicalPath: "/practice/worksheets",
  },
  "guides-hub": {
    title: "מדריכים מעשיים לתרגול ולמידה בבית · LEO KIDS",
    description:
      "מדריכים מעשיים להורים לתרגול בבית: מתמטיקה, קריאה, אנגלית, משחקי למידה, שגרת תרגול, דוחות התקדמות ודפי עבודה.",
    canonicalPath: "/guides",
  },
  "guides-math-practice-at-home": {
    title: "תרגול מתמטיקה בבית - איך להתחיל נכון · LEO KIDS",
    description:
      "מדריך לתרגול מתמטיקה בבית: בחירת נושא, התאמת רמה, עבודה עם טעויות והחלטה מתי להמשיך לנושא הבא.",
    canonicalPath: "/guides/math-practice-at-home",
  },
  "guides-reading-practice-at-home": {
    title: "תרגול קריאה בבית - דיוק, קצב והבנה · LEO KIDS",
    description:
      "מדריך לתרגול קריאה בבית: בחירת טקסט מתאים, עבודה על דיוק, קצב, מילים חדשות והבנת התוכן.",
    canonicalPath: "/guides/reading-practice-at-home",
  },
  "guides-no-print-worksheets": {
    title: "תרגול בבית בלי חובה להדפיס · LEO KIDS",
    description:
      "מדריך לשילוב תרגול דיגיטלי, משחקי למידה ודפי עבודה בבית, לפי הנושא, הילד והזמן שעומד לרשותכם.",
    canonicalPath: "/guides/no-print-worksheets",
  },
  "guides-learning-games-at-home": {
    title: "איך לשלב משחקי למידה בבית · LEO KIDS",
    description:
      "מדריך להורים על משחקי למידה בבית - איך להשתמש בחוויה משחקית כדי לעודד תרגול, בלי להפוך את זה לזמן מסך ריק.",
    canonicalPath: "/guides/learning-games-at-home",
  },
  "guides-parent-progress-tracking": {
    title: "איך לקרוא את דוחות ההתקדמות של הילד · LEO KIDS",
    description:
      "מדריך להורים: איך לעקוב אחרי התקדמות הילד בלי להציף - פעילות, מקצועות שתורגלו, נושאים שכדאי לחזק ושגרת בדיקה פשוטה.",
    canonicalPath: "/guides/parent-progress-tracking",
  },
  "guides-home-practice-routine": {
    title: "איך לבנות שגרת תרגול שמתאימה לבית · LEO KIDS",
    description:
      "מדריך מעשי לבניית שגרת תרגול בבית: בחירת זמן מתאים, מטרה אחת לכל מפגש, סיום ברור והתאמת ההמשך לפי ההתקדמות.",
    canonicalPath: "/guides/home-practice-routine",
  },
  "guides-math-games-for-kids": {
    title: "משחקי מתמטיקה לילדים - תרגול דרך אתגר · LEO KIDS",
    description:
      "מדריך להורים על משחקי מתמטיקה לילדים בבית - איך לחזק חיבור, חיסור, כפל, חילוק ושברים דרך תרגול משחקי ולא מאיים.",
    canonicalPath: "/guides/math-games-for-kids",
  },
  "guides-reading-comprehension-at-home": {
    title: "הבנת הנקרא בבית - איך לעבוד עם טקסט ושאלות · LEO KIDS",
    description:
      "מדריך להורים: איך לתרגל הבנת הנקרא בבית - שאלות פשוטות, איתור מידע, הסקת מסקנות וניסוח תשובה קצרה.",
    canonicalPath: "/guides/reading-comprehension-at-home",
  },
  "guides-english-vocabulary-practice": {
    title: "תרגול אוצר מילים באנגלית בבית · LEO KIDS",
    description:
      "מדריך להורים: איך לתרגל אוצר מילים באנגלית בבית - חזרות קצרות, מילים בהקשר, משפטים פשוטים ותרגול דיגיטלי ב-Leo Kids.",
    canonicalPath: "/guides/english-vocabulary-practice",
  },
  "guides-how-to-follow-child-progress": {
    title: "איך לבחור את הנושא הבא שכדאי לחזק · LEO KIDS",
    description:
      "מדריך לבחירת נושא לחיזוק באמצעות דוחות, טעויות שחוזרות, הסבר הדרך ובדיקה של ההתקדמות לאחר תרגול ממוקד.",
    canonicalPath: "/guides/how-to-follow-child-progress",
  },
};

/**
 * @param {keyof typeof PUBLIC_PAGE_SEO} key
 * @returns {PublicPageSeoEntry}
 */
export function getPublicPageSeo(key) {
  return PUBLIC_PAGE_SEO[key];
}
