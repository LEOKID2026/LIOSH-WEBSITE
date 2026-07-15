/**
 * Hebrew SEO content for public worksheets landing page at /practice/worksheets.
 * @typedef {{ q: string, a: string }} WorksheetsFaqItem
 * @typedef {{ title: string, intro?: string, paragraphs?: string[], bullets?: string[] }} WorksheetsSection
 * @typedef {{ href: string, label: string }} WorksheetsLink
 * @typedef {{ title: string, body: string, primary: { href: string, label: string }, secondary?: { href: string, label: string } }} WorksheetsFooterCta
 * @typedef {{
 *   seoKey: string,
 *   slug: string,
 *   badge?: string,
 *   h1: string,
 *   intro: string,
 *   sections: WorksheetsSection[],
 *   relatedPracticeLinks?: WorksheetsLink[],
 *   relatedGuideSlugs: string[],
 *   faq: WorksheetsFaqItem[],
 *   footerCta?: WorksheetsFooterCta,
 * }} WorksheetsPageContent
 */

/** @type {Record<string, string>} */
const WORKSHEETS_LINK_LABELS = {
  "/practice": "כל תחומי התרגול",
  "/practice/math": "תרגול מתמטיקה",
  "/practice/hebrew": "תרגול עברית",
  "/practice/english": "תרגול אנגלית",
  "/practice/geometry": "תרגול גאומטריה",
  "/practice/no-print": "תרגול דיגיטלי",
  "/practice/games": "משחקי למידה",
};

/** @param {string[]} hrefs @returns {WorksheetsLink[]} */
function worksheetsLinks(hrefs) {
  return hrefs.map((href) => ({
    href,
    label: WORKSHEETS_LINK_LABELS[href] ?? href,
  }));
}

/** @type {WorksheetsPageContent} */
export const WORKSHEETS_PAGE_CONTENT = {
  seoKey: "practice-worksheets",
  slug: "worksheets",
  badge: "דפי עבודה - ניסיון בלי הרשמה",
  h1: "דפי עבודה לילדים - לתרגל, להדפיס כשמתאים או לשלב עם תרגול אונליין",
  intro:
    "בעמוד הזה אפשר ליצור דף התנסות עם 8 תרגילים או לבחור מתוך 35 דפי עבודה מוכנים במתמטיקה, גאומטריה, עברית ואנגלית. אפשר לצפות בדף, להדפיס אותו ולפתוח דף תשובות.",
  sections: [
    {
      title: "איך יוצרים דף התנסות?",
      paragraphs: [
        "בחרו מקצוע וכיתה וצרו דף התנסות קצר עם 8 תרגילים. בכל מקצוע פתוח נושא אחד להתנסות, ושאר הנושאים מוצגים כדי שתוכלו לראות את האפשרויות הזמינות במערכת המלאה.",
      ],
    },
    {
      title: "דפי עבודה מוכנים לפי כיתה",
      paragraphs: [
        "בחרו מתוך 35 דפים מוכנים, סננו לפי מקצוע, כיתה ורמה, פתחו את הדף והדפיסו כאשר זה מתאים לכם. לכל דף אפשר לפתוח גם דף תשובות נפרד.",
      ],
    },
    {
      title: "אפשר לתרגל גם בלי להדפיס",
      paragraphs: [
        "דפי העבודה הם אפשרות נוספת לצד התרגולים והמשחקים הדיגיטליים. אפשר לבחור בכל פעם את הדרך שמתאימה לנושא, לילד ולזמן שעומד לרשותכם.",
      ],
    },
    {
      title: "מה מקבלים במערכת המלאה להורים?",
      paragraphs: [
        "במערכת המלאה להורים אפשר ליצור דפי עבודה ללא הגבלה, לבחור מתוך כל הנושאים הזמינים וליצור דפים חדשים שוב ושוב. הדפים נוצרים מחדש ומשתנים בין יצירה ליצירה, ולכן הם אינם דף קבוע וזהה.",
      ],
    },
    {
      title: "דף תשובות לבדיקה בבית",
      paragraphs: [
        "אפשר לפתוח דף תשובות נפרד לאחר יצירת הדף. דף ההתנסות כולל תשובות ל-8 התרגילים, והדפים המוכנים כוללים תשובות בהתאם למבנה המקורי של כל דף.",
      ],
    },
  ],
  relatedPracticeLinks: worksheetsLinks([
    "/practice/math",
    "/practice/hebrew",
    "/practice/english",
    "/practice/geometry",
    "/practice/no-print",
    "/practice/games",
  ]),
  relatedGuideSlugs: [
    "math-practice-at-home",
    "home-practice-routine",
    "no-print-worksheets",
    "learning-games-at-home",
  ],
  faq: [
    {
      q: "האם צריך להירשם כדי לנסות?",
      a: "לא. מחולל ההתנסות והדפים המוכנים זמינים בלי התחברות.",
    },
    {
      q: "כמה תרגילים יש בדף ההתנסות?",
      a: "דף ההתנסות כולל 8 תרגילים. הדפים המוכנים נשארים במבנה המלא שלהם.",
    },
    {
      q: "האם קיימים דפי תשובות?",
      a: "כן. אפשר לפתוח דף תשובות נפרד לדף ההתנסות ולכל דף מוכן.",
    },
    {
      q: "האם חייבים להדפיס?",
      a: "לא. אפשר לתרגל אונליין ב-LEO Kids ולהשתמש בדף עבודה כאשר זה מתאים.",
    },
    {
      q: "האם הדפים משתנים?",
      a: "דפים שנוצרים במחולל נבנים מחדש מתוך מאגר השאלות ויכולים להשתנות בין יצירה ליצירה.",
    },
  ],
  footerCta: {
    title: "רוצים ליצור עוד דפים ולפתוח את כל הנושאים?",
    body: "במערכת המלאה להורים אפשר ליצור דפי עבודה ללא הגבלה, לבחור נושאים נוספים ולשלב את הדפים עם התרגול הדיגיטלי ועם המידע על התקדמות הילד.",
    primary: { href: "/parents", label: "למערכת המלאה להורים" },
    secondary: { href: "/practice", label: "לתחומי התרגול" },
  },
};

/**
 * @returns {WorksheetsPageContent}
 */
export function getWorksheetsPageContent() {
  return WORKSHEETS_PAGE_CONTENT;
}
