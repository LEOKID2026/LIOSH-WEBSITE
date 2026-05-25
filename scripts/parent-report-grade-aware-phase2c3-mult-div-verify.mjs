/**
 * Phase 2-C3 — M-03 / M-10 bucket templates: narrow product verify (detailed + short + truth-packet banned phrase scan).
 *   npx tsx scripts/parent-report-grade-aware-phase2c3-mult-div-verify.mjs
 */

import assert from "node:assert/strict";

const BANNED = [
  "אותם זוגות שגויים",
  "בחירת כפל לא מתאים לחילוק",
  "זמן כפול לאותו סט",
  "תרגול ממוקד זוג",
  "עם/בלי משפט כפל",
  "קישור כפל־חילוק",
];

const [templatesMod, detailedMod, parentReportV2Mod, truthMod] = await Promise.all([
  import("../utils/parent-report-language/grade-aware-recommendation-templates.js"),
  import("../utils/detailed-parent-report.js"),
  import("../utils/parent-report-v2.js"),
  import("../utils/parent-copilot/truth-packet-v1.js"),
]);

const M03 = templatesMod.GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-03"].bucketOverrides;
const M10 = templatesMod.GRADE_AWARE_RECOMMENDATION_TEMPLATES.math["M-10"].bucketOverrides;

const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests } = parentReportV2Mod;
const { buildTruthPacketV1 } = truthMod;

function assertEq(name, actual, expected) {
  const a = String(actual ?? "");
  const e = String(expected ?? "");
  if (a !== e) throw new Error(`${name} mismatch (${e.length} vs ${a.length} chars)`);
}

function assertNoBanned(label, blob) {
  const s = typeof blob === "string" ? blob : JSON.stringify(blob);
  for (const b of BANNED) {
    if (s.includes(b)) throw new Error(`${label} contains banned phrase: ${b}`);
  }
}

/**
 * @param {string} taxonomyId
 * @param {string} bucketKey
 * @param {string} topicRowKey
 */
function buildUnit(taxonomyId, bucketKey, topicRowKey) {
  const isM03 = taxonomyId === "M-03";
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `math::${topicRowKey}`,
    subjectId: "math",
    topicRowKey,
    bucketKey,
    displayName: "מתמטיקה",
    diagnosis: { allowed: true, taxonomyId, lineHe: "מצביע על דפוס." },
    intervention: {
      immediateActionHe: isM03 ? "תרגול ממוקד זוג" : "קישור כפל־חילוק",
      shortPracticeHe: isM03 ? "זמן כפול לאותו סט" : "עם/בלי משפט כפל",
      taxonomyId,
    },
    taxonomy: {
      id: taxonomyId,
      patternHe: isM03 ? "אותם זוגות שגויים" : "בחירת כפל לא מתאים לחילוק",
      topicHe: "כפל",
      subskillHe: "test",
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
      topicStateId: `ts_${taxonomyId}_${bucketKey}`,
      stateHash: "h1",
    },
  };
}

function rowFor(topicRowKey, bucketKey, gradeKey) {
  return {
    bucketKey,
    displayName: "מתמטיקה",
    questions: 12,
    correct: 8,
    wrong: 4,
    accuracy: 67,
    gradeKey,
    modeKey: "learning",
    levelKey: "easy",
    lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
  };
}

delete process.env.ENABLE_GRADE_AWARE_RECOMMENDATIONS;
delete process.env.NEXT_PUBLIC_ENABLE_GRADE_AWARE_RECOMMENDATIONS;

const tMult = "multiplication\u0001learning\u0001g4\u0001easy";
  const baseM03Mult = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: { [tMult]: rowFor(tMult, "multiplication", "g4") },
    diagnosticEngineV2: { units: [buildUnit("M-03", "multiplication", tMult)] },
  };
  const d1 = buildDetailedParentReportFromBaseReport(baseM03Mult, { period: "week" });
  const mp1 = d1?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("M-03 mult g4 action", mp1?.parentActionHe, M03.multiplication.g3_g4.actionTextHe);
  assertNoBanned("M-03 mult detailed", mp1?.parentActionHe);
  const tp1 = buildTruthPacketV1(d1, { scopeType: "topic", scopeId: tMult, scopeLabel: "כפל" });
  assertNoBanned("truth M-03 mult", JSON.stringify(tp1));

  const tPow = "powers\u0001learning\u0001g6\u0001easy";
  const baseM03Pow = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: { [tPow]: rowFor(tPow, "powers", "g6") },
    diagnosticEngineV2: { units: [buildUnit("M-03", "powers", tPow)] },
  };
  const d2 = buildDetailedParentReportFromBaseReport(baseM03Pow, { period: "week" });
  const mp2 = d2?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("M-03 powers g6 action", mp2?.parentActionHe, M03.powers.g5_g6.actionTextHe);
  assertNoBanned("M-03 powers detailed", mp2?.parentActionHe);

  const tDiv = "division\u0001learning\u0001g4\u0001easy";
  const baseM10Div = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: { [tDiv]: rowFor(tDiv, "division", "g4") },
    diagnosticEngineV2: { units: [buildUnit("M-10", "division", tDiv)] },
  };
  const d3 = buildDetailedParentReportFromBaseReport(baseM10Div, { period: "week" });
  const mp3 = d3?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("M-10 division g4 action", mp3?.parentActionHe, M10.division.g3_g4.actionTextHe);
  assertNoBanned("M-10 division detailed", mp3?.parentActionHe);
  assertNoBanned("M-10 division detailed full", d3);
  assertNoBanned("M-10 division math profile", mp3);
  const sh3 = summarizeV2UnitsForSubjectForTests(baseM10Div.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseM10Div.mathOperations,
    reportTotalQuestions: 20,
  });
  assertEq("M-10 division short action", sh3.parentActionHe, M10.division.g3_g4.actionTextHe);
  assertNoBanned("M-10 division short full", sh3);

  const tRat = "ratio\u0001learning\u0001g6\u0001easy";
  const baseM10Rat = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: { [tRat]: rowFor(tRat, "ratio", "g6") },
    diagnosticEngineV2: { units: [buildUnit("M-10", "ratio", tRat)] },
  };
  const d4 = buildDetailedParentReportFromBaseReport(baseM10Rat, { period: "week" });
  const mp4 = d4?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("M-10 ratio g6 action", mp4?.parentActionHe, M10.ratio.g5_g6.actionTextHe);
  assertEq("M-10 ratio g6 goal", mp4?.nextWeekGoalHe, M10.ratio.g5_g6.goalTextHe);
  assertNoBanned("M-10 ratio detailed action", mp4?.parentActionHe);
  assertNoBanned("M-10 ratio detailed full", d4);
  assertNoBanned("M-10 ratio math profile", mp4);
  const tp4 = buildTruthPacketV1(d4, { scopeType: "topic", scopeId: tRat, scopeLabel: "יחס" });
  assertNoBanned("truth M-10 ratio", JSON.stringify(tp4));

process.stdout.write("OK parent-report-grade-aware-phase2c3-mult-div-verify\n");
