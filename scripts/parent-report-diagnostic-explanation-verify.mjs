/**
 * Parent diagnostic explanation layer — all approved subject taxonomy batches verify.
 * Run: npx tsx scripts/parent-report-diagnostic-explanation-verify.mjs
 */

import assert from "node:assert/strict";

const M02_PATTERN = "שגיאה בעמודת עשרות";
const M10_ENGINE_PATTERN = "בחירת כפל לא מתאים לחילוק";
const M02_EXPLANATION_PREFIX = "המערכת זיהתה קושי בחיבור";
const M03_EXPLANATION_PREFIX = "המערכת זיהתה קושי בשליפה";
const M10_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנת הקשר בין חילוק לכפל";
const M05_EXPLANATION_PREFIX = "המערכת זיהתה קושי בחיבור או חיסור שברים";
const M09_EXPLANATION_PREFIX = "המערכת זיהתה קושי בשימוש בעשר הקרובה";
const G01_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבחנה בין תכונות";
const G03_EXPLANATION_PREFIX = "המערכת זיהתה קושי בזיהוי הגובה המתאים";
const G08_EXPLANATION_PREFIX = "המערכת זיהתה קושי בחישוב שטח משולש";
const H01_EXPLANATION_PREFIX = "המערכת זיהתה קושי בבחירת מילה נרדפת";
const H04_EXPLANATION_PREFIX = "המערכת זיהתה קושי באיתור מידע";
const H05_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבחנה בין מילים שנשמעות";
const H08_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהתאמת רמת הלשון";
const E01_EXPLANATION_PREFIX = "המערכת זיהתה קושי בשימוש בצירופי מילים טבעיים באנגלית";
const E05_EXPLANATION_PREFIX = "המערכת זיהתה קושי בשימוש במילות יחס באנגלית";
const E08_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבחנה בין מילים באנגלית שנשמעות";
const S01_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבחנה בין תכונה של דבר";
const S04_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנה שחומר לא נעלם";
const S07_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנת קשרי אכילה";
const S08_EXPLANATION_PREFIX = "המערכת זיהתה קושי בביסוס תשובה על מקור מידע";
const MG01_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנת סולם במפה";
const MG07_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנת התפקיד של מוסדות ציבור";
const MG08_EXPLANATION_PREFIX = "המערכת זיהתה קושי בהבנת סימנים במפה";

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const MATH_TAXONOMY_FIXTURE = {
  "M-01": {
    patternHe: "טעויות בהמרת ייצוג",
    subskillHe: "פירוק 10+1",
    bucketKey: "addition",
    displayName: "חיבור",
    topicRowSuffix: "addition\u0001learning\u0001g2\u0001easy",
  },
  "M-02": {
    patternHe: M02_PATTERN,
    subskillHe: "נשיאה",
    bucketKey: "addition",
    displayName: "חיבור",
    topicRowSuffix: "addition\u0001learning\u0001g3\u0001easy",
  },
  "M-03": {
    patternHe: "אותם זוגות שגויים",
    subskillHe: "עובדת כפל",
    bucketKey: "multiplication",
    displayName: "כפל",
    topicRowSuffix: "multiplication\u0001learning\u0001g3\u0001easy",
  },
  "M-04": {
    patternHe: "השוואה לפי מונה בלבד",
    subskillHe: "חלק־כלל",
    bucketKey: "fractions",
    displayName: "שברים",
    topicRowSuffix: "fractions\u0001learning\u0001g4\u0001easy",
  },
  "M-05": {
    patternHe: "טעות באותה שלב",
    subskillHe: "המראה",
    bucketKey: "fractions",
    displayName: "שברים",
    topicRowSuffix: "fractions\u0001learning\u0001g5\u0001easy",
  },
  "M-06": {
    patternHe: "טעות כיוון עיגול",
    subskillHe: "עיגול/השוואה",
    bucketKey: "decimals",
    displayName: "עשרוניים",
    topicRowSuffix: "decimals\u0001learning\u0001g5\u0001easy",
  },
  "M-07": {
    patternHe: "מספר נכון + יחידה שגויה",
    subskillHe: "יחידות",
    bucketKey: "word_problems",
    displayName: "בעיות מילוליות",
    topicRowSuffix: "word_problems\u0001learning\u0001g4\u0001easy",
  },
  "M-08": {
    patternHe: "כישלון רק באיחוד",
    subskillHe: "רב־שלבי",
    bucketKey: "word_problems",
    displayName: "בעיות מילוליות",
    topicRowSuffix: "word_problems\u0001learning\u0001g5\u0001easy",
  },
  "M-09": {
    patternHe: "כיוון הפוך / הוספה במקום חיסור",
    subskillHe: "השלמה לעשר",
    bucketKey: "subtraction",
    displayName: "חיסור",
    topicRowSuffix: "subtraction\u0001learning\u0001g3\u0001easy",
  },
  "M-10": {
    patternHe: M10_ENGINE_PATTERN,
    subskillHe: "הופכיות",
    bucketKey: "division",
    displayName: "חילוק",
    topicRowSuffix: "division\u0001learning\u0001g4\u0001easy",
  },
};

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const GEOMETRY_TAXONOMY_FIXTURE = {
  "G-01": {
    patternHe: "בלבול תכונות",
    subskillHe: "תכונות מלבן/מקבילית",
    bucketKey: "quadrilaterals",
    displayName: "מרובעים",
    topicRowSuffix: "quadrilaterals\u0001learning\u0001g4\u0001easy",
  },
  "G-02": {
    patternHe: "טעות בטווח זווית",
    subskillHe: "קריאת משקף",
    bucketKey: "angles",
    displayName: "זוויות",
    topicRowSuffix: "angles\u0001learning\u0001g4\u0001easy",
  },
  "G-03": {
    patternHe: "צלעות כגובה",
    subskillHe: "גובה",
    bucketKey: "area",
    displayName: "שטח",
    topicRowSuffix: "area\u0001learning\u0001g4\u0001easy",
  },
  "G-04": {
    patternHe: "סיבוב הפוך",
    subskillHe: "כיוון/זווית",
    bucketKey: "rotation",
    displayName: "סיבוב",
    topicRowSuffix: "rotation\u0001learning\u0001g4\u0001easy",
  },
  "G-05": {
    patternHe: "שוכח עומק",
    subskillHe: "מודל 3D",
    bucketKey: "volume",
    displayName: "נפח",
    topicRowSuffix: "volume\u0001learning\u0001g4\u0001easy",
  },
  "G-06": {
    patternHe: "טעות יחידה חוזרת",
    subskillHe: "המרת יחידות",
    bucketKey: "perimeter",
    displayName: "היקף",
    topicRowSuffix: "perimeter\u0001learning\u0001g4\u0001easy",
  },
  "G-07": {
    patternHe: "ציר שגוי חוזר",
    subskillHe: "ציר",
    bucketKey: "symmetry",
    displayName: "סימטריה",
    topicRowSuffix: "symmetry\u0001learning\u0001g4\u0001easy",
  },
  "G-08": {
    patternHe: "שוכח ÷2 או גובה שגוי",
    subskillHe: "בסיס×גובה÷2",
    bucketKey: "triangles",
    displayName: "משולשים",
    topicRowSuffix: "triangles\u0001learning\u0001g4\u0001easy",
  },
};

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const HEBREW_SUBJECT_TAXONOMY_FIXTURE = {
  "H-01": {
    patternHe: "מילה קרובה לא נכונה",
    subskillHe: "נרדפת",
    bucketKey: "vocabulary",
    displayName: "אוצר מילים",
    topicRowSuffix: "vocabulary\u0001learning\u0001g4\u0001easy",
  },
  "H-02": {
    patternHe: "כינוי/שם עצם שגוי",
    subskillHe: "מגדר/מספר",
    bucketKey: "grammar",
    displayName: "דקדוק",
    topicRowSuffix: "grammar\u0001learning\u0001g4\u0001easy",
  },
  "H-03": {
    patternHe: "אותה משפחה שגויה",
    subskillHe: "משפחת כתיב",
    bucketKey: "writing",
    displayName: "כתיב",
    topicRowSuffix: "writing\u0001learning\u0001g4\u0001easy",
  },
  "H-04": {
    patternHe: "טעות כשעובדה לא בסדר קריאה",
    subskillHe: "חיפוש",
    bucketKey: "reading",
    displayName: "קריאה",
    topicRowSuffix: "reading\u0001learning\u0001g4\u0001easy",
  },
  "H-05": {
    patternHe: "טעות רק בהומופון",
    subskillHe: "הומופון",
    bucketKey: "vocabulary",
    displayName: "אוצר מילים",
    topicRowSuffix: "vocabulary\u0001learning\u0001g5\u0001easy",
  },
  "H-06": {
    patternHe: "סדר מילים שגוי",
    subskillHe: "סדר שאלה",
    bucketKey: "grammar",
    displayName: "דקדוק",
    topicRowSuffix: "grammar\u0001learning\u0001g5\u0001easy",
  },
  "H-07": {
    patternHe: "משפטים לא מחוברים",
    subskillHe: "חיבור משפטים",
    bucketKey: "writing",
    displayName: "כתיבה",
    topicRowSuffix: "writing\u0001learning\u0001g5\u0001easy",
  },
  "H-08": {
    patternHe: "רגיסטר שגוי חוזר",
    subskillHe: "פורמליות",
    bucketKey: "speaking",
    displayName: "דיבור",
    topicRowSuffix: "speaking\u0001learning\u0001g5\u0001easy",
  },
};

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const ENGLISH_SUBJECT_TAXONOMY_FIXTURE = {
  "E-01": {
    patternHe: "תרגום מילולי שגוי",
    subskillHe: "collocation",
    bucketKey: "vocabulary",
    displayName: "אוצר מילים",
    topicRowSuffix: "vocabulary\u0001learning\u0001g4\u0001easy",
  },
  "E-02": {
    patternHe: "past/present",
    subskillHe: "סממן זמן",
    bucketKey: "grammar",
    displayName: "דקדוק",
    topicRowSuffix: "grammar\u0001learning\u0001g4\u0001easy",
  },
  "E-03": {
    patternHe: "טעות בדו־עמודי",
    subskillHe: "מעקב שורות",
    bucketKey: "translation",
    displayName: "תרגום",
    topicRowSuffix: "translation\u0001learning\u0001g4\u0001easy",
  },
  "E-04": {
    patternHe: "he/she/it",
    subskillHe: "כינוי לנושא",
    bucketKey: "grammar",
    displayName: "דקדוק",
    topicRowSuffix: "grammar\u0001learning\u0001g5\u0001easy",
  },
  "E-05": {
    patternHe: "אותה יחס שגויה",
    subskillHe: "preposition",
    bucketKey: "vocabulary",
    displayName: "אוצר מילים",
    topicRowSuffix: "vocabulary\u0001learning\u0001g5\u0001easy",
  },
  "E-06": {
    patternHe: "עובדה במקום הסקה",
    subskillHe: "inference",
    bucketKey: "sentences",
    displayName: "משפטים",
    topicRowSuffix: "sentences\u0001learning\u0001g5\u0001easy",
  },
  "E-07": {
    patternHe: "שגיאות חוזרות",
    subskillHe: "תבניות שקטות",
    bucketKey: "writing",
    displayName: "כתיבה",
    topicRowSuffix: "writing\u0001learning\u0001g5\u0001easy",
  },
  "E-08": {
    patternHe: "בלבול צמד צלילים",
    subskillHe: "minimal pairs",
    bucketKey: "vocabulary",
    displayName: "אוצר מילים",
    topicRowSuffix: "vocabulary\u0001learning\u0001g6\u0001easy",
  },
};

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const SCIENCE_SUBJECT_TAXONOMY_FIXTURE = {
  "S-01": {
    patternHe: "בלבול קטגוריה",
    subskillHe: "תכונה מול תהליך",
    bucketKey: "animals",
    displayName: "בעלי חיים",
    topicRowSuffix: "animals\u0001learning\u0001g4\u0001easy",
  },
  "S-02": {
    patternHe: "לשנות הכול",
    subskillHe: "משתנה מבודד",
    bucketKey: "experiments",
    displayName: "ניסויים",
    topicRowSuffix: "experiments\u0001learning\u0001g4\u0001easy",
  },
  "S-03": {
    patternHe: "סדר/מיקום שגוי",
    subskillHe: "מיקום/זרימה",
    bucketKey: "body",
    displayName: "גוף האדם",
    topicRowSuffix: "body\u0001learning\u0001g4\u0001easy",
  },
  "S-04": {
    patternHe: "נעלם בלי שימור",
    subskillHe: "שימור מסה",
    bucketKey: "materials",
    displayName: "חומרים",
    topicRowSuffix: "materials\u0001learning\u0001g4\u0001easy",
  },
  "S-05": {
    patternHe: "בלבול יחידות",
    subskillHe: "המרת יחידות",
    bucketKey: "experiments",
    displayName: "ניסויים",
    topicRowSuffix: "experiments\u0001learning\u0001g5\u0001easy",
  },
  "S-06": {
    patternHe: "טעות בערך מגרף",
    subskillHe: "קריאת ציר",
    bucketKey: "earth_space",
    displayName: "כדור הארץ והחלל",
    topicRowSuffix: "earth_space\u0001learning\u0001g5\u0001easy",
  },
  "S-07": {
    patternHe: "רמה שגויה חוזרת",
    subskillHe: "רשת מזון",
    bucketKey: "environment",
    displayName: "סביבה",
    topicRowSuffix: "environment\u0001learning\u0001g5\u0001easy",
  },
  "S-08": {
    patternHe: "טענה לא מבוססת",
    subskillHe: "מקור לטענה",
    bucketKey: "mixed",
    displayName: "מדעים",
    topicRowSuffix: "mixed\u0001learning\u0001g5\u0001easy",
  },
};

/** @type {Record<string, { patternHe: string; subskillHe: string; bucketKey: string; displayName: string; topicRowSuffix: string }>} */
const MOLEDET_GEOGRAPHY_TAXONOMY_FIXTURE = {
  "MG-01": {
    patternHe: "מרחקים יחסיים שגויים",
    subskillHe: "סולם",
    bucketKey: "maps",
    displayName: "מפות",
    topicRowSuffix: "maps\u0001learning\u0001g4\u0001easy",
  },
  "MG-02": {
    patternHe: "בלבול כשהמפה מוטה",
    subskillHe: "צפון מוחלט",
    bucketKey: "maps",
    displayName: "מפות",
    topicRowSuffix: "maps\u0001learning\u0001g4\u0001medium",
  },
  "MG-03": {
    patternHe: "מיון שגוי חוזר",
    subskillHe: "זכות/חובה",
    bucketKey: "citizenship",
    displayName: "אזרחות",
    topicRowSuffix: "citizenship\u0001learning\u0001g4\u0001easy",
  },
  "MG-04": {
    patternHe: "סדר הפוך",
    subskillHe: "סדר אירועים",
    bucketKey: "homeland",
    displayName: "מולדת",
    topicRowSuffix: "homeland\u0001learning\u0001g4\u0001easy",
  },
  "MG-05": {
    patternHe: "אזור שגוי חוזר",
    subskillHe: "מפת אקלים",
    bucketKey: "geography",
    displayName: "גאוגרפיה",
    topicRowSuffix: "geography\u0001learning\u0001g5\u0001easy",
  },
  "MG-06": {
    patternHe: "סיבה שגויה חוזרת",
    subskillHe: "סיבה־תוצאה",
    bucketKey: "homeland",
    displayName: "מולדת",
    topicRowSuffix: "homeland\u0001learning\u0001g5\u0001easy",
  },
  "MG-07": {
    patternHe: "בלבול תפקידים",
    subskillHe: "תפקיד מוסד",
    bucketKey: "community",
    displayName: "קהילה",
    topicRowSuffix: "community\u0001learning\u0001g5\u0001easy",
  },
  "MG-08": {
    patternHe: "סימול שגוי חוזר",
    subskillHe: "סימבולים",
    bucketKey: "maps",
    displayName: "מפות",
    topicRowSuffix: "maps\u0001learning\u0001g5\u0001easy",
  },
};

const [
  explainMod,
  detailedMod,
  parentReportV2Mod,
  schoolMod,
] = await Promise.all([
  import("../utils/parent-report-language/parent-diagnostic-explanations-he.js"),
  import("../utils/detailed-parent-report.js"),
  import("../utils/parent-report-v2.js"),
  import("../lib/school-portal/school-report-view-model.js").catch(() => ({ buildSchoolClassReportViewModel: null })),
]);

const {
  buildParentDiagnosticExplanationV1FromV2Unit,
  resolveApprovedParentDiagnosticExplanationV1,
  parentDiagnosticExplanationCatalogForTests,
  mathTaxonomyExplanationIdsForTests,
  geometryTaxonomyExplanationIdsForTests,
  hebrewSubjectTaxonomyExplanationIdsForTests,
  englishSubjectTaxonomyExplanationIdsForTests,
  scienceSubjectTaxonomyExplanationIdsForTests,
  moledetGeographyTaxonomyExplanationIdsForTests,
} = explainMod;
const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests } = parentReportV2Mod;

function buildMathUnit(taxonomyId) {
  const fx = MATH_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `math::${topicRowKey}`,
    subjectId: "math",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

function rowFor(unit) {
  return {
    bucketKey: unit.bucketKey,
    displayName: unit.displayName,
    questions: 12,
    correct: 8,
    wrong: 4,
    accuracy: 67,
    gradeKey: "g4",
    modeKey: "learning",
    levelKey: "easy",
    lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
  };
}

function subjectLabelHeForUnit(unit) {
  if (unit.subjectId === "geometry") return "גאומטריה";
  if (unit.subjectId === "hebrew") return "עברית";
  if (unit.subjectId === "english") return "אנגלית";
  if (unit.subjectId === "science") return "מדעים";
  if (unit.subjectId === "moledet-geography") return "מולדת וגאוגרפיה";
  return "מתמטיקה";
}

function shortSummaryForUnit(unit) {
  const topicRowKey = unit.topicRowKey;
  const topicMap = { [topicRowKey]: rowFor(unit) };
  return summarizeV2UnitsForSubjectForTests([unit], {
    subjectReportQuestions: 12,
    subjectLabelHe: subjectLabelHeForUnit(unit),
    topicMap,
    reportTotalQuestions: 20,
  });
}

function buildGeometryUnit(taxonomyId) {
  const fx = GEOMETRY_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `geometry fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `geometry::${topicRowKey}`,
    subjectId: "geometry",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

function buildHebrewSubjectUnit(taxonomyId) {
  const fx = HEBREW_SUBJECT_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `hebrew fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `hebrew::${topicRowKey}`,
    subjectId: "hebrew",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

function buildEnglishSubjectUnit(taxonomyId) {
  const fx = ENGLISH_SUBJECT_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `english fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `english::${topicRowKey}`,
    subjectId: "english",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

function buildScienceSubjectUnit(taxonomyId) {
  const fx = SCIENCE_SUBJECT_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `science fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `science::${topicRowKey}`,
    subjectId: "science",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

function buildMoledetGeographySubjectUnit(taxonomyId) {
  const fx = MOLEDET_GEOGRAPHY_TAXONOMY_FIXTURE[taxonomyId];
  assert.ok(fx, `moledet-geography fixture for ${taxonomyId}`);
  const topicRowKey = fx.topicRowSuffix;
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `moledet-geography::${topicRowKey}`,
    subjectId: "moledet-geography",
    topicRowKey,
    bucketKey: fx.bucketKey,
    displayName: fx.displayName,
    diagnosis: {
      allowed: true,
      taxonomyId,
      lineHe: `מצביע על דפוס: ${fx.patternHe} (נקודת מיקוד: ${fx.subskillHe}) ב${fx.bucketKey}.`,
    },
    intervention: { taxonomyId },
    taxonomy: { id: taxonomyId, patternHe: fx.patternHe, subskillHe: fx.subskillHe },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: true, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}`,
      stateHash: "h1",
    },
  };
}

// --- Catalog: all approved subject batches (50 taxonomy entries) ---
{
  const catalog = parentDiagnosticExplanationCatalogForTests();
  const mathIds = mathTaxonomyExplanationIdsForTests();
  const geomIds = geometryTaxonomyExplanationIdsForTests();
  const hebIds = hebrewSubjectTaxonomyExplanationIdsForTests();
  const engIds = englishSubjectTaxonomyExplanationIdsForTests();
  const sciIds = scienceSubjectTaxonomyExplanationIdsForTests();
  const mgIds = moledetGeographyTaxonomyExplanationIdsForTests();
  assert.deepEqual(
    mathIds,
    ["M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "M-07", "M-08", "M-09", "M-10"],
    "math catalog M-01..M-10",
  );
  assert.deepEqual(
    geomIds,
    ["G-01", "G-02", "G-03", "G-04", "G-05", "G-06", "G-07", "G-08"],
    "geometry catalog G-01..G-08",
  );
  assert.deepEqual(
    hebIds,
    ["H-01", "H-02", "H-03", "H-04", "H-05", "H-06", "H-07", "H-08"],
    "hebrew-subject catalog H-01..H-08",
  );
  assert.deepEqual(
    engIds,
    ["E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-07", "E-08"],
    "english-subject catalog E-01..E-08",
  );
  assert.deepEqual(
    sciIds,
    ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07", "S-08"],
    "science-subject catalog S-01..S-08",
  );
  assert.deepEqual(
    mgIds,
    ["MG-01", "MG-02", "MG-03", "MG-04", "MG-05", "MG-06", "MG-07", "MG-08"],
    "moledet-geography catalog MG-01..MG-08",
  );
  assert.equal(catalog.length, 50);
  for (const e of catalog.filter((x) => x.lookupKey.includes(":M-"))) {
    assert.equal(e.approvalSource, "owner_math_batch_approved", e.lookupKey);
  }
  for (const e of catalog.filter((x) => x.lookupKey.includes(":G-"))) {
    assert.equal(e.approvalSource, "owner_geometry_batch_approved", e.lookupKey);
  }
  for (const e of catalog.filter((x) => x.lookupKey.includes(":H-"))) {
    assert.equal(e.approvalSource, "owner_hebrew_subject_batch_approved", e.lookupKey);
  }
  for (const e of catalog.filter((x) => x.lookupKey.includes(":E-"))) {
    assert.equal(e.approvalSource, "owner_english_subject_batch_approved", e.lookupKey);
  }
  for (const e of catalog.filter((x) => x.lookupKey.includes(":S-"))) {
    assert.equal(e.approvalSource, "owner_science_subject_batch_approved", e.lookupKey);
  }
  for (const e of catalog.filter((x) => x.lookupKey.includes(":MG-"))) {
    assert.equal(e.approvalSource, "owner_moledet_geography_batch_approved", e.lookupKey);
  }
  for (const e of catalog) {
    assert.equal(e.status, "approved");
    assert.ok(e.explanationHe.startsWith("המערכת זיהתה"), `${e.lookupKey} prefix`);
    assert.ok(!e.explanationHe.includes("הילד/ה מתקשה"), `${e.lookupKey} no child-blame wording`);
    if (e.exampleHe) {
      assert.ok(!e.explanationHe.includes(String(e.exampleHe)), `${e.lookupKey} example separate from explanation`);
    }
  }
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "M-99" }), null);
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "G-99" }), null);
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "H-99" }), null);
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "E-99" }), null);
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "S-99" }), null);
  assert.equal(resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "MG-99" }), null);
}

// --- Each M-01 … M-10 diagnosed → resolves on weakness row ---
for (const taxonomyId of mathTaxonomyExplanationIdsForTests()) {
  const unit = buildMathUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- M-02 / M-10 exact wording preserved ---
{
  const m02 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "M-02" });
  assert.equal(
    m02.explanationHe,
    "המערכת זיהתה קושי בחיבור שבו צריך להעביר עשרת לעמודה הבאה. זה קורה כשמחברים ספרות ומתקבל מספר גדול מ־9.",
  );
  assert.equal(m02.exampleHe, "27 + 18");
  const m10 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "M-10" });
  assert.equal(
    m10.explanationHe,
    "המערכת זיהתה קושי בהבנת הקשר בין חילוק לכפל. כלומר, להשתמש בכפל כדי לבדוק תרגיל חילוק או לבחור את הפעולה המתאימה.",
  );
  assert.equal(m10.exampleHe, "12 ÷ 3 = 4; 4 × 3 = 12");
}

// --- M-03 only → no M-02 / M-10 explanations ---
{
  const unit = buildMathUnit("M-03");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(M03_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M05_EXPLANATION_PREFIX));
}

// --- No math taxonomy weakness → no explanation block ---
{
  const topicRowKey = "addition\u0001learning\u0001g3\u0001easy";
  const unit = {
    ...buildMathUnit("M-02"),
    taxonomy: { id: "M-02", patternHe: "", subskillHe: "נשיאה" },
    diagnosis: { allowed: true, taxonomyId: "M-02", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0, "no pattern label → no weakness row");
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
}

// --- M-09 snapshot (detailed + short) ---
{
  const unit = buildMathUnit("M-09");
  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses[0];
  assert.ok(w0.parentDiagnosticExplanationV1.explanationHe.startsWith(M09_EXPLANATION_PREFIX));
  assert.equal(w0.parentDiagnosticExplanationV1.exampleHe, "13 - 5");

  const topicRowKey = unit.topicRowKey;
  const detailed = buildDetailedParentReportFromBaseReport(
    {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      summary: { totalQuestions: 20 },
      mathOperations: { [topicRowKey]: rowFor(unit) },
      diagnosticEngineV2: { units: [unit] },
    },
    { period: "week" },
  );
  const sp = detailed.subjectProfiles.find((p) => p.subject === "math");
  assert.ok(sp.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe.startsWith(M09_EXPLANATION_PREFIX));
}

// --- Each G-01 … G-08 diagnosed → resolves on weakness row ---
for (const taxonomyId of geometryTaxonomyExplanationIdsForTests()) {
  const unit = buildGeometryUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} geometry catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} geometry weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- G-03 only → no G-01 / G-08 / math explanations ---
{
  const unit = buildGeometryUnit("G-03");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(G03_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G01_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G08_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
}

// --- No geometry taxonomy weakness → no geometry explanation ---
{
  const unit = {
    ...buildGeometryUnit("G-03"),
    taxonomy: { id: "G-03", patternHe: "", subskillHe: "גובה" },
    diagnosis: { allowed: true, taxonomyId: "G-03", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_geom_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0);
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(G03_EXPLANATION_PREFIX));
}

// --- Geometry LTR example lines (separate from explanationHe) ---
{
  const g03 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "G-03" });
  assert.equal(g03.exampleHe, "גובה ⟂ בסיס");
  assert.ok(!g03.explanationHe.includes("⟂"));
  const g06 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "G-06" });
  assert.equal(g06.exampleHe, "120 ס״מ = 1.2 מ׳");
  assert.ok(!g06.explanationHe.includes("1.2"));
  const g08 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "G-08" });
  assert.equal(g08.exampleHe, "בסיס 6, גובה 4: 6 × 4 ÷ 2");
  assert.ok(!g08.explanationHe.includes("6 × 4"));
}

// --- G-08 snapshot ---
{
  const unit = buildGeometryUnit("G-08");
  const ex = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.ok(ex.explanationHe.startsWith(G08_EXPLANATION_PREFIX));
  assert.equal(ex.exampleHe, "בסיס 6, גובה 4: 6 × 4 ÷ 2");
  process.stdout.write(
    `\n[G-08 snapshot]\n${ex.explanationHe}\nדוגמה כללית: ${ex.exampleHe}\n`,
  );
}

// --- Each H-01 … H-08 diagnosed → resolves on weakness row ---
for (const taxonomyId of hebrewSubjectTaxonomyExplanationIdsForTests()) {
  const unit = buildHebrewSubjectUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} hebrew-subject catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} hebrew weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- H-04 only → no H-01 / H-08 / math / geometry explanations ---
{
  const unit = buildHebrewSubjectUnit("H-04");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(H04_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(H01_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(H08_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G03_EXPLANATION_PREFIX));
}

// --- No Hebrew-subject taxonomy weakness → no Hebrew-subject explanation ---
{
  const unit = {
    ...buildHebrewSubjectUnit("H-04"),
    taxonomy: { id: "H-04", patternHe: "", subskillHe: "חיפוש" },
    diagnosis: { allowed: true, taxonomyId: "H-04", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_heb_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0);
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(H04_EXPLANATION_PREFIX));
}

// --- Hebrew-subject LTR example lines (separate from explanationHe) ---
{
  const h04 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "H-04" });
  assert.equal(h04.exampleHe, "מתי קרה? / מי עשה?");
  assert.ok(!h04.explanationHe.includes("מתי קרה"));
  const h05 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "H-05" });
  assert.equal(h05.exampleHe, "אם / עם");
  assert.ok(!h05.explanationHe.includes("אם / עם"));
  const h01 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "H-01" });
  assert.equal(h01.exampleHe, "שמח / עליז");
  assert.ok(!h01.explanationHe.includes("שמח"));
}

// --- H-05 snapshot (short + detailed) ---
{
  const unit = buildHebrewSubjectUnit("H-05");
  const ex = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.ok(ex.explanationHe.startsWith(H05_EXPLANATION_PREFIX));
  assert.equal(ex.exampleHe, "אם / עם");

  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe, ex.explanationHe);

  const topicRowKey = unit.topicRowKey;
  const detailed = buildDetailedParentReportFromBaseReport(
    {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      summary: { totalQuestions: 20 },
      hebrewTopics: { [topicRowKey]: rowFor(unit) },
      diagnosticEngineV2: { units: [unit] },
    },
    { period: "week" },
  );
  const sp = detailed.subjectProfiles.find((p) => p.subject === "hebrew");
  assert.ok(sp.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe.startsWith(H05_EXPLANATION_PREFIX));
  process.stdout.write(
    `\n[H-05 snapshot]\n${ex.explanationHe}\nדוגמה כללית: ${ex.exampleHe}\n`,
  );
}

// --- Each E-01 … E-08 diagnosed → resolves on weakness row ---
for (const taxonomyId of englishSubjectTaxonomyExplanationIdsForTests()) {
  const unit = buildEnglishSubjectUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} english-subject catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} english weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- E-05 only → no E-01 / E-08 / math / geometry / Hebrew explanations ---
{
  const unit = buildEnglishSubjectUnit("E-05");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(E05_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(E01_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(E08_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G03_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(H04_EXPLANATION_PREFIX));
}

// --- No English-subject taxonomy weakness → no English-subject explanation ---
{
  const unit = {
    ...buildEnglishSubjectUnit("E-05"),
    taxonomy: { id: "E-05", patternHe: "", subskillHe: "preposition" },
    diagnosis: { allowed: true, taxonomyId: "E-05", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_eng_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0);
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(E05_EXPLANATION_PREFIX));
}

// --- English-subject LTR example lines (separate from explanationHe) ---
{
  const e01 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "E-01" });
  assert.equal(e01.exampleHe, "make a decision");
  assert.ok(!e01.explanationHe.includes("make a decision"));
  const e05 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "E-05" });
  assert.equal(e05.exampleHe, "in / on / at");
  assert.ok(!e05.explanationHe.includes("in / on / at"));
  const e08 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "E-08" });
  assert.equal(e08.exampleHe, "ship / sheep");
  assert.ok(!e08.explanationHe.includes("ship / sheep"));
}

// --- E-08 snapshot (short + detailed) ---
{
  const unit = buildEnglishSubjectUnit("E-08");
  const ex = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.ok(ex.explanationHe.startsWith(E08_EXPLANATION_PREFIX));
  assert.equal(ex.exampleHe, "ship / sheep");

  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe, ex.explanationHe);

  const topicRowKey = unit.topicRowKey;
  const detailed = buildDetailedParentReportFromBaseReport(
    {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      summary: { totalQuestions: 20 },
      englishTopics: { [topicRowKey]: rowFor(unit) },
      diagnosticEngineV2: { units: [unit] },
    },
    { period: "week" },
  );
  const sp = detailed.subjectProfiles.find((p) => p.subject === "english");
  assert.ok(sp.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe.startsWith(E08_EXPLANATION_PREFIX));
  process.stdout.write(
    `\n[E-08 snapshot]\n${ex.explanationHe}\nדוגמה כללית: ${ex.exampleHe}\n`,
  );
}

// --- Each S-01 … S-08 diagnosed → resolves on weakness row ---
for (const taxonomyId of scienceSubjectTaxonomyExplanationIdsForTests()) {
  const unit = buildScienceSubjectUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} science-subject catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} science weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- S-04 only → no S-01 / S-08 / math / geometry / Hebrew / English explanations ---
{
  const unit = buildScienceSubjectUnit("S-04");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(S04_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(S01_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(S08_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G03_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(H04_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(E05_EXPLANATION_PREFIX));
}

// --- No Science-subject taxonomy weakness → no Science-subject explanation ---
{
  const unit = {
    ...buildScienceSubjectUnit("S-04"),
    taxonomy: { id: "S-04", patternHe: "", subskillHe: "שימור מסה" },
    diagnosis: { allowed: true, taxonomyId: "S-04", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_sci_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0);
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(S04_EXPLANATION_PREFIX));
}

// --- Science-subject example lines (separate from explanationHe) ---
{
  const s03 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "S-03" });
  assert.equal(s03.exampleHe, "לב → כלי דם");
  assert.ok(!s03.explanationHe.includes("לב → כלי דם"));
  const s04 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "S-04" });
  assert.equal(s04.exampleHe, "קרח → מים");
  assert.ok(!s04.explanationHe.includes("קרח → מים"));
  const s05 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "S-05" });
  assert.equal(s05.exampleHe, "1000 גרם = 1 ק״ג");
  assert.ok(!s05.explanationHe.includes("1000 גרם"));
  const s07 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "S-07" });
  assert.equal(s07.exampleHe, "צמח → ארנב → שועל");
  assert.ok(!s07.explanationHe.includes("צמח → ארנב"));
}

// --- S-07 snapshot (short + detailed) ---
{
  const unit = buildScienceSubjectUnit("S-07");
  const ex = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.ok(ex.explanationHe.startsWith(S07_EXPLANATION_PREFIX));
  assert.equal(ex.exampleHe, "צמח → ארנב → שועל");

  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe, ex.explanationHe);

  const topicRowKey = unit.topicRowKey;
  const detailed = buildDetailedParentReportFromBaseReport(
    {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      summary: { totalQuestions: 20 },
      scienceTopics: { [topicRowKey]: rowFor(unit) },
      diagnosticEngineV2: { units: [unit] },
    },
    { period: "week" },
  );
  const sp = detailed.subjectProfiles.find((p) => p.subject === "science");
  assert.ok(sp.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe.startsWith(S07_EXPLANATION_PREFIX));
  process.stdout.write(
    `\n[S-07 snapshot]\n${ex.explanationHe}\nדוגמה כללית: ${ex.exampleHe}\n`,
  );
}

// --- Each MG-01 … MG-08 diagnosed → resolves on weakness row ---
for (const taxonomyId of moledetGeographyTaxonomyExplanationIdsForTests()) {
  const unit = buildMoledetGeographySubjectUnit(taxonomyId);
  const entry = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId });
  assert.ok(entry, `${taxonomyId} moledet-geography catalog entry resolves`);
  const fromUnit = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.equal(fromUnit?.lookupKey, `finding:taxonomy:${taxonomyId}`);
  assert.equal(fromUnit?.explanationHe, entry.explanationHe);
  assert.equal(fromUnit?.exampleHe, entry.exampleHe);

  const short = shortSummaryForUnit(unit);
  const w0 = short.topWeaknesses?.[0];
  assert.ok(w0?.parentDiagnosticExplanationV1, `${taxonomyId} moledet-geography weakness carries explanation`);
  assert.equal(w0.parentDiagnosticExplanationV1.explanationHe, entry.explanationHe);
}

// --- MG-01 only → no MG-08 / Science / English / Hebrew / Geometry / Math explanations ---
{
  const unit = buildMoledetGeographySubjectUnit("MG-01");
  const short = shortSummaryForUnit(unit);
  const blob = JSON.stringify(short);
  assert.ok(blob.includes(MG01_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(MG08_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M02_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(M10_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(G03_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(H04_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(E05_EXPLANATION_PREFIX));
  assert.ok(!blob.includes(S04_EXPLANATION_PREFIX));
}

// --- No Moledet/Geography taxonomy weakness → no Moledet/Geography explanation ---
{
  const unit = {
    ...buildMoledetGeographySubjectUnit("MG-01"),
    taxonomy: { id: "MG-01", patternHe: "", subskillHe: "סולם" },
    diagnosis: { allowed: true, taxonomyId: "MG-01", lineHe: "" },
    canonicalState: {
      actionState: "maintain",
      recommendation: { allowed: false, family: "maintain" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "excellent" },
      topicStateId: "ts_mg_str",
      stateHash: "h2",
    },
  };
  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses?.length || 0, 0);
  const blob = JSON.stringify(short);
  assert.ok(!blob.includes(MG01_EXPLANATION_PREFIX));
}

// --- Moledet/Geography example lines (separate from explanationHe) ---
{
  const mg01 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "MG-01" });
  assert.equal(mg01.exampleHe, "1 ס״מ במפה = 1 ק״מ במציאות");
  assert.ok(!mg01.explanationHe.includes("1 ס״מ במפה"));
  const mg03 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "MG-03" });
  assert.equal(mg03.exampleHe, "זכות לחינוך / חובה לשמור על הכללים");
  assert.ok(!mg03.explanationHe.includes("זכות לחינוך"));
  const mg07 = resolveApprovedParentDiagnosticExplanationV1({ taxonomyId: "MG-07" });
  assert.equal(mg07.exampleHe, "כנסת — חקיקה / בית משפט — שיפוט");
  assert.ok(!mg07.explanationHe.includes("כנסת — חקיקה"));
}

// --- MG-07 snapshot (short + detailed) ---
{
  const unit = buildMoledetGeographySubjectUnit("MG-07");
  const ex = buildParentDiagnosticExplanationV1FromV2Unit(unit);
  assert.ok(ex.explanationHe.startsWith(MG07_EXPLANATION_PREFIX));
  assert.equal(ex.exampleHe, "כנסת — חקיקה / בית משפט — שיפוט");

  const short = shortSummaryForUnit(unit);
  assert.equal(short.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe, ex.explanationHe);

  const topicRowKey = unit.topicRowKey;
  const detailed = buildDetailedParentReportFromBaseReport(
    {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      summary: { totalQuestions: 20 },
      moledetGeographyTopics: { [topicRowKey]: rowFor(unit) },
      diagnosticEngineV2: { units: [unit] },
    },
    { period: "week" },
  );
  const sp = detailed.subjectProfiles.find((p) => p.subject === "moledet-geography");
  assert.ok(sp.topWeaknesses[0].parentDiagnosticExplanationV1.explanationHe.startsWith(MG07_EXPLANATION_PREFIX));
  process.stdout.write(
    `\n[MG-07 snapshot]\n${ex.explanationHe}\nדוגמה כללית: ${ex.exampleHe}\n`,
  );
}

// --- School report unchanged ---
if (schoolMod.buildSchoolClassReportViewModel) {
  const vm = schoolMod.buildSchoolClassReportViewModel({
    classLabel: "א",
    subjectReports: [],
    guidanceFocus: [],
  });
  const blob = JSON.stringify(vm);
  for (const prefix of [
    M02_EXPLANATION_PREFIX,
    M03_EXPLANATION_PREFIX,
    M05_EXPLANATION_PREFIX,
    M09_EXPLANATION_PREFIX,
    M10_EXPLANATION_PREFIX,
    G01_EXPLANATION_PREFIX,
    G03_EXPLANATION_PREFIX,
    G08_EXPLANATION_PREFIX,
    H01_EXPLANATION_PREFIX,
    H04_EXPLANATION_PREFIX,
    H05_EXPLANATION_PREFIX,
    H08_EXPLANATION_PREFIX,
    E01_EXPLANATION_PREFIX,
    E05_EXPLANATION_PREFIX,
    E08_EXPLANATION_PREFIX,
    S01_EXPLANATION_PREFIX,
    S04_EXPLANATION_PREFIX,
    S07_EXPLANATION_PREFIX,
    S08_EXPLANATION_PREFIX,
    MG01_EXPLANATION_PREFIX,
    MG07_EXPLANATION_PREFIX,
    MG08_EXPLANATION_PREFIX,
  ]) {
    assert.ok(!blob.includes(prefix), "school report must not include parent explanations");
  }
}

process.stdout.write("OK parent-report-diagnostic-explanation-verify\n");
