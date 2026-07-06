/**
 * Hebrew SEO metadata for public marketing and legal pages.
 * @typedef {{ title: string; description: string; canonicalPath: string; noindex?: boolean }} PublicPageSeoEntry
 */

/** @type {Record<string, PublicPageSeoEntry>} */
export const PUBLIC_PAGE_SEO = {
  home: {
    title: "LEO KIDS · לימוד ומשחקים לילדים",
    description:
      "אתר לימודים לילדים עם תרגול במתמטיקה, עברית, אנגלית ועוד — משחקים, דוחות להורים וחוויה נעימה.",
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
      "תנאים, פרטיות, נגישות, אבטחה, גילוי AI ומחיקת נתונים — כל המסמכים המשפטיים של Leo Kids.",
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
    title: "גילוי שימוש ב-AI · LEO KIDS",
    description: "גילוי שימוש בבינה מלאכותית ב-Leo Kids — היכן משתמשים ב-AI ומה המגבלות.",
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
    description: "אודות Leo Kids — למידה בקצב אישי, דוחות להורים וחוויית תרגול ומשחק לילדים.",
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
    title: "גלריה · LEO KIDS",
    description: "תמונות וסרטונים מעולם Leo Kids — רגעים מהמשחקים והלמידה.",
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
};

/**
 * @param {keyof typeof PUBLIC_PAGE_SEO} key
 * @returns {PublicPageSeoEntry}
 */
export function getPublicPageSeo(key) {
  return PUBLIC_PAGE_SEO[key];
}
