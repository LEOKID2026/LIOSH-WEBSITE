/**
 * Hebrew display-name resolution for the Insight Packet.
 *
 * The label dictionaries are inlined here on purpose so the insights module is fully self-contained
 * and can run under plain Node ESM (no Next.js bundler). They mirror the public dictionaries in
 * `utils/math-report-generator.js`. If a key is added to that file, mirror it here too - the
 * `parent-report-insights-selftest.mjs` golden fixtures will surface drift quickly.
 */

const SUBJECT_LABEL_HE = Object.freeze({
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet_geography: "מולדת וגאוגרפיה",
});

const MATH_OPERATION_NAMES_HE = Object.freeze({
  addition: "חיבור",
  subtraction: "חיסור",
  multiplication: "כפל",
  division: "חילוק",
  division_with_remainder: "חילוק עם שארית",
  fractions: "שברים",
  percentages: "אחוזים",
  sequences: "סדרות",
  decimals: "עשרוניים",
  rounding: "עיגול",
  divisibility: "סימני התחלקות",
  prime_composite: "מספרים ראשוניים ופריקים",
  powers: "חזקות",
  ratio: "יחס",
  equations: "משוואות",
  order_of_operations: "סדר פעולות",
  zero_one_properties: "תכונות ה-0 וה-1",
  estimation: "אומדן",
  scale: "קנה מידה",
  compare: "השוואה",
  number_sense: "חוש מספרים",
  factors_multiples: "גורמים וכפולות",
  word_problems: "בעיות מילוליות",
  multiplication_table: "לוח הכפל",
  mixed: "ערבוב",
});

const GEOMETRY_TOPIC_NAMES_HE = Object.freeze({
  shapes_basic: "צורות בסיסיות",
  shapes: "צורות",
  area: "שטח",
  perimeter: "היקף",
  volume: "נפח",
  angles: "זוויות",
  parallel_perpendicular: "מקבילות ומאונכות",
  triangles: "משולשים",
  quadrilaterals: "מרובעים",
  transformations: "טרנספורמציות",
  rotation: "סיבוב",
  symmetry: "סימטרייה",
  diagonal: "אלכסון",
  heights: "גבהים",
  tiling: "ריצוף",
  circles: "מעגל ועיגול",
  solids: "גופים",
  pythagoras: "פיתגורס",
  mixed: "ערבוב",
});

const ENGLISH_TOPIC_NAMES_HE = Object.freeze({
  vocabulary: "אוצר מילים",
  grammar: "דקדוק",
  grammar_basics: "יסודות דקדוק",
  translation: "תרגום",
  sentence: "בניית משפטים",
  sentences: "בניית משפטים",
  writing: "כתיבה",
  reading_comprehension: "הבנת הנקרא",
  matching: "התאמה",
  inference: "הסקה",
  mixed: "תרגול משולב",
});

const SCIENCE_TOPIC_NAMES_HE = Object.freeze({
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  earth_space: "כדור הארץ והחלל",
  environment: "סביבה ואקולוגיה",
  experiments: "ניסויים ותהליכים",
  mixed: "ערבוב נושאים",
});

const HEBREW_TOPIC_NAMES_HE = Object.freeze({
  reading: "קריאה",
  comprehension: "הבנת הנקרא",
  reading_comprehension: "הבנת הנקרא",
  writing: "כתיבה והבעה",
  grammar: "דקדוק ולשון",
  vocabulary: "עושר שפתי",
  speaking: "דיבור ושיח",
  mixed: "ערבוב",
  main_idea: "רעיון מרכזי",
  sequence: "רצף",
  inference: "הסקה",
});

const MOLEDET_GEOGRAPHY_TOPIC_NAMES_HE = Object.freeze({
  homeland: "מולדת",
  community: "קהילה",
  citizenship: "אזרחות",
  geography: "גאוגרפיה",
  basic_geography: "יסודות גאוגרפיה",
  values: "ערכים",
  maps: "מפות",
  map_reading: "קריאת מפה",
  directions: "הוראות",
  places: "מקומות",
  mixed: "ערבוב",
});

const RAW_KEY_RE = /^[a-z][a-z0-9_]*$/i;

function stripMathKindSuffix(key) {
  if (typeof key !== "string") return "";
  const i = key.indexOf("::");
  return i === -1 ? key : key.slice(0, i);
}

export function getSubjectDisplayNameHe(subjectKey) {
  if (!subjectKey) return "מקצוע";
  const k = String(subjectKey).trim().toLowerCase();
  return SUBJECT_LABEL_HE[k] || "מקצוע";
}

export function getTopicDisplayNameHe(subjectKey, topicKey) {
  const tk = String(topicKey || "").trim();
  if (!tk || tk === "general") return "";
  const sk = String(subjectKey || "").trim().toLowerCase();
  switch (sk) {
    case "math": {
      const base = stripMathKindSuffix(tk);
      if (base.startsWith("wp_")) return MATH_OPERATION_NAMES_HE.word_problems;
      return MATH_OPERATION_NAMES_HE[base] || "";
    }
    case "geometry":
      return GEOMETRY_TOPIC_NAMES_HE[tk] || "";
    case "english":
      return ENGLISH_TOPIC_NAMES_HE[tk] || "";
    case "science":
      return SCIENCE_TOPIC_NAMES_HE[tk] || "";
    case "hebrew":
      return HEBREW_TOPIC_NAMES_HE[tk] || "";
    case "moledet_geography":
      return MOLEDET_GEOGRAPHY_TOPIC_NAMES_HE[tk] || "";
    default:
      return "";
  }
}

export function isLikelyRawKey(label) {
  if (typeof label !== "string") return false;
  const t = label.trim();
  if (!t) return false;
  return RAW_KEY_RE.test(t);
}

export function safeHebrewLabel(label, fallback) {
  if (typeof label === "string") {
    const t = label.trim();
    if (t && !isLikelyRawKey(t)) return t;
  }
  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : "נושא";
}

export const SUBJECT_LABELS_HE_FOR_TESTS = SUBJECT_LABEL_HE;
