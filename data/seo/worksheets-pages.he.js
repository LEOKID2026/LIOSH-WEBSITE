/**
 * Hebrew SEO content for public worksheets landing page at /practice/worksheets.
 * @typedef {{ q: string, a: string }} WorksheetsFaqItem
 * @typedef {{ title: string, text: string }} WorksheetsStatItem
 * @typedef {{ number: string, title: string, text: string }} WorksheetsStepItem
 * @typedef {{ title: string, text: string }} WorksheetsSubjectItem
 * @typedef {{ title: string, text: string }} WorksheetsFeatureCard
 * @typedef {{ href: string, label: string }} WorksheetsLink
 * @typedef {{ title: string, body: string, primary: { href: string, label: string }, secondary?: { href: string, label: string } }} WorksheetsFooterCta
 * @typedef {{
 *   seoKey: string,
 *   slug: string,
 *   badge?: string,
 *   h1: string,
 *   intro: string,
 *   heroNote: string,
 *   stats: WorksheetsStatItem[],
 *   generator: { h2: string, paragraph: string },
 *   ready: { h2: string, paragraph: string },
 *   usage: { h2: string, steps: WorksheetsStepItem[] },
 *   subjects: { h2: string, intro: string, items: WorksheetsSubjectItem[] },
 *   video: { h2: string, paragraph1: string, paragraph2: string, cards: WorksheetsFeatureCard[] },
 *   parentSystem: {
 *     h2: string,
 *     intro: string,
 *     cards: WorksheetsFeatureCard[],
 *     ctaText: string,
 *     conversionNote: string,
 *   },
 *   relatedPracticeLinks?: WorksheetsLink[],
 *   relatedGuideSlugs: string[],
 *   faq: WorksheetsFaqItem[],
 *   footerCta: WorksheetsFooterCta,
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
  badge: "דפי עבודה לילדים - ניסיון בלי הרשמה",
  h1: "דפי עבודה לילדים לפי כיתה ומקצוע",
  intro:
    "צרו דף עבודה חדש עם 8 תרגילים, או בחרו מתוך 35 דפים מוכנים במתמטיקה, גאומטריה, עברית ואנגלית. לכל דף אפשר לפתוח תשובות, לצפות בו לפני ההדפסה ולשלב אותו עם התרגול הדיגיטלי של LEO Kids.",
  heroNote: "אפשר להתחיל בלי הרשמה. במערכת המלאה להורים פתוחים כל הנושאים והאפשרויות.",
  stats: [
    { title: "8 תרגילים", text: "בדף ההתנסות שנוצר בלי הרשמה" },
    { title: "35 דפים מוכנים", text: "לבחירה לפי מקצוע, כיתה ורמה" },
    { title: "4 מקצועות", text: "מתמטיקה, גאומטריה, עברית ואנגלית" },
    { title: "דפי תשובות", text: "לבדיקה נוחה לאחר התרגול" },
  ],
  generator: {
    h2: "נסו את מחולל דפי העבודה",
    paragraph:
      "בחרו מקצוע, כיתה ונושא וצרו דף התנסות קצר עם 8 תרגילים. אפשר לצפות בדף, לפתוח דף תשובות ולהדפיס כאשר זה מתאים לכם.",
  },
  ready: {
    h2: "דפי עבודה מוכנים לפי כיתה ומקצוע",
    paragraph:
      "בחרו מתוך 35 דפי עבודה מוכנים, סננו לפי מקצוע, כיתה ורמה ופתחו את הדף שמתאים לתרגול. כל דף נשאר במבנה המלא שלו וכולל אפשרות לפתיחת תשובות.",
  },
  usage: {
    h2: "כך מתחילים לתרגל",
    steps: [
      {
        number: "1",
        title: "בוחרים מקצוע וכיתה",
        text: "בחרו את התחום שהילד רוצה לתרגל ואת הכיתה המתאימה.",
      },
      {
        number: "2",
        title: "יוצרים או פותחים דף",
        text: "צרו דף התנסות חדש או בחרו דף מוכן מתוך הקטלוג.",
      },
      {
        number: "3",
        title: "מתרגלים ובודקים",
        text: "הדפיסו את הדף כאשר זה מתאים ופתחו את דף התשובות לבדיקה.",
      },
    ],
  },
  subjects: {
    h2: "דפי עבודה בארבעה מקצועות",
    intro: "אפשר לבחור את המקצוע שמתאים לתרגול הנוכחי ולעבור בין דפים שונים לפי הכיתה והנושא.",
    items: [
      {
        title: "מתמטיקה",
        text: "חיבור, חיסור, כפל, חילוק, שברים, מספרים עשרוניים, אחוזים ובעיות מילוליות.",
      },
      {
        title: "גאומטריה",
        text: "צורות, זוויות, שטח, היקף, גופים, סימטריה, זיהוי, שרטוט וחישוב.",
      },
      {
        title: "עברית",
        text: "קריאה, הבנת הנקרא, אוצר מילים, שפה ותרגילים לפי הכיתה והמיומנות.",
      },
      {
        title: "אנגלית",
        text: "אותיות, צלילים, אוצר מילים, משפטים, קריאה ותרגילים לפי הכיתה והנושא.",
      },
    ],
  },
  video: {
    h2: "דפי העבודה הם חלק ממערכת למידה מלאה",
    paragraph1:
      "LEO Kids מחבר בין דפי עבודה, תרגול דיגיטלי, משחקי למידה ודוחות להורים. אפשר להתחיל מדף אחד ולהמשיך למערכת שמרכזת את הלמידה במקום אחד.",
    paragraph2:
      "צפו בסרטון קצר והכירו את סביבת ההורים, התרגול לילדים והאפשרויות שאפשר לשלב לצד דפי העבודה.",
    cards: [
      { title: "תרגול דיגיטלי", text: "שאלות ופעילויות לפי המקצוע, הכיתה והנושא." },
      { title: "משחקי למידה", text: "משימות ואתגרים שמשלבים תרגול בתוך פעילות משחקית." },
      { title: "דוחות להורים", text: "מידע על הפעילות, הנושאים, התשובות וההתקדמות לאורך זמן." },
    ],
  },
  parentSystem: {
    h2: "רוצים לפתוח את כל האפשרויות?",
    intro:
      "במערכת המלאה להורים אפשר ליצור דפי עבודה ללא הגבלה, לבחור מתוך כל הנושאים הזמינים, לקבל המלצות לפי הילד ולשלב את הדפים עם התרגול והדוחות.",
    cards: [
      {
        title: "יצירת דפים ללא הגבלה",
        text: "צרו דפי עבודה חדשים שוב ושוב לפי המקצוע, הכיתה והנושא.",
      },
      {
        title: "כל הנושאים הזמינים",
        text: "בחרו מתוך מגוון רחב יותר של נושאים ופורמטים בכל מקצוע.",
      },
      {
        title: "המלצות לילד שלי",
        text: "קבלו הצעות לדפי עבודה לפי הפעילות והנושאים שכדאי לבדוק.",
      },
      {
        title: "דוחות והתקדמות",
        text: "ראו אילו מקצועות ונושאים תורגלו ואיפה מופיע קושי שחוזר.",
      },
    ],
    ctaText: "היכנסו למערכת ההורים, בחרו ילד וצרו דפי עבודה לפי הנושא שמתאים לו.",
    conversionNote: "מחולל ההתנסות והדפים המוכנים נשארים זמינים גם בלי הרשמה.",
  },
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
      a: "לא. אפשר ליצור דף התנסות עם 8 תרגילים ולפתוח את הדפים המוכנים בלי להתחבר.",
    },
    {
      q: "כמה דפי עבודה מוכנים קיימים?",
      a: "בעמוד מוצגים 35 דפי עבודה מוכנים במתמטיקה, גאומטריה, עברית ואנגלית.",
    },
    {
      q: "האם קיימים דפי תשובות?",
      a: "כן. אפשר לפתוח דף תשובות נפרד לדף ההתנסות ולכל דף מוכן.",
    },
    {
      q: "האם חייבים להדפיס?",
      a: "לא. אפשר לצפות בדף לפני ההדפסה, או לעבור לתרגול הדיגיטלי ולמשחקי הלמידה באתר.",
    },
    {
      q: "האם הדפים שנוצרים במחולל משתנים?",
      a: "כן. דפים שנוצרים במחולל נבנים מחדש מתוך מאגר השאלות ויכולים להשתנות בין יצירה ליצירה.",
    },
    {
      q: "מה ההבדל בין ההתנסות למערכת המלאה?",
      a: "בהתנסות אפשר ליצור דף קצר בנושא פתוח ולבחור מתוך הדפים המוכנים. במערכת המלאה להורים אפשר לפתוח נושאים נוספים וליצור דפים שוב ושוב.",
    },
  ],
  footerCta: {
    title: "מתחילים מדף אחד וממשיכים בדרך שמתאימה לילד",
    body: "צרו דף התנסות, בחרו דף מוכן או עברו למערכת ההורים כדי לפתוח את כל הנושאים ולשלב בין דפי עבודה, תרגול דיגיטלי ומשחקי למידה.",
    primary: { href: "#worksheet-generator", label: "יצירת דף התנסות" },
    secondary: { href: "/parent/login", label: "כניסה / הרשמה להורים" },
  },
};

/**
 * @returns {WorksheetsPageContent}
 */
export function getWorksheetsPageContent() {
  return WORKSHEETS_PAGE_CONTENT;
}
