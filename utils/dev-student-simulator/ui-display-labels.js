/**
 * Hebrew display strings for the Dev Student Simulator Custom Builder UI only.
 * Internal subject ids and topic keys stay unchanged everywhere else.
 */

import { SUBJECT_BUCKETS } from "./constants";

/** Row order in the custom panel (UI only). */
export const CUSTOM_BUILDER_UI_SUBJECT_ORDER = Object.freeze([
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
]);

export const SUBJECT_DISPLAY_HE = Object.freeze({
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  "moledet-geography": "מולדת / גאוגרפיה",
});

/**
 * Flat map: internal topic key -> Hebrew label for checkboxes.
 * Includes all keys from SUBJECT_BUCKETS plus extras for forward-compatible buckets.
 */
export const TOPIC_DISPLAY_HE = Object.freeze({
  // Math
  addition: "חיבור",
  subtraction: "חיסור",
  multiplication: "כפל",
  division: "חילוק",
  division_with_remainder: "חילוק עם שארית",
  fractions: "שברים",
  percentages: "אחוזים",
  sequences: "סדרות",
  decimals: "מספרים עשרוניים",
  rounding: "עיגול מספרים",
  divisibility: "התחלקות",
  prime_composite: "ראשוני / פריק",
  powers: "חזקות",
  ratio: "יחס",
  equations: "משוואות",
  order_of_operations: "סדר פעולות חשבון",
  zero_one_properties: "תכונות 0 ו 1",
  estimation: "אומדן",
  scale: "קנה מידה",
  compare: "השוואת מספרים",
  number_sense: "חוש מספרי",
  factors_multiples: "גורמים וכפולות",
  word_problems: "בעיות מילוליות",
  // Geometry
  shapes_basic: "צורות בסיסיות",
  area: "שטח",
  perimeter: "היקף",
  volume: "נפח",
  angles: "זוויות",
  parallel_perpendicular: "מקבילים ומאונכים",
  triangles: "משולשים",
  quadrilaterals: "מרובעים",
  transformations: "הזזות ושיקופים",
  rotation: "סיבוב",
  symmetry: "סימטריה",
  diagonal: "אלכסונים",
  heights: "גבהים",
  tiling: "ריצוף",
  circles: "מעגלים",
  solids: "גופים",
  pythagoras: "משפט פיתגורס",
  units: "יחידות מידה",
  // Hebrew (subject)
  reading: "קריאה",
  comprehension: "הבנת הנקרא",
  writing: "כתיבה",
  grammar: "דקדוק",
  vocabulary: "אוצר מילים",
  speaking: "הבעה בעל פה",
  // English (subject) — overlaps keys with Hebrew where meaning matches UI
  translation: "תרגום",
  sentences: "בניית משפטים",
  // Science
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  earth_space: "כדור הארץ והחלל",
  environment: "סביבה",
  experiments: "ניסויים",
  // Moledet / geography
  homeland: "מולדת",
  community: "קהילה",
  citizenship: "אזרחות",
  geography: "גאוגרפיה",
  values: "ערכים",
  maps: "מפות",
  // Shared
  mixed: "מעורב",
});

const UNMAPPED_TOPIC_HE = "נושא (מפתח לא מתויג)";

/**
 * @param {string} subjectId
 * @returns {string}
 */
export function hebrewSubjectLabel(subjectId) {
  return SUBJECT_DISPLAY_HE[subjectId] || subjectId;
}

/**
 * Primary Hebrew line for a topic checkbox. Never returns the raw key as the only label.
 * @param {string} topicKey
 * @returns {string}
 */
export function hebrewTopicPrimary(topicKey) {
  if (topicKey == null || topicKey === "") return UNMAPPED_TOPIC_HE;
  return TOPIC_DISPLAY_HE[topicKey] || UNMAPPED_TOPIC_HE;
}

/**
 * Ensures every current bucket topic has a non-fallback entry (dev-time guard).
 * @returns {string[]} missing internal keys
 */
export function listTopicKeysMissingHebrewLabel() {
  const missing = [];
  for (const sid of Object.keys(SUBJECT_BUCKETS)) {
    const list = SUBJECT_BUCKETS[sid] || [];
    for (const k of list) {
      if (!TOPIC_DISPLAY_HE[k]) missing.push(k);
    }
  }
  return missing;
}
