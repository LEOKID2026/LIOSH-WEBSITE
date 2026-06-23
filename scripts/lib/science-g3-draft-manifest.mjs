/**
 * Grade 3 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const SCIENCE_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "עולם החיים",
    pages: ["body", "animals", "plants"],
  },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  {
    id: "c",
    titleHe: "חקירה מדעית",
    pages: ["experiments"],
  },
];

export const SCIENCE_G3_PAGE_ORDER = SCIENCE_G3_BOOK_BATCHES.flatMap((b) => b.pages);

export const SCIENCE_G3_ALIGNMENT_ANCHORS = {
  body: ["שלד", "שרירים"],
  animals: ["התאמה", "סביבה"],
  plants: ["אור", "מזון"],
  materials: ["דחיפה"],
  earth_space: ["מחזור", "מים"],
  environment: ["שרשרת", "מזון"],
  experiments: ["השערה", "משתנה"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G3_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — מערכות בסיסיות",
    scope: "שלד, שרירים; עיכול כמזון→אנרגיה — פשוט",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — התאמה לסביבה",
    scope: "הסוואה, פרווה, סנפירים; בית גידול ↔ צרכים",
  },
  plants: {
    skillId: "science:topic:plants",
    pageType: "concept_foundation",
    titleHe: "צמחים — תנאי גידול (סיכום)",
    scope: "דף סיכום אחרון לצמחים; בניית מזון באור — ללא נוסחה כימית",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "concept_foundation",
    titleHe: "חומרים — כוחות ותנועה",
    scope: "דחיפה/משיכה; חיכוך; מגנט — ללא חשמל",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ — מזג אוויר ומים",
    scope: "מזג אוויר מול אקלים (פשוט); מחזור המים",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "סביבה — מערכות קטנות",
    scope: "שרשרת מזון מקומית; צמח → herbivore → טורף",
  },
  experiments: {
    skillId: "science:topic:experiments",
    pageType: "step_by_step_procedure",
    titleHe: "ניסוי מדעי קצר",
    scope: "השערה; טבלה; משתנה אחד — ללא ניסויים מסוכנים",
  },
};
