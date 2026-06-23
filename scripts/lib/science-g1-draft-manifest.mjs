/**
 * Grade 1 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G1SciBatch */

/** @type {G1SciBatch[]} */
export const SCIENCE_G1_BOOK_BATCHES = [
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
];

export const SCIENCE_G1_PAGE_ORDER = SCIENCE_G1_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors */
export const SCIENCE_G1_ALIGNMENT_ANCHORS = {
  body: ["חוש", "ריח"],
  animals: ["חי", "אוגר"],
  plants: ["עציץ", "מים"],
  materials: ["כרית", "קשה"],
  earth_space: ["יום", "גשם"],
  environment: ["פח", "בקבוק"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G1_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — חושים ותנועה",
    scope: "חמשת החושים; תנועה; הלב בחזה — ללא מערכות גוף",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — חי לעומת דומם",
    scope: "חי/דומם; מזון, מים, אוויר",
  },
  plants: {
    skillId: "science:topic:plants",
    pageType: "concept_foundation",
    titleHe: "צמחים — מה צמחים צריכים",
    scope: "שורש, גבעול, עלה; שמש, מים, אדמה",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "visual_intuition",
    titleHe: "חומרים — תכונות יומיומיות",
    scope: "קשה/רך; חלק/מחוספס; חם/קר במגע",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ ומזג אוויר",
    scope: "יום/לילה; שמש, גשם, רוח, חם/קר",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "הסביבה שלנו",
    scope: "פסולת בפח; שמירה על ניקיון הטבע",
  },
};
