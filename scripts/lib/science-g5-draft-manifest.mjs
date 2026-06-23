/**
 * Grade 5 Science learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry. Plants excluded (spine maxGrade 3).
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const SCIENCE_G5_BOOK_BATCHES = [
  { id: "a", titleHe: "עולם החיים", pages: ["body", "animals"] },
  {
    id: "b",
    titleHe: "חומרים, כדור הארץ וסביבה",
    pages: ["materials", "earth_space", "environment"],
  },
  { id: "c", titleHe: "חקירה מדעית", pages: ["experiments"] },
];

export const SCIENCE_G5_PAGE_ORDER = SCIENCE_G5_BOOK_BATCHES.flatMap((b) => b.pages);

export const SCIENCE_G5_ALIGNMENT_ANCHORS = {
  body: ["שרירים", "ברך"],
  animals: ["תכונות", "פרפר"],
  materials: ["אור", "מראה"],
  earth_space: ["תופעה", "קרום"],
  environment: ["מתחדש", "זיהום"],
  experiments: ["גרף", "יומן"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const SCIENCE_G5_PAGE_META = {
  body: {
    skillId: "science:topic:body",
    pageType: "concept_foundation",
    titleHe: "גוף האדם — שלד, שרירים וחושים",
    scope: "שלד/שרירים; מערכת עצבים כרשת מסרים — פשוט",
  },
  animals: {
    skillId: "science:topic:animals",
    pageType: "concept_foundation",
    titleHe: "בעלי חיים — רבייה והתאמות",
    scope: "רבייה; תכונות מורשות — ללא genetics formulas",
  },
  materials: {
    skillId: "science:topic:materials",
    pageType: "concept_foundation",
    titleHe: "חומרים — תערובות ואור",
    scope: "תערובות/תמיסות; צל, החזר, שקיפות",
  },
  earth_space: {
    skillId: "science:topic:earth_space",
    pageType: "concept_foundation",
    titleHe: "כדור הארץ — משאבים ותופעות",
    scope: "שכבות כדור הארץ; רעידות/הר געש — מודעות",
  },
  environment: {
    skillId: "science:topic:environment",
    pageType: "concept_foundation",
    titleHe: "סביבה — משאבי טבע",
    scope: "מתחדש/לא מתחדש; סוגי זיהום — עובדתי",
  },
  experiments: {
    skillId: "science:topic:experiments",
    pageType: "step_by_step_procedure",
    titleHe: "חקר מלא — תיעוד",
    scope: "יומן חקר; גרף; הערכת תוצאות — בטוח",
  },
};
