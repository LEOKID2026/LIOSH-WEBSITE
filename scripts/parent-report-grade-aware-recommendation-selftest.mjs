/**
 * Grade-aware parent recommendation tests (Phase 1).
 * Run with tsx (imports recommendation-consistency → parent-report-language barrel):
 *   npx tsx scripts/parent-report-grade-aware-recommendation-selftest.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [templatesMod, resolverMod, recMod, detailedMod, parentReportV2Mod, fractionOrderMod, wordProblemsOrderMod] =
  await Promise.all([
    import("../utils/parent-report-language/grade-aware-recommendation-templates.js"),
    import("../utils/parent-report-language/grade-aware-recommendation-resolver.js"),
    import("../utils/parent-report-recommendation-consistency.js"),
    import("../utils/detailed-parent-report.js"),
    import("../utils/parent-report-v2.js"),
    import(new URL("../utils/diagnostic-engine-v2/fraction-taxonomy-candidate-order.js", import.meta.url).href),
    import(new URL("../utils/diagnostic-engine-v2/word-problems-taxonomy-candidate-order.js", import.meta.url).href),
  ]);

const GRADE_AWARE_RECOMMENDATION_TEMPLATES = templatesMod.GRADE_AWARE_RECOMMENDATION_TEMPLATES;
const { resolveGradeAwareParentRecommendationHe } = resolverMod;
const { resolveUnitParentActionHe, resolveUnitNextGoalHe } = recMod;
const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests } = parentReportV2Mod;
const { orderFractionTaxonomyCandidates } = fractionOrderMod;
const { orderWordProblemsTaxonomyCandidates } = wordProblemsOrderMod;

const T07_WP = GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-07"].bucketOverrides.word_problems;
const T08_BO = GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-08"].bucketOverrides;

let failures = 0;
let runs = 0;

function check(name, ok, details) {
  runs += 1;
  if (ok) return;
  failures += 1;
  process.stderr.write(`FAIL ${name}${details ? ` :: ${details}` : ""}\n`);
}

/** @param {unknown} value */
function collectSlotTextLeaves(value, out = []) {
  if (value && typeof value === "object") {
    if ("actionTextHe" in /** @type {Record<string, unknown>} */ (value)) {
      const v = /** @type {Record<string, unknown>} */ (value).actionTextHe;
      if (v != null && String(v).trim()) out.push(v);
    }
    if ("goalTextHe" in /** @type {Record<string, unknown>} */ (value)) {
      const v = /** @type {Record<string, unknown>} */ (value).goalTextHe;
      if (v != null && String(v).trim()) out.push(v);
    }
    for (const v of Object.values(value)) collectSlotTextLeaves(v, out);
  }
  return out;
}

function makeM09InterveneUnit() {
  return {
    subjectId: "math",
    bucketKey: "subtraction",
    topicRowKey: "subtraction\u0001learning\u0001g4\u0001easy",
    displayName: "חיסור",
    diagnosis: { allowed: true, taxonomyId: "M-09" },
    intervention: {
      immediateActionHe: "ציר + סימבולי",
      shortPracticeHe: "ציר + מרחק",
      taxonomyId: "M-09",
    },
    taxonomy: { id: "M-09" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

/** @param {string} s */
function assertM01ResolvedNoInternalHe(s, label) {
  const t = String(s || "");
  const bad = [
    "טעויות בהמרת ייצוג",
    "מבנה / פירוק 10+1",
    "פירוק 10+1",
    "שני ייצוגים לאותו מספר",
    "מניפולציה + מעבר הדרגתי לסמל",
  ];
  for (const b of bad) {
    check(`${label} must not include raw M-01 phrase: ${b}`, !t.includes(b));
  }
}

function makeM01InterveneUnit(bucketKey) {
  return {
    subjectId: "math",
    bucketKey,
    topicRowKey: `${bucketKey}\u0001learning\u0001g4\u0001easy`,
    displayName: "חשבון",
    diagnosis: { allowed: true, taxonomyId: "M-01" },
    intervention: {
      immediateActionHe: "מניפולציה + מעבר הדרגתי לסמל",
      shortPracticeHe: "שני ייצוגים לאותו מספר",
      taxonomyId: "M-01",
    },
    taxonomy: { id: "M-01" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

/** Engine-style strings to ensure templates replace; not used as patternHe in summaries. */
function makeM06InterveneUnit() {
  return {
    subjectId: "math",
    bucketKey: "decimals",
    topicRowKey: "decimals\u0001learning\u0001g4\u0001easy",
    displayName: "עשרוניות",
    diagnosis: { allowed: true, taxonomyId: "M-06" },
    intervention: {
      immediateActionHe: "צביעת עמדות",
      shortPracticeHe: "עם/בלי טבלת עמדות",
      taxonomyId: "M-06",
    },
    taxonomy: { id: "M-06" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

const M04_G34_ACTION =
  "כדאי לתרגל השוואת שברים בעזרת ציור מדויק או סרגל שברים, ואז להסביר מה מייצג המונה ומה מייצג המכנה. בשברים בעלי אותו מכנה, בקשו מהילד להסביר מדוע משווים לפי מספר החלקים שנלקחו.";
const M04_G34_GOAL =
  "בשבוע הקרוב התמקדו בהשוואת שברים ובהבנת תפקיד המונה והמכנה, במיוחד בשברים בעלי אותו מכנה או בייצוגים פשוטים וברורים.";
const M04_G56_ACTION =
  "כדאי לתרגל השוואת שברים בעזרת שברים שקולים, מכנה משותף או אומדן ביחס אל 0, חצי ו 1. בקשו מהילד להסביר מדוע שבר אחד גדול מאחר, ולא להסתמך רק על גודל המונה או המכנה.";
const M04_G56_GOAL =
  "בשבוע הקרוב התמקדו בהשוואת שברים בעזרת שברים שקולים, מכנה משותף ואומדן, עם נימוק ברור לכל השוואה.";

const M05_G34_ACTION =
  "כדאי לתרגל חיבור וחיסור שברים בעלי אותו מכנה. בקשו מהילד להסביר שהמכנה מתאר את גודל החלקים, ולכן מחברים או מחסרים את המונים ובודקים שהתוצאה מתאימה לשלם.";
const M05_G34_GOAL =
  "בשבוע הקרוב התמקדו בחיבור וחיסור שברים בעלי אותו מכנה, תוך שמירה על משמעות המכנה ובדיקת סבירות התוצאה.";
const M05_G56_ACTION =
  "כדאי לתרגל חיבור וחיסור שברים עם מכנים שונים בעזרת מציאת מכנה משותף, יצירת שברים שקולים ובדיקת התוצאה לאחר הפעולה. בקשו מהילד להסביר כל שלב לפני שהוא מפשט את התשובה.";
const M05_G56_GOAL =
  "בשבוע הקרוב התמקדו בפעולות חיבור וחיסור בשברים עם מכנים שונים: מכנה משותף, שברים שקולים, ביצוע הפעולה ובדיקת סבירות.";

/** Raw M-04/M-05 taxonomy cues — must not appear when grade-aware templates resolve (g3+). */
const FRACTION_TEMPLATE_BANNED_SUBSTRINGS = [
  "השוואה לפי מונה בלבד",
  "טעות באותה שלב",
  "עם/בלי שרטוט",
  "חלק כלל קונקרטי",
  "המראה 2,3,4",
  "שלבים כתובים + דוגמה מקבילה",
];

/** @param {string} label @param {string|null|undefined} s */
function assertFractionResolvedSurfaceClean(label, s) {
  const t = String(s || "");
  for (const b of FRACTION_TEMPLATE_BANNED_SUBSTRINGS) {
    check(`${label} must not include raw taxonomy/engine phrase: ${b}`, !t.includes(b));
  }
}

function makeM04InterveneUnit() {
  return {
    subjectId: "math",
    bucketKey: "fractions",
    topicRowKey: "fractions\u0001learning\u0001g4\u0001easy",
    displayName: "שברים",
    diagnosis: { allowed: true, taxonomyId: "M-04" },
    intervention: {
      immediateActionHe: "חלק כלל קונקרטי",
      shortPracticeHe: "עם/בלי שרטוט",
      taxonomyId: "M-04",
    },
    taxonomy: { id: "M-04", patternHe: "השוואה לפי מונה בלבד" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

function makeM05InterveneUnit() {
  return {
    subjectId: "math",
    bucketKey: "fractions",
    topicRowKey: "fractions\u0001learning\u0001g5\u0001easy",
    displayName: "שברים",
    diagnosis: { allowed: true, taxonomyId: "M-05" },
    intervention: {
      immediateActionHe: "שלבים כתובים + דוגמה מקבילה",
      shortPracticeHe: "המראה 2,3,4",
      taxonomyId: "M-05",
    },
    taxonomy: { id: "M-05", patternHe: "טעות באותה שלב" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

function makeM07InterveneUnit() {
  return {
    subjectId: "math",
    bucketKey: "word_problems",
    topicRowKey: "word_problems\u0001learning\u0001g4\u0001easy",
    displayName: "מילולי",
    diagnosis: { allowed: true, taxonomyId: "M-07" },
    intervention: {
      immediateActionHe: "מספר + שורת יחידה",
      shortPracticeHe: "עם/בלי שדה יחידה",
      taxonomyId: "M-07",
    },
    taxonomy: { id: "M-07", patternHe: "מספר נכון + יחידה שגויה" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

/** @param {string} bucketKey */
function makeM08InterveneUnit(bucketKey) {
  return {
    subjectId: "math",
    bucketKey,
    topicRowKey: `${bucketKey}\u0001learning\u0001g4\u0001easy`,
    displayName: "מתמטיקה",
    diagnosis: { allowed: true, taxonomyId: "M-08" },
    intervention: {
      immediateActionHe: "שלבים + בדיקה לאחור",
      shortPracticeHe: "עם תבנית שלבים",
      taxonomyId: "M-08",
    },
    taxonomy: { id: "M-08", patternHe: "כישלון רק באיחוד" },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
    },
  };
}

/** @param {string|null|undefined} s @param {string} label */
function assertM0708ResolvedSurfaceClean(label, s) {
  const t = String(s || "");
  const bad = [
    "מספר נכון + יחידה שגויה",
    "כישלון רק באיחוד",
    "עם/בלי שדה יחידה",
    "מספר + שורת יחידה",
    "עם תבנית שלבים",
    "שלבים + בדיקה לאחור",
  ];
  for (const b of bad) {
    check(`${label} must not include raw M-07/M-08 taxonomy/engine phrase: ${b}`, !t.includes(b));
  }
}

/** @param {string} s */
function assertM06ParentSurfaceNoInternalHe(s) {
  const t = String(s || "");
  const bad = [
    "טעות כיוון עיגול",
    "עם/בלי טבלת עמדות",
    "צביעת עמדות",
    "עיגול/השוואה",
  ];
  for (const b of bad) {
    check(`M-06 parent surface must not include internal phrase: ${b}`, !t.includes(b));
  }
}

const slotLeaves = collectSlotTextLeaves(GRADE_AWARE_RECOMMENDATION_TEMPLATES);
check("template bank has slot leaves", slotLeaves.length > 0);
for (let i = 0; i < slotLeaves.length; i += 1) {
  check(
    `template slot ${i} is non-empty string`,
    typeof slotLeaves[i] === "string" && String(slotLeaves[i]).trim().length > 0
  );
}

const m09g4 = GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-09"].g3_g4;
check(
  "M-09 g3_g4 action and goal differ",
  String(m09g4.actionTextHe) !== String(m09g4.goalTextHe)
);
check(
  "M-07 word_problems g3_g4 action and goal differ",
  String(T07_WP.g3_g4.actionTextHe) !== String(T07_WP.g3_g4.goalTextHe)
);
check(
  "M-08 word_problems g3_g4 action and goal differ",
  String(T08_BO.word_problems.g3_g4.actionTextHe) !== String(T08_BO.word_problems.g3_g4.goalTextHe)
);
check(
  "M-08 sequences g5_g6 action and goal differ",
  String(T08_BO.sequences.g5_g6.actionTextHe) !== String(T08_BO.sequences.g5_g6.goalTextHe)
);
check(
  "M-08 equations g5_g6 action and goal differ",
  String(T08_BO.equations.g5_g6.actionTextHe) !== String(T08_BO.equations.g5_g6.goalTextHe)
);
check(
  "M-08 order_of_operations g5_g6 action and goal differ",
  String(T08_BO.order_of_operations.g5_g6.actionTextHe) !== String(T08_BO.order_of_operations.g5_g6.goalTextHe)
);
{
  const leaves0708 = [];
  collectSlotTextLeaves(GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-07"], leaves0708);
  collectSlotTextLeaves(GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-08"], leaves0708);
  const joined0708 = leaves0708.map(String).join("\n");
  const banned0708 = [
    "מספר נכון + יחידה שגויה",
    "כישלון רק באיחוד",
    "עם/בלי שדה יחידה",
    "מספר + שורת יחידה",
    "עם תבנית שלבים",
    "שלבים + בדיקה לאחור",
  ];
  for (const b of banned0708) {
    check(`M-07/M-08 approved template Hebrew must not include raw phrase: ${b}`, !joined0708.includes(b));
  }
}

// --- Resolver: always active (no feature flag) ---
{
  delete process.env.ENABLE_GRADE_AWARE_RECOMMENDATIONS;
  delete process.env.NEXT_PUBLIC_ENABLE_GRADE_AWARE_RECOMMENDATIONS;

  check(
    "resolver M-09 g4 action without env",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-09",
      slot: "action",
    }) !== null
  );
  check(
    "resolver M-06 g4 action without env",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-06",
      slot: "action",
    }) !== null
  );
  check(
    "resolver M-04 g4 action without env",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-04",
      slot: "action",
    }) !== null
  );
  check(
    "resolver M-05 g5 action without env",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g5",
      taxonomyId: "M-05",
      slot: "action",
    }) !== null
  );
  check(
    "unknown gradeKey → resolver null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-09",
      slot: "action",
    }) === null
  );
  const u = makeM09InterveneUnit();
  const m09Surf = resolveUnitParentActionHe(u, "g4");
  check(
    "resolveUnit M-09 g4 uses template (no raw ציר)",
    m09Surf != null &&
      !String(m09Surf).includes("ציר + סימבולי") &&
      !String(m09Surf).includes("ציר + מרחק")
  );
  const u6 = makeM06InterveneUnit();
  const m06Surf = resolveUnitParentActionHe(u6, "g4");
  check("resolveUnit M-06 g4 uses template (not raw engine immediate)", m06Surf != null && !String(m06Surf).includes("צביעת עמדות"));
  const uM04 = makeM04InterveneUnit();
  const m04Surf = resolveUnitParentActionHe(uM04, "g4");
  check(
    "resolveUnit M-04 g4 uses template (not raw engine immediate)",
    m04Surf != null && !String(m04Surf).includes("חלק כלל קונקרטי")
  );
  const uM05 = makeM05InterveneUnit();
  const m05Surf = resolveUnitParentActionHe(uM05, "g5");
  check(
    "resolveUnit M-05 g5 uses template (not raw engine immediate)",
    m05Surf != null && !String(m05Surf).includes("שלבים כתובים + דוגמה מקבילה")
  );
  const uM07 = makeM07InterveneUnit();
  const m07Surf = resolveUnitParentActionHe(uM07, "g4");
  check(
    "resolveUnit M-07 g4 uses template (not raw engine immediate)",
    m07Surf != null && !String(m07Surf).includes("מספר + שורת יחידה")
  );
}

// --- Resolver: grade-aware templates ---
{
  {
    const t = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-09",
      slot: "action",
    });
    check(
      "flag on → resolver M-09 g4 action",
      t != null &&
        !String(t).includes("ציר + סימבולי") &&
        !String(t).includes("ציר + מרחק") &&
        String(t).includes("מאונך")
    );
  }
  {
    const t = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-09",
      slot: "nextGoal",
    });
    check(
      "flag on → resolver M-09 g4 nextGoal",
      t != null && !String(t).includes("ציר + סימבולי") && !String(t).includes("ציר + מרחק")
    );
  }
  {
    const t = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g2",
      taxonomyId: "M-09",
      slot: "action",
    });
    check(
      "M-09 g1 uses concrete / number-line wording",
      t != null && (String(t).includes("חפצים") || String(t).includes("קו מספרים"))
    );
  }
  {
    const t = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g3",
      taxonomyId: "M-09",
      slot: "action",
    });
    check(
      "M-09 g3 uses vertical / regrouping wording",
      t != null && String(t).includes("מאונך") && String(t).includes("פריטה")
    );
  }
  {
    const t = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-09",
      slot: "action",
    });
    check(
      "M-09 g6 uses estimation / multi-step wording",
      t != null && String(t).includes("אומדן") && String(t).includes("רב שלבי")
    );
  }
  {
    const a2 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g2",
      taxonomyId: "M-02",
      slot: "action",
    });
    const a4 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-02",
      slot: "action",
    });
    const a6 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-02",
      slot: "action",
    });
    check(
      "M-02 g2 vs g4 vs g6 action strings differ",
      !!(a2 && a4 && a6 && a2 !== a4 && a4 !== a6 && a2 !== a6)
    );
  }
  check(
    "unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-09",
      slot: "action",
    }) === null
  );
  check(
    "unknown taxonomy → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-99",
      slot: "action",
    }) === null
  );
  check(
    "M-01 without bucketKey → resolver null (defaultBands Hebrew null)",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      slot: "action",
    }) === null
  );
  check(
    "M-01 scale bucket → template action",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "scale",
      slot: "action",
    }) != null
  );
  check(
    "M-01 prime_composite → template action",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "prime_composite",
      slot: "action",
    }) != null
  );
  check(
    "M-01 zero_one_properties → template action",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "zero_one_properties",
      slot: "action",
    }) != null
  );
  check(
    "M-01 unknown bucket → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "not_a_real_bucket",
      slot: "action",
    }) === null
  );
  check(
    "M-01 compare g2 action uses small-number comparison wording",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g2",
        taxonomyId: "M-01",
        bucketKey: "compare",
        slot: "action",
      }) || ""
    ).includes("חפצים")
  );
  check(
    "M-01 compare g3 action uses multi-digit comparison wording",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g3",
        taxonomyId: "M-01",
        bucketKey: "compare",
        slot: "action",
      }) || ""
    ).includes("רב ספרתיים")
  );
  check(
    "M-01 compare g6 action uses large-number / representation wording",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g6",
        taxonomyId: "M-01",
        bucketKey: "compare",
        slot: "action",
      }) || ""
    ).includes("ייצוגים מספריים")
  );
  {
    const ca = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "compare",
      slot: "action",
    });
    const cg = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "compare",
      slot: "nextGoal",
    });
    check("M-01 compare g4 action and nextGoal differ", !!(ca && cg && ca !== cg));
  }
  check(
    "M-01 number_sense g2 action mentions composing/decomposing",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g2",
        taxonomyId: "M-01",
        bucketKey: "number_sense",
        slot: "action",
      }) || ""
    ).includes("עשרות ואחדות")
  );
  check(
    "M-01 number_sense g3 action mentions place-value decomposition",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g3",
        taxonomyId: "M-01",
        bucketKey: "number_sense",
        slot: "action",
      }) || ""
    ).includes("אלפים")
  );
  check(
    "M-01 number_sense g6 action mentions multiple representations",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g6",
        taxonomyId: "M-01",
        bucketKey: "number_sense",
        slot: "action",
      }) || ""
    ).includes("ייצוגים")
  );
  {
    const na = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "number_sense",
      slot: "action",
    });
    const ng = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "number_sense",
      slot: "nextGoal",
    });
    check("M-01 number_sense g4 action and nextGoal differ", !!(na && ng && na !== ng));
  }
  check(
    "M-01 estimation g2 action mentions small quantities / before count",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g2",
        taxonomyId: "M-01",
        bucketKey: "estimation",
        slot: "action",
      }) || ""
    ).includes("כמויות")
  );
  check(
    "M-01 estimation g3 action mentions multi-digit / before calculation",
    String(
      resolveGradeAwareParentRecommendationHe({
        subjectId: "math",
        gradeKey: "g3",
        taxonomyId: "M-01",
        bucketKey: "estimation",
        slot: "action",
      }) || ""
    ).includes("רב ספרתיים")
  );
  check(
    "M-01 estimation g6 action mentions fractions or decimals or percentages",
    (() => {
      const s = String(
        resolveGradeAwareParentRecommendationHe({
          subjectId: "math",
          gradeKey: "g6",
          taxonomyId: "M-01",
          bucketKey: "estimation",
          slot: "action",
        }) || ""
      );
      return s.includes("שברים פשוטים") || s.includes("עשרוניים") || s.includes("אחוזים");
    })()
  );
  {
    const ea = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "estimation",
      slot: "action",
    });
    const eg = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "estimation",
      slot: "nextGoal",
    });
    check("M-01 estimation g4 action and nextGoal differ", !!(ea && eg && ea !== eg));
  }
  check(
    "M-01 unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-01",
      bucketKey: "compare",
      slot: "action",
    }) === null
  );

  {
    const m06g2 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g2",
      taxonomyId: "M-06",
      slot: "action",
    });
    check(
      "M-06 g2 action uses early whole-number rounding wording",
      m06g2 != null && (String(m06g2).includes("קו מספרים") || String(m06g2).includes("העשרת הקרובה"))
    );
  }
  {
    const m06g3 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g3",
      taxonomyId: "M-06",
      slot: "action",
    });
    check(
      "M-06 g3 action uses place-value rounding wording",
      m06g3 != null && String(m06g3).includes("עשרות") && String(m06g3).includes("ערך הספרות")
    );
  }
  {
    const m06g6 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-06",
      slot: "action",
    });
    check(
      "M-06 g6 action mentions decimals or percentages or estimation",
      m06g6 != null &&
        (String(m06g6).includes("עשרוניים") ||
          String(m06g6).includes("אחוזים") ||
          String(m06g6).includes("אומדן"))
    );
  }
  {
    const a = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-06",
      slot: "action",
    });
    const g = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-06",
      slot: "nextGoal",
    });
    check("M-06 g4 action and nextGoal differ", !!(a && g && a !== g));
  }
  check(
    "M-06 unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-06",
      slot: "action",
    }) === null
  );

  check(
    "M-04 g1/g2 action → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g2",
      taxonomyId: "M-04",
      slot: "action",
    }) === null
  );
  check(
    "M-04 g1/g2 nextGoal → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g1",
      taxonomyId: "M-04",
      slot: "nextGoal",
    }) === null
  );
  check(
    "M-04 g4 action exact approved copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-04",
      slot: "action",
    }) === M04_G34_ACTION
  );
  check(
    "M-04 g4 nextGoal exact approved copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-04",
      slot: "nextGoal",
    }) === M04_G34_GOAL
  );
  check(
    "M-04 g6 action exact approved copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-04",
      slot: "action",
    }) === M04_G56_ACTION
  );
  check(
    "M-04 g6 nextGoal exact approved copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g5",
      taxonomyId: "M-04",
      slot: "nextGoal",
    }) === M04_G56_GOAL
  );
  {
    const a4 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-04",
      slot: "action",
    });
    const g4 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-04",
      slot: "nextGoal",
    });
    check("M-04 g4 action and nextGoal differ", !!(a4 && g4 && a4 !== g4));
  }
  {
    const a6 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-04",
      slot: "action",
    });
    const g6 = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-04",
      slot: "nextGoal",
    });
    check("M-04 g6 action and nextGoal differ", !!(a6 && g6 && a6 !== g6));
  }
  check(
    "M-04 unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-04",
      slot: "action",
    }) === null
  );

  check(
    "M-05 g1/g2 action → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g1",
      taxonomyId: "M-05",
      slot: "action",
    }) === null
  );
  check(
    "M-05 g3 action exact same-denominator operation copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g3",
      taxonomyId: "M-05",
      slot: "action",
    }) === M05_G34_ACTION
  );
  check(
    "M-05 g3 nextGoal exact same-denominator operation copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-05",
      slot: "nextGoal",
    }) === M05_G34_GOAL
  );
  check(
    "M-05 g6 action exact unlike-denominator copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-05",
      slot: "action",
    }) === M05_G56_ACTION
  );
  check(
    "M-05 g5 nextGoal exact unlike-denominator copy",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g5",
      taxonomyId: "M-05",
      slot: "nextGoal",
    }) === M05_G56_GOAL
  );
  {
    const a = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-05",
      slot: "action",
    });
    const g = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-05",
      slot: "nextGoal",
    });
    check("M-05 g4 action and nextGoal differ", !!(a && g && a !== g));
  }
  {
    const a = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-05",
      slot: "action",
    });
    const g = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-05",
      slot: "nextGoal",
    });
    check("M-05 g6 action and nextGoal differ", !!(a && g && a !== g));
  }
  check(
    "M-05 unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-05",
      slot: "action",
    }) === null
  );

  check(
    "M-07 without bucketKey → resolver null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-07",
      slot: "action",
    }) === null
  );
  check(
    "M-07 unknown bucket → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-07",
      bucketKey: "addition",
      slot: "action",
    }) === null
  );
  check(
    "M-07 unknown gradeKey → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g9",
      taxonomyId: "M-07",
      bucketKey: "word_problems",
      slot: "action",
    }) === null
  );
  check(
    "M-07 word_problems g1_g2 action → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g2",
      taxonomyId: "M-07",
      bucketKey: "word_problems",
      slot: "action",
    }) === null
  );
  check(
    "M-07 word_problems g4 action exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-07",
      bucketKey: "word_problems",
      slot: "action",
    }) === T07_WP.g3_g4.actionTextHe
  );
  check(
    "M-07 word_problems g4 nextGoal exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-07",
      bucketKey: "word_problems",
      slot: "nextGoal",
    }) === T07_WP.g3_g4.goalTextHe
  );
  check(
    "M-07 word_problems g6 action exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g6",
      taxonomyId: "M-07",
      bucketKey: "word_problems",
      slot: "action",
    }) === T07_WP.g5_g6.actionTextHe
  );
  check(
    "M-08 without bucketKey → resolver null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-08",
      slot: "action",
    }) === null
  );
  check(
    "M-08 unknown bucket → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-08",
      bucketKey: "addition",
      slot: "action",
    }) === null
  );
  check(
    "M-08 word_problems g1_g2 nextGoal → null",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g1",
      taxonomyId: "M-08",
      bucketKey: "word_problems",
      slot: "nextGoal",
    }) === null
  );
  check(
    "M-08 word_problems g4 action exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-08",
      bucketKey: "word_problems",
      slot: "action",
    }) === T08_BO.word_problems.g3_g4.actionTextHe
  );
  check(
    "M-08 sequences g4 goal exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-08",
      bucketKey: "sequences",
      slot: "nextGoal",
    }) === T08_BO.sequences.g3_g4.goalTextHe
  );
  check(
    "M-08 equations g3 action exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g3",
      taxonomyId: "M-08",
      bucketKey: "equations",
      slot: "action",
    }) === T08_BO.equations.g3_g4.actionTextHe
  );
  check(
    "M-08 order_of_operations g5 action exact",
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g5",
      taxonomyId: "M-08",
      bucketKey: "order_of_operations",
      slot: "action",
    }) === T08_BO.order_of_operations.g5_g6.actionTextHe
  );
  check(
    "word_problems routing unit evidence → M-07 first",
    JSON.stringify(orderWordProblemsTaxonomyCandidates(["M-07", "M-08"], [{ params: { wrong_unit: true } }], {})) ===
      JSON.stringify(["M-07", "M-08"])
  );
  check(
    "word_problems routing model evidence → M-08 first",
    JSON.stringify(
      orderWordProblemsTaxonomyCandidates(["M-07", "M-08"], [{ params: { kind: "wp_multi_step", multi_step: true } }], {})
    ) === JSON.stringify(["M-08", "M-07"])
  );
  check(
    "word_problems routing ambiguous preserves order",
    JSON.stringify(orderWordProblemsTaxonomyCandidates(["M-07", "M-08"], [], {})) === JSON.stringify(["M-07", "M-08"])
  );

  const u = makeM09InterveneUnit();
  const act = resolveUnitParentActionHe(u, "g4");
  const goal = resolveUnitNextGoalHe(u, "g4");
  check("resolveUnit M-09 g4 action no ציר phrases", act && !act.includes("ציר + סימבולי") && !act.includes("ציר + מרחק"));
  check("resolveUnit M-09 g4 goal no ציר phrases", goal && !goal.includes("ציר + סימבולי") && !goal.includes("ציר + מרחק"));
  check("resolveUnit M-09 g4 action ≠ goal", act && goal && act !== goal);

  const u6 = makeM06InterveneUnit();
  const a6 = resolveUnitParentActionHe(u6, "g4");
  const g6 = resolveUnitNextGoalHe(u6, "g4");
  check("resolveUnit M-06 g4 action no internal engine phrases", !!(a6 && g6));
  assertM06ParentSurfaceNoInternalHe(a6);
  assertM06ParentSurfaceNoInternalHe(g6);
  check("resolveUnit M-06 g4 action ≠ goal", a6 !== g6);

  {
    const u4 = makeM04InterveneUnit();
    const a4 = resolveUnitParentActionHe(u4, "g4");
    const g4 = resolveUnitNextGoalHe(u4, "g4");
    check("resolveUnit M-04 g4 template action", a4 === M04_G34_ACTION);
    check("resolveUnit M-04 g4 template goal", g4 === M04_G34_GOAL);
    assertFractionResolvedSurfaceClean("resolveUnit M-04 g4 action", a4);
    assertFractionResolvedSurfaceClean("resolveUnit M-04 g4 goal", g4);
    check("resolveUnit M-04 g4 action ≠ goal", a4 !== g4);
  }
  {
    const u5 = makeM05InterveneUnit();
    const a5 = resolveUnitParentActionHe(u5, "g5");
    const g5 = resolveUnitNextGoalHe(u5, "g5");
    check("resolveUnit M-05 g5 template action", a5 === M05_G56_ACTION);
    check("resolveUnit M-05 g5 template goal", g5 === M05_G56_GOAL);
    assertFractionResolvedSurfaceClean("resolveUnit M-05 g5 action", a5);
    assertFractionResolvedSurfaceClean("resolveUnit M-05 g5 goal", g5);
    check("resolveUnit M-05 g5 action ≠ goal", a5 !== g5);
  }
  {
    const u7 = makeM07InterveneUnit();
    const a7 = resolveUnitParentActionHe(u7, "g4");
    const g7 = resolveUnitNextGoalHe(u7, "g4");
    check("resolveUnit M-07 wp g4 template action", a7 === T07_WP.g3_g4.actionTextHe);
    check("resolveUnit M-07 wp g4 template goal", g7 === T07_WP.g3_g4.goalTextHe);
    assertM0708ResolvedSurfaceClean("resolveUnit M-07 wp g4 action", a7);
    assertM0708ResolvedSurfaceClean("resolveUnit M-07 wp g4 goal", g7);
    check("resolveUnit M-07 wp g4 action ≠ goal", a7 !== g7);
  }
  {
    const u8wp = makeM08InterveneUnit("word_problems");
    const aw = resolveUnitParentActionHe(u8wp, "g4");
    const gw = resolveUnitNextGoalHe(u8wp, "g4");
    check("resolveUnit M-08 wp g4 template action", aw === T08_BO.word_problems.g3_g4.actionTextHe);
    check("resolveUnit M-08 wp g4 template goal", gw === T08_BO.word_problems.g3_g4.goalTextHe);
    assertM0708ResolvedSurfaceClean("resolveUnit M-08 wp g4 action", aw);
    check("resolveUnit M-08 wp g4 action ≠ goal", aw !== gw);
  }
  {
    const u8eq = makeM08InterveneUnit("equations");
    const ae = resolveUnitParentActionHe(u8eq, "g6");
    const ge = resolveUnitNextGoalHe(u8eq, "g6");
    check("resolveUnit M-08 equations g6 template action", ae === T08_BO.equations.g5_g6.actionTextHe);
    check("resolveUnit M-08 equations g6 template goal", ge === T08_BO.equations.g5_g6.goalTextHe);
    assertM0708ResolvedSurfaceClean("resolveUnit M-08 equations g6 action", ae);
    check("resolveUnit M-08 equations g6 action ≠ goal", ae !== ge);
  }
  {
    const u8oo = makeM08InterveneUnit("order_of_operations");
    const ao = resolveUnitParentActionHe(u8oo, "g6");
    const go = resolveUnitNextGoalHe(u8oo, "g6");
    check("resolveUnit M-08 OOO g6 template action", ao === T08_BO.order_of_operations.g5_g6.actionTextHe);
    assertM0708ResolvedSurfaceClean("resolveUnit M-08 OOO g6 action", ao);
    check("resolveUnit M-08 OOO g6 action ≠ goal", ao !== go);
  }
  {
    const u4g2 = makeM04InterveneUnit();
    const fb2 = resolveUnitParentActionHe(u4g2, "g2");
    check(
      "resolveUnit M-04 g2 flag on → engine fallback (null g1_g2 template)",
      fb2 != null && (String(fb2).includes("חלק כלל") || String(fb2).includes("עם/בלי שרטוט"))
    );
  }

  {
    const uc = makeM01InterveneUnit("compare");
    const ac = resolveUnitParentActionHe(uc, "g4");
    const gc = resolveUnitNextGoalHe(uc, "g4");
    check("resolveUnit M-01 compare g4 action present", !!ac);
    assertM01ResolvedNoInternalHe(ac, "M-01 compare action");
    assertM01ResolvedNoInternalHe(gc, "M-01 compare goal");
    check("resolveUnit M-01 compare g4 action ≠ goal", ac !== gc);
  }
  {
    const un = makeM01InterveneUnit("number_sense");
    const an = resolveUnitParentActionHe(un, "g4");
    const gn = resolveUnitNextGoalHe(un, "g4");
    check("resolveUnit M-01 number_sense g4 action present", !!an);
    assertM01ResolvedNoInternalHe(an, "M-01 number_sense action");
    assertM01ResolvedNoInternalHe(gn, "M-01 number_sense goal");
    check("resolveUnit M-01 number_sense g4 action ≠ goal", an !== gn);
  }
  {
    const ue = makeM01InterveneUnit("estimation");
    const ae = resolveUnitParentActionHe(ue, "g4");
    const ge = resolveUnitNextGoalHe(ue, "g4");
    check("resolveUnit M-01 estimation g4 action present", !!ae);
    assertM01ResolvedNoInternalHe(ae, "M-01 estimation action");
    assertM01ResolvedNoInternalHe(ge, "M-01 estimation goal");
    check("resolveUnit M-01 estimation g4 action ≠ goal", ae !== ge);
  }
  {
    const us = makeM01InterveneUnit("scale");
    const fs = resolveUnitParentActionHe(us, "g4");
    check("M-01 scale bucket template via resolveUnit", fs != null && !String(fs).includes("מניפולציה"));
  }
  {
    const uz = makeM01InterveneUnit("zero_one_properties");
    const fz = resolveUnitParentActionHe(uz, "g4");
    check("M-01 zero_one_properties bucket template via resolveUnit", fz != null && !String(fz).includes("מניפולציה"));
  }

}

// --- Detailed report slice: short + detailed paths ---
{

  const topicRowKey = "subtraction\u0001learning\u0001g4\u0001easy";
  const baseReport = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicRowKey]: {
        bucketKey: "subtraction",
        displayName: "חיסור",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey: "g4",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicRowKey}`,
          subjectId: "math",
          topicRowKey,
          bucketKey: "subtraction",
          displayName: "חיסור",
          diagnosis: { allowed: true, taxonomyId: "M-09", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "ציר + סימבולי",
            shortPracticeHe: "ציר + מרחק",
            taxonomyId: "M-09",
          },
          taxonomy: {
            id: "M-09",
            patternHe: "דפוס",
            topicHe: "חיסור",
            subskillHe: "חיסור",
          },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
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
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_test",
            stateHash: "h1",
          },
        },
      ],
    },
  };

  const detailed = buildDetailedParentReportFromBaseReport(baseReport, { period: "week" });
  const mathProfile = detailed?.subjectProfiles?.find((p) => p.subject === "math");
  const pa = String(mathProfile?.parentActionHe || "");
  const ng = String(mathProfile?.nextWeekGoalHe || "");
  check("detailed math parentActionHe no engine ציר phrases", !pa.includes("ציר + סימבולי") && !pa.includes("ציר + מרחק"));
  check("detailed math nextWeekGoalHe no engine ציר phrases", !ng.includes("ציר + סימבולי") && !ng.includes("ציר + מרחק"));

  const pd = detailed?.patternDiagnostics?.subjects?.math;
  const cardRec = Array.isArray(pd?.diagnosticCards)
    ? String(pd.diagnosticCards[0]?.recommendationHe || "")
    : "";
  if (pd?.diagnosticCards?.length) {
    check("diagnostic card recommendationHe no ציר when M-09 g4", !cardRec.includes("ציר + סימבולי"));
  }

  const short = summarizeV2UnitsForSubjectForTests(baseReport.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseReport.mathOperations,
    reportTotalQuestions: 20,
  });
  const sd = String(short.subjectDoNowHe || "");
  const spa = String(short.parentActionHe || "");
  const sng = String(short.nextWeekGoalHe || "");
  check("short subjectDoNowHe no engine ציר phrases", !sd.includes("ציר + סימבולי") && !sd.includes("ציר + מרחק"));
  check("short parentActionHe no engine ציר phrases", !spa.includes("ציר + סימבולי") && !spa.includes("ציר + מרחק"));
  check("short nextWeekGoalHe no engine ציר phrases", !sng.includes("ציר + סימבולי") && !sng.includes("ציר + מרחק"));

}

// --- M-06 decimals slice: short + detailed + internal phrase ban ---
{

  const topicRowKey6 = "decimals\u0001learning\u0001g4\u0001easy";
  const baseReport6 = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicRowKey6]: {
        bucketKey: "decimals",
        displayName: "עשרוניות",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey: "g4",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicRowKey6}`,
          subjectId: "math",
          topicRowKey: topicRowKey6,
          bucketKey: "decimals",
          displayName: "עשרוניות",
          diagnosis: { allowed: true, taxonomyId: "M-06", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "צביעת עמדות",
            shortPracticeHe: "עם/בלי טבלת עמדות",
            taxonomyId: "M-06",
          },
          taxonomy: {
            id: "M-06",
            patternHe: "דפוס",
            topicHe: "מקום",
            subskillHe: "עיגול/השוואה",
          },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
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
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_m06",
            stateHash: "h1",
          },
        },
      ],
    },
  };

  const detailed6 = buildDetailedParentReportFromBaseReport(baseReport6, { period: "week" });
  const math6 = detailed6?.subjectProfiles?.find((p) => p.subject === "math");
  const pa6 = String(math6?.parentActionHe || "");
  const ng6 = String(math6?.nextWeekGoalHe || "");
  assertM06ParentSurfaceNoInternalHe(pa6);
  assertM06ParentSurfaceNoInternalHe(ng6);
  check("detailed M-06 parentActionHe matches template g3_g4", pa6.includes("עשרות") && pa6.includes("ערך הספרות"));
  check("detailed M-06 nextWeekGoalHe matches template g3_g4", ng6.includes("ערך מקום") && ng6.includes("סבירות"));

  const short6 = summarizeV2UnitsForSubjectForTests(baseReport6.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseReport6.mathOperations,
    reportTotalQuestions: 20,
  });
  assertM06ParentSurfaceNoInternalHe(short6.parentActionHe);
  assertM06ParentSurfaceNoInternalHe(short6.nextWeekGoalHe);
  assertM06ParentSurfaceNoInternalHe(short6.recommendedHomeMethodHe);

}

// --- M-04/M-05 fractions: routing + detailed/short integration (Phase 2-B4) ---
{

  check(
    "fraction routing: comparison-heavy → M-04 first",
    JSON.stringify(
      orderFractionTaxonomyCandidates(
        ["M-04", "M-05"],
        [{ kind: "frac_compare_like_den_g4" }, { patternFamily: "numerator_only_trap" }],
        {}
      )
    ) === JSON.stringify(["M-04", "M-05"])
  );
  check(
    "fraction routing: operation-heavy → M-05 first",
    JSON.stringify(
      orderFractionTaxonomyCandidates(["M-04", "M-05"], [{ patternFamily: "fraction_same_denominator_add_sub" }], {})
    ) === JSON.stringify(["M-05", "M-04"])
  );
  check(
    "fraction routing: ambiguous empty wrongs preserves default order",
    JSON.stringify(orderFractionTaxonomyCandidates(["M-04", "M-05"], [], {})) === JSON.stringify(["M-04", "M-05"])
  );

  const topicM04 = "fractions\u0001learning\u0001g4\u0001easy";
  const baseM04 = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicM04]: {
        bucketKey: "fractions",
        displayName: "שברים",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey: "g4",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicM04}`,
          subjectId: "math",
          topicRowKey: topicM04,
          bucketKey: "fractions",
          displayName: "שברים",
          diagnosis: { allowed: true, taxonomyId: "M-04", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "חלק כלל קונקרטי",
            shortPracticeHe: "עם/בלי שרטוט",
            taxonomyId: "M-04",
          },
          taxonomy: { id: "M-04", patternHe: "השוואה לפי מונה בלבד" },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
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
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_m04",
            stateHash: "h1",
          },
        },
      ],
    },
  };
  const detailedM04 = buildDetailedParentReportFromBaseReport(baseM04, { period: "week" });
  const mp04 = detailedM04?.subjectProfiles?.find((p) => p.subject === "math");
  check("integration M-04 g4 detailed parentActionHe", String(mp04?.parentActionHe || "") === M04_G34_ACTION);
  check("integration M-04 g4 detailed nextWeekGoalHe", String(mp04?.nextWeekGoalHe || "") === M04_G34_GOAL);
  assertFractionResolvedSurfaceClean("integration M-04 parentActionHe", mp04?.parentActionHe);
  const shortM04 = summarizeV2UnitsForSubjectForTests(baseM04.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseM04.mathOperations,
    reportTotalQuestions: 20,
  });
  check("integration M-04 g4 short parentActionHe", String(shortM04.parentActionHe || "") === M04_G34_ACTION);
  assertFractionResolvedSurfaceClean("integration M-04 short parentActionHe", shortM04.parentActionHe);

  const topicM05 = "fractions\u0001learning\u0001g5\u0001easy";
  const baseM05 = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicM05]: {
        bucketKey: "fractions",
        displayName: "שברים",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey: "g5",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicM05}`,
          subjectId: "math",
          topicRowKey: topicM05,
          bucketKey: "fractions",
          displayName: "שברים",
          diagnosis: { allowed: true, taxonomyId: "M-05", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "שלבים כתובים + דוגמה מקבילה",
            shortPracticeHe: "המראה 2,3,4",
            taxonomyId: "M-05",
          },
          taxonomy: { id: "M-05", patternHe: "טעות באותה שלב" },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
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
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_m05",
            stateHash: "h1",
          },
        },
      ],
    },
  };
  const detailedM05 = buildDetailedParentReportFromBaseReport(baseM05, { period: "week" });
  const mp05 = detailedM05?.subjectProfiles?.find((p) => p.subject === "math");
  check("integration M-05 g5 detailed parentActionHe", String(mp05?.parentActionHe || "") === M05_G56_ACTION);
  check("integration M-05 g5 detailed nextWeekGoalHe", String(mp05?.nextWeekGoalHe || "") === M05_G56_GOAL);
  assertFractionResolvedSurfaceClean("integration M-05 parentActionHe", mp05?.parentActionHe);

  const topicM04g2 = "fractions\u0001learning\u0001g2\u0001easy";
  const baseM04g2 = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicM04g2]: {
        bucketKey: "fractions",
        displayName: "שברים",
        questions: 10,
        correct: 6,
        wrong: 4,
        accuracy: 60,
        gradeKey: "g2",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicM04g2}`,
          subjectId: "math",
          topicRowKey: topicM04g2,
          bucketKey: "fractions",
          displayName: "שברים",
          diagnosis: { allowed: true, taxonomyId: "M-04", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "חלק כלל קונקרטי",
            shortPracticeHe: "עם/בלי שרטוט",
            taxonomyId: "M-04",
          },
          taxonomy: { id: "M-04", patternHe: "השוואה לפי מונה בלבד" },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
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
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_m04_g2",
            stateHash: "h2",
          },
        },
      ],
    },
  };
  const detailedM04g2 = buildDetailedParentReportFromBaseReport(baseM04g2, { period: "week" });
  check(
    "integration M-04 g2 builds (null g1_g2 template → fallback path)",
    detailedM04g2 != null && typeof detailedM04g2 === "object"
  );

}

// --- index exports ---
const indexSrc = readFileSync(join(__dirname, "../utils/parent-report-language/index.js"), "utf8");
check(
  "index exports grade-aware resolver",
  indexSrc.includes("resolveGradeAwareParentRecommendationHe")
);

if (failures > 0) {
  process.stderr.write(`\nparent-report-grade-aware-recommendation-selftest: ${failures} failure(s) / ${runs} checks\n`);
  process.exit(1);
}

process.stdout.write(`OK parent-report-grade-aware-recommendation-selftest (${runs} checks)\n`);
