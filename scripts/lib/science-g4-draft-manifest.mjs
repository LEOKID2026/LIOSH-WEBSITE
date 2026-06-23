/**
 * Grade 4 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 * Note: plants excluded (spine maxGrade 3).
 */

/** @type {{ id: string, titleHe: string; pages: string[] }[]} */
export const SCIENCE_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "עולם החיים",
    pages: ["body", "animals"],
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

export const SCIENCE_G4_PAGE_ORDER = SCIENCE_G4_BOOK_BATCHES.flatMap((b) => b.pages);

export const SCIENCE_G4_ALIGNMENT_ANCHORS = {
  body: ["מזון", "בליעה"],
  animals: ["טורף", "טרף"],
  materials: ["מוליך", "מבודד"],
  earth_space: ["סלע", "קרקע"],
  environment: ["משאב", "טבע"],
  experiments: ["מסקנה", "ספוג"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G4_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — נשימה ועיכול",
    scope: "חילופי גזים בנשימה; מסלול עיכול — פשוט",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — יחסי גומלין",
    scope: "טורף/טרף; תחרות; קבוצות (יונקים, ציפורים)",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "concept_foundation",
    titleHe: "חומרים — שינויים וחשמל (מושגי)",
    scope: "שינוי פיזיקלי/כימי; מוליך/מבודד — ללא חיווט",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ — סלעים, קרקע ועונות",
    scope: "סוגי סלע/קרקע; עונות — הטיה מושגית",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "סביבה — שמירת משאבים",
    scope: "משאבי טבע; השפעת אדם; שימור",
  },
  experiments: {
    skillId: "science:topic:experiments",
    pageType: "step_by_step_procedure",
    titleHe: "תכנון ניסוי",
    scope: "שאלה → חיזוי → שיטה → תוצאות → מסקנה",
  },
};
