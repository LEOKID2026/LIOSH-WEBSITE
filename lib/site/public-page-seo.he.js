/**
 * Hebrew SEO metadata for public marketing and legal pages.
 * @typedef {{ title: string; description: string; canonicalPath: string; noindex?: boolean }} PublicPageSeoEntry
 */

/** @type {Record<string, PublicPageSeoEntry>} */
export const PUBLIC_PAGE_SEO = {
  home: {
    title: "LEO KIDS — למידה, משחקים ומעקב התקדמות לילדים",
    description:
      "מערכת למידה לילדים בגילאי 6–12, המשלבת תרגול ומשחקים עם מעקב לפי מקצועות, נושאים, מיומנויות ותתי־מיומנויות ודוחות ברורים להורים.",
    canonicalPath: "/",
  },
  privacy: {
    title: "מדיניות פרטיות · LEO KIDS",
    description: "מדיניות פרטיות Leo Kids — איזה מידע נאסף, איך הוא נשמר ומהן זכויות המשתמשים.",
    canonicalPath: "/privacy",
  },
  terms: {
    title: "תנאי שימוש · LEO KIDS",
    description: "תנאי שימוש Leo Kids — כללי שימוש בחשבון, בתרגול, בדוחות ובמשחקים.",
    canonicalPath: "/terms",
  },
  legal: {
    title: "מסמכים משפטיים · LEO KIDS",
    description:
      "תנאים, פרטיות, נגישות, אבטחה, גילוי בינה מלאכותית ומחיקת נתונים — כל המסמכים המשפטיים של Leo Kids.",
    canonicalPath: "/legal",
  },
  security: {
    title: "אבטחת מידע · LEO KIDS",
    description: "אבטחת מידע ב-Leo Kids — איך אנחנו מגנים על נתוני ילדים, הורים ומורים.",
    canonicalPath: "/security",
  },
  accessibility: {
    title: "הצהרת נגישות · LEO KIDS",
    description: "הצהרת נגישות Leo Kids — מחויבות לשיפור הנגישות ודרכי פנייה בנושא.",
    canonicalPath: "/accessibility",
  },
  "ai-disclosure": {
    title: "גילוי שימוש בבינה מלאכותית · LEO KIDS",
    description: "גילוי שימוש בבינה מלאכותית ב-Leo Kids — היכן משתמשים בבינה מלאכותית ומה המגבלות.",
    canonicalPath: "/ai-disclosure",
  },
  "data-deletion": {
    title: "מחיקת נתונים · LEO KIDS",
    description: "מחיקת נתונים ב-Leo Kids — איך לבקש מחיקה ומה קורה אחרי הבקשה.",
    canonicalPath: "/data-deletion",
  },
  contact: {
    title: "יצירת קשר · LEO KIDS",
    description: "יצירת קשר עם Leo Kids — שאלות, תמיכה, דיווח על תקלה או הצעה לשיפור.",
    canonicalPath: "/contact",
  },
  about: {
    title: "אודות · LEO KIDS",
    description: "אודות ליאו — תרגול לפי מקצוע, דוחות להורים, משחקים, מטבעות וקלפים לילדים.",
    canonicalPath: "/about",
  },
  help: {
    title: "מרכז עזרה · LEO KIDS",
    description: "מרכז עזרה בעברית — מדריכים להורים, לילדים, לדוחות ולמקצועות.",
    canonicalPath: "/help",
  },
  kids: {
    title: "לומדים ומשחקים עם ליאו · LEO KIDS",
    description:
      "תרגול במתמטיקה, עברית, אנגלית וגאומטריה — עם משחקים, מטבעות, קלפים והפתעות בדרך.",
    canonicalPath: "/kids",
  },
  parents: {
    title: "פורטל הורים · LEO KIDS",
    description:
      "דוחות התקדמות, זיהוי נקודות לחיזוק ושליחת פעילויות אישיות — כלים להורים ב-Leo Kids.",
    canonicalPath: "/parents",
  },
  teachers: {
    title: "פורטל מורים · LEO KIDS",
    description: "כלי מעקב, פעילויות אישיות ודוחות — פתרון למורים פרטיים ב-Leo Kids.",
    canonicalPath: "/teachers",
  },
  games: {
    title: "משחקים · LEO KIDS",
    description: "משחקי ליאו, משחקים חינוכיים ומשחקים עם חברים — הכל במקום אחד.",
    canonicalPath: "/games",
  },
  learning: {
    title: "למידה ותרגול · LEO KIDS",
    description: "תרגול במתמטיקה, גאומטריה, עברית, אנגלית, מדעים ומולדת — לפי מקצוע ורמה.",
    canonicalPath: "/learning",
  },
  gallery: {
    title: "הגלריה של ליאו · LEO KIDS",
    description: "תמונות וסרטונים של ליאו — הכלב שמלווה את עולם הילדים באתר.",
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
    title: "תרגול לילדי יסודי בבית · LEO KIDS",
    description:
      "Leo Kids מציע תרגול דיגיטלי לילדי יסודי במגוון תחומים — חשבון, עברית, קריאה, אנגלית, גיאומטריה, מדעים ועוד. ההורה יכול להתחיל בקלות ולעקוב אחרי ההתקדמות.",
    canonicalPath: "/practice",
  },
  "practice-math": {
    title: "תרגול חשבון לילדים · LEO KIDS",
    description:
      "תרגול חשבון לילדי יסודי ב־Leo Kids — חיבור, חיסור, כפל, חילוק, שברים, אחוזים ונושאים מתקדמים יותר, עם תרגול דיגיטלי ומעקב להורים.",
    canonicalPath: "/practice/math",
  },
  "practice-hebrew": {
    title: "תרגול עברית לילדים · LEO KIDS",
    description:
      "תרגול עברית לילדי יסודי ב־Leo Kids — שפה, אוצר מילים, הבנה, כתיבה, דקדוק וניסוח, עם תרגול הדרגתי ומעקב פשוט להורים.",
    canonicalPath: "/practice/hebrew",
  },
  "practice-reading": {
    title: "תרגול קריאה והבנת הנקרא לילדים · LEO KIDS",
    description:
      "תרגול קריאה והבנת הנקרא לילדים ב־Leo Kids — כחלק מתחום העברית. קריאה, שאלות הבנה, טקסטים קצרים ותרגול רגוע בבית.",
    canonicalPath: "/practice/reading",
  },
  "practice-english": {
    title: "תרגול אנגלית לילדים · LEO KIDS",
    description:
      "תרגול אנגלית לילדי יסודי ב־Leo Kids — אוצר מילים, הבנה בסיסית, קריאה, כתיבה ודקדוק לפי רמה, עם תרגול קצר ומשחקי בבית.",
    canonicalPath: "/practice/english",
  },
  "practice-geometry": {
    title: "תרגול גיאומטריה לילדים · LEO KIDS",
    description:
      "תרגול גיאומטריה לילדי יסודי ב־Leo Kids — צורות, קווים, זוויות, מדידה, היקף, שטח ונושאים מתקדמים יותר, עם הסברים חזותיים ותרגול דיגיטלי.",
    canonicalPath: "/practice/geometry",
  },
  "practice-science": {
    title: "מדעים לילדים · LEO KIDS",
    description:
      "תרגול מדעים לילדי יסודי ב־Leo Kids — גוף האדם, בעלי חיים, צמחים, חומרים, כדור הארץ והחלל, סביבה וחשיבה מדעית, בצורה פשוטה וברורה.",
    canonicalPath: "/practice/science",
  },
  "practice-moledet": {
    title: "מולדת לילדים · LEO KIDS",
    description:
      "תרגול מולדת לילדים ב־Leo Kids — בית, קהילה, אזרחות, ערכים וסביבה קרובה, בעיקר לכיתות ב׳–ד׳, עם תרגול דיגיטלי ברור להורים ולילדים.",
    canonicalPath: "/practice/moledet",
  },
  "practice-geography": {
    title: "גיאוגרפיה לילדים · LEO KIDS",
    description:
      "תרגול גיאוגרפיה לילדים ב־Leo Kids — מפות, מרחב, מקומות וסביבה, בעיקר לכיתות ה׳–ו׳, עם תרגול דיגיטלי ברור ונוח.",
    canonicalPath: "/practice/geography",
  },
  "practice-history": {
    title: "היסטוריה לילדים · LEO KIDS",
    description:
      "תרגול היסטוריה לילדים ב־Leo Kids — בעיקר לכיתה ו׳, עם נושאים כמו יוון, הלניזם, חשמונאים, רומא והיהודים, מקורות וציר זמן.",
    canonicalPath: "/practice/history",
  },
  "practice-games": {
    title: "משחקי למידה לילדים · LEO KIDS",
    description:
      "משחקי למידה לילדים ב־Leo Kids — תרגול דיגיטלי שמרגיש משחקי יותר, עם אתגרים, חיזוקים ומעקב להורים. לא מקצוע נפרד, אלא דרך לתרגל.",
    canonicalPath: "/practice/games",
  },
  "practice-no-print": {
    title: "תרגול לילדים בלי להדפיס דפי עבודה · LEO KIDS",
    description:
      "מחפשים דפי עבודה להדפסה? ב־Leo Kids אפשר לתרגל אונליין — בלי PDF להורדה, בלי הדפסה ובלי בדיקה ידנית של דפים.",
    canonicalPath: "/practice/no-print",
  },
  "practice-parent-reports": {
    title: "דוחות התקדמות להורים · LEO KIDS",
    description:
      "דוחות התקדמות להורים ב־Leo Kids — מעקב אחרי פעילות הילד, מקצועות שתורגלו, נושאים שכדאי לחזק ודוחות רגילים או מפורטים לפי הנתונים הקיימים.",
    canonicalPath: "/practice/parent-reports",
  },
  "guides-hub": {
    title: "מדריכים להורים · LEO KIDS",
    description:
      "מדריכים קצרים להורים על תרגול בבית: חשבון, קריאה, אנגלית, משחקי למידה, תרגול בלי הדפסה ומעקב אחרי התקדמות הילד.",
    canonicalPath: "/guides",
  },
  "guides-math-practice-at-home": {
    title: "איך לעזור לילד לתרגל חשבון בבית · LEO KIDS",
    description:
      "מדריך להורים: איך לעזור לילד לתרגל חשבון בבית בצורה קצרה וברורה — נושא אחד בכל פעם, בלי עומס ועם תרגול דיגיטלי ב־Leo Kids.",
    canonicalPath: "/guides/math-practice-at-home",
  },
  "guides-reading-practice-at-home": {
    title: "איך לעודד קריאה בבית · LEO KIDS",
    description:
      "מדריך להורים: איך לעודד קריאה בבית בלי לחץ — קריאה קצרה, שאלות הבנה, שיחה רגועה וחיבור לתרגול עברית ב־Leo Kids.",
    canonicalPath: "/guides/reading-practice-at-home",
  },
  "guides-no-print-worksheets": {
    title: "דפי עבודה או תרגול אונליין · LEO KIDS",
    description:
      "מחפשים דפי עבודה להדפסה? מדריך להורים על ההבדל בין דפים מודפסים לתרגול אונליין — ולמה Leo Kids מציע חלופה דיגיטלית בלי PDF.",
    canonicalPath: "/guides/no-print-worksheets",
  },
  "guides-learning-games-at-home": {
    title: "משחקי למידה בבית · LEO KIDS",
    description:
      "מדריך להורים על משחקי למידה בבית — איך להשתמש בחוויה משחקית כדי לעודד תרגול, בלי להפוך את זה לזמן מסך ריק.",
    canonicalPath: "/guides/learning-games-at-home",
  },
  "guides-parent-progress-tracking": {
    title: "איך לעקוב אחרי התקדמות הילד · LEO KIDS",
    description:
      "מדריך להורים: איך לעקוב אחרי התקדמות הילד בלי להציף — פעילות, מקצועות שתורגלו, נושאים שכדאי לחזק ושגרת בדיקה פשוטה.",
    canonicalPath: "/guides/parent-progress-tracking",
  },
  "guides-home-practice-routine": {
    title: "איך לבנות שגרת תרגול קצרה בבית · LEO KIDS",
    description:
      "מדריך להורים: איך לבנות שגרת תרגול קצרה בבית — 10 דקות, נושא אחד, זמן קבוע, בלי עומס ועם חיזוק חיובי.",
    canonicalPath: "/guides/home-practice-routine",
  },
  "guides-math-games-for-kids": {
    title: "משחקי חשבון לילדים בבית · LEO KIDS",
    description:
      "מדריך להורים על משחקי חשבון לילדים בבית — איך לחזק חיבור, חיסור, כפל, חילוק ושברים דרך תרגול משחקי ולא מאיים.",
    canonicalPath: "/guides/math-games-for-kids",
  },
  "guides-reading-comprehension-at-home": {
    title: "איך לתרגל הבנת הנקרא בבית · LEO KIDS",
    description:
      "מדריך להורים: איך לתרגל הבנת הנקרא בבית — שאלות פשוטות, איתור מידע, הסקת מסקנות וניסוח תשובה קצרה.",
    canonicalPath: "/guides/reading-comprehension-at-home",
  },
  "guides-english-vocabulary-practice": {
    title: "איך לתרגל אוצר מילים באנגלית · LEO KIDS",
    description:
      "מדריך להורים: איך לתרגל אוצר מילים באנגלית בבית — חזרות קצרות, מילים בהקשר, משפטים פשוטים ותרגול דיגיטלי ב־Leo Kids.",
    canonicalPath: "/guides/english-vocabulary-practice",
  },
  "guides-how-to-follow-child-progress": {
    title: "איך לזהות אילו נושאים כדאי לחזק · LEO KIDS",
    description:
      "מדריך להורים: איך לזהות אילו נושאים כדאי לחזק בבית — לפי פעילות, חזרות, דוחות ושיחה רגועה עם הילד, בלי לחץ ובלי הצפה.",
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
