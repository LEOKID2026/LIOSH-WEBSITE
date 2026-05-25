/**
 * M-10 parent-facing pattern label mapping — unit + report surface verify.
 * Run: npx tsx scripts/parent-report-m10-pattern-label-verify.mjs
 */

import assert from "node:assert/strict";

const M10_BANNED = "בחירת כפל לא מתאים לחילוק";

const [
  patternMod,
  detailedMod,
  parentReportV2Mod,
  truthMod,
  forbiddenMod,
] = await Promise.all([
  import("../utils/parent-report-language/parent-facing-pattern-label-he.js"),
  import("../utils/detailed-parent-report.js"),
  import("../utils/parent-report-v2.js"),
  import("../utils/parent-copilot/truth-packet-v1.js"),
  import("../utils/parent-report-language/forbidden-terms.js"),
]);

const {
  M10_ENGINE_PATTERN_HE,
  M10_PARENT_PATTERN_LABELS,
  parentFacingM10PatternLabelHe,
  parentFacingPatternLabelHe,
  parentFacingDiagnosisSnippetHe,
  findM10EnginePatternLeaksInValue,
} = patternMod;
const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests, buildDiagnosticCardsForSubjectForTests } = parentReportV2Mod;
const { buildTruthPacketV1 } = truthMod;
const { findReadabilityLeakSubstringsInString } = forbiddenMod;

function assertNoM10Leak(label, blob) {
  const hits = findM10EnginePatternLeaksInValue(blob);
  if (hits.length) {
    throw new Error(`${label}: M-10 engine pattern leaked at ${hits.join(", ")}`);
  }
  const text = typeof blob === "string" ? blob : JSON.stringify(blob);
  if (text.includes(M10_BANNED)) {
    throw new Error(`${label}: contains banned phrase "${M10_BANNED}"`);
  }
  const readability = findReadabilityLeakSubstringsInString(text);
  const m10Read = readability.filter((r) => r.includes(M10_BANNED));
  if (m10Read.length) {
    throw new Error(`${label}: readability guard hit ${m10Read.join("; ")}`);
  }
}

function buildM10Unit(bucketKey, topicRowKey, recurrenceFull = true) {
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `math::${topicRowKey}`,
    subjectId: "math",
    topicRowKey,
    bucketKey,
    displayName: bucketKey === "multiplication" ? "כפל" : bucketKey === "ratio" ? "יחס" : "חילוק",
    diagnosis: {
      allowed: true,
      taxonomyId: "M-10",
      lineHe: `מצביע על דפוס: ${M10_ENGINE_PATTERN_HE} (נקודת מיקוד: הופכיות) ב${bucketKey}.`,
    },
    intervention: {
      immediateActionHe: "עם/בלי משפט כפל",
      shortPracticeHe: "קישור כפל־חילוק",
      taxonomyId: "M-10",
    },
    taxonomy: {
      id: "M-10",
      patternHe: M10_ENGINE_PATTERN_HE,
      subskillHe: "הופכיות",
    },
    recurrence: { wrongCountForRules: 4, full: recurrenceFull, wrongEventCount: 4, rowWrongTotal: 4 },
    confidence: { level: recurrenceFull ? "moderate" : "low" },
    priority: { level: "P3", breadth: "narrow" },
    competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: !recurrenceFull,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    evidenceTrace: [{ type: "volume", value: { questions: 12, correct: 8, wrong: 4, accuracy: 67 } }],
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_m10_${bucketKey}`,
      stateHash: "h1",
    },
  };
}

function rowFor(topicRowKey, bucketKey, gradeKey) {
  return {
    bucketKey,
    displayName: bucketKey === "multiplication" ? "כפל" : bucketKey === "ratio" ? "יחס" : "חילוק",
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

// --- Direct mapper ---
{
  const divUnit = buildM10Unit("division", "division\u0001learning\u0001g4\u0001easy");
  assert.equal(parentFacingM10PatternLabelHe(divUnit), M10_PARENT_PATTERN_LABELS.divisionBuckets);
  assert.equal(parentFacingPatternLabelHe(divUnit), M10_PARENT_PATTERN_LABELS.divisionBuckets);

  const multUnit = buildM10Unit("multiplication", "multiplication\u0001learning\u0001g4\u0001easy");
  assert.equal(parentFacingM10PatternLabelHe(multUnit), M10_PARENT_PATTERN_LABELS.multiplication);

  const thinDiv = buildM10Unit("division", "division\u0001learning\u0001g4\u0001easy", false);
  assert.equal(parentFacingM10PatternLabelHe(thinDiv), M10_PARENT_PATTERN_LABELS.thinFallback);

  const diag = parentFacingDiagnosisSnippetHe(divUnit, divUnit.diagnosis.lineHe);
  assert.ok(!diag.includes(M10_BANNED), "diagnosis snippet must not leak engine M-10 label");
  assert.ok(diag.includes(M10_PARENT_PATTERN_LABELS.divisionBuckets));
}

// --- Report surfaces ---
for (const [bucketKey, gradeKey, topicRowKey] of [
  ["division", "g4", "division\u0001learning\u0001g4\u0001easy"],
  ["multiplication", "g4", "multiplication\u0001learning\u0001g4\u0001easy"],
  ["ratio", "g6", "ratio\u0001learning\u0001g6\u0001easy"],
]) {
  const unit = buildM10Unit(bucketKey, topicRowKey);
  const base = {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: { [topicRowKey]: rowFor(topicRowKey, bucketKey, gradeKey) },
    diagnosticEngineV2: { units: [unit] },
  };

  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const mathProfile = detailed?.subjectProfiles?.find((p) => p.subject === "math");
  assertNoM10Leak(`detailed ${bucketKey}`, detailed);
  assertNoM10Leak(`detailed ${bucketKey} math profile`, mathProfile);
  assert.ok(
    String(mathProfile?.summaryHe || "").includes(
      bucketKey === "multiplication"
        ? M10_PARENT_PATTERN_LABELS.multiplication
        : M10_PARENT_PATTERN_LABELS.divisionBuckets,
    ),
    `summaryHe for ${bucketKey}`,
  );

  const short = summarizeV2UnitsForSubjectForTests(base.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: base.mathOperations,
    reportTotalQuestions: 20,
  });
  assertNoM10Leak(`short ${bucketKey}`, short);

  const cards = buildDiagnosticCardsForSubjectForTests("math", base.diagnosticEngineV2.units, base.mathOperations);
  assertNoM10Leak(`diagnostic cards ${bucketKey}`, cards);

  const tp = buildTruthPacketV1(detailed, {
    scopeType: "topic",
    scopeId: topicRowKey,
    scopeLabel: bucketKey,
  });
  assertNoM10Leak(`truth packet ${bucketKey}`, tp);
}

process.stdout.write("OK parent-report-m10-pattern-label-verify\n");
