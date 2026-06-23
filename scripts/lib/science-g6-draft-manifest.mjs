/**
 * Grade 6 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry. Plants excluded (spine maxGrade 3).
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const SCIENCE_G6_BOOK_BATCHES = [
  { id: "a", titleHe: "עולם החיים", pages: ["body", "animals"] },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G6_PAGE_ORDER = SCIENCE_G6_BOOK_BATCHES.flatMap((b) => b.pages);

export const SCIENCE_G6_ALIGNMENT_ANCHORS = {
  body: ["מערכות", "מזון"],
  animals: ["מגוון", "רשת"],
  materials: ["בטיחות", "שינוי"],
  earth_space: ["אקלים", "שמש"],
  environment: ["בחירות", "מיחזור"],
  experiments: ["פרויקט", "גרף"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G6_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — תיאום בין מערכות",
    scope: "מערכות עובדות יחד; תזונה/שינה/פעילות",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — מערכות אקולוגיות",
    scope: "רשתות מזון; מגוון ביולוגי; תפקיד האדם",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "concept_foundation",
    titleHe: "חומרים — כימיה בסיסית",
    scope: "בטיחות; שינוי הפיך/לא הפיך; צפיפות — מושגי",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ — אקלים וחלל",
    scope: "שינויי אקלים — עובדתי, לא מפחיד; מערכת שמש",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "סביבה — שינויי אקלים ופעולה",
    scope: "טביעת רגל; בחירות בר-קיימא; ללא framing מפחיד",
  },
  experiments: {
    skillId: "science:topic:experiments",
    pageType: "step_by_step_procedure",
    titleHe: "פרויקט מדעי",
    scope: "שאלת מחקר; השוואה; משתנים; גרף; הצגה — בטוח",
  },
};
