/**
 * Grade 2 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const SCIENCE_G2_BOOK_BATCHES = [
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
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G2_PAGE_ORDER = SCIENCE_G2_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const SCIENCE_G2_ALIGNMENT_ANCHORS = {
  body: ["ידיים"],
  animals: ["צפרדע"],
  plants: ["צמח", "עלים"],
  materials: ["מיץ", "בקבוק"],
  earth_space: ["לילה", "אור"],
  environment: ["ציפורים", "קן"],
  experiments: ["משתנה", "צמח"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G2_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — בריאות והרגלים",
    scope: "היגיינה; אוכל ופעילות; שינה — ללא מערכות גוף",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — מחזור חיים",
    scope: "ביצה → בוגר; צאצא דומה להורים",
  },
  plants: {
    skillId: "science:topic:plants",
    pageType: "concept_foundation",
    titleHe: "צמחים — גדילה ומחזור",
    scope: "זרע → צמח; בלי מים — לא גדל",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "concept_foundation",
    titleHe: "חומרים — מצבי צבירה",
    scope: "מוצק/נוזל/גז ביומי; קרח נמס",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ — עונות ושמיים",
    scope: "עונות; שמש כמקור אור וחום",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "סביבה — שמירה על הטבע",
    scope: "פחות פסולת; הגנה על צמחים ובעלי חיים",
  },
  experiments: {
    skillId: "science:topic:experiments",
    pageType: "step_by_step_procedure",
    titleHe: "תצפית וחקירה",
    scope: "תצפית; השוואה; משתנה אחד — בטוח בלבד",
  },
};
