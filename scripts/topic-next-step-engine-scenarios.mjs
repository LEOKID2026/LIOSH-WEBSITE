/**
 * מטריצת תרחישי מנוע topic-next-step (ללא UI / ללא שינוי payload).
 * הרצה: npm run test:topic-next-step-engine-scenarios
 */
import assert from "node:assert/strict";
import {
  PARENT_REPORT_SCENARIOS,
  FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
} from "../tests/fixtures/parent-report-pipeline.mjs";

const END_MS = Date.UTC(2026, 3, 10, 23, 59, 59, 999);

const engMod = await import("../utils/topic-next-step-engine.js");
const {
  buildTopicRecommendationsForSubject,
  enrichReportMapsWithTopicStepHints,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG,
} =
  engMod.default && typeof engMod.default === "object" ? engMod.default : engMod;
const { runDiagnosticEngineV2 } = await import(
  "../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js"
);
const { runDiagnosticEngineV3 } = await import(
  "../utils/diagnostic-engine-v3/index.js"
);
const { applyLearningPatternDecisionToUnitsAndRows } = await import(
  "../utils/learning-pattern-decision/index.js"
);

/**
 * מפת תרחישי audit — כל שורה: תרחיש, נושא, בחירת שורה, ציפיות מבניות.
 * @typedef {{ subjectId: string, topicRowKey?: string, geometryKey?: string }} PickSpec
 * @typedef {{
 *   id: string
 *   scenario: keyof typeof PARENT_REPORT_SCENARIOS
 *   pick: PickSpec
 *   expect: Record<string, unknown>
 * }} MatrixRow
 */

/** @type {MatrixRow[]} */
const ENGINE_SCENARIO_MATRIX = [
  {
    id: "sparse",
    scenario: "all_sparse",
    pick: { subjectId: "math" },
    expect: { skipIfNoRow: true },
  },
  {
    id: "one_dominant",
    scenario: "one_dominant_subject",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "stable_excellence",
    scenario: "stable_excellence",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    // Fixture now sets an explicit behaviorProfile (dominantType: "stable_mastery")
    // matching the statistical profile. It still has no independent recurrence
    // or taxonomy evidence, so ADC V2 authorizes collection only and the legacy
    // display mirror must remain neutral.
    expect: {
      recommendedNextStep: "maintain_current_path",
      diagnosticType: "stable_mastery",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "fragile_success",
    scenario: "fragile_success",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "fragile_success",
      recommendedNextStep: "maintain_current_path",
      rootCauseNotIn: ["careless_execution"],
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "knowledge_gap",
    scenario: "knowledge_gap",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "knowledge_gap",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "careless_pattern",
    scenario: "careless_pattern",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "careless_pattern",
      rootCause: "careless_execution",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "instruction_friction",
    scenario: "instruction_friction",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "instruction_friction",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "speed_only",
    scenario: "speed_only_weakness",
    pick: { subjectId: "math" },
    expect: {
      diagnosticType: "speed_pressure",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "positive_trend_weak_indep",
    scenario: "positive_trend_weak_independence",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "undetermined",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "mixed_cross",
    scenario: "mixed_signals_cross_subjects",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "high_risk_strengths",
    scenario: "high_risk_despite_strengths",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      diagnosticType: "fragile_success",
      rootCauseNotIn: ["careless_execution", "mixed_signal"],
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "recent_transition",
    scenario: "recent_transition_recent_difficulty_increase",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "phase7_sparse",
    scenario: "phase7_cross_subject_sparse_mixed",
    pick: { subjectId: "math" },
    expect: {
      recommendedNextStep: "maintain_current_path",
      diagnosticType: "knowledge_gap",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
  {
    id: "phase7_geometry_fragile",
    scenario: "phase7_cross_subject_sparse_mixed",
    pick: { subjectId: "geometry", geometryKey: "perimeter\u0001learning" },
    expect: {
      diagnosticType: "fragile_success",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "perimeter",
    },
  },
  {
    id: "grade_level_mismatch",
    scenario: "grade_level_mismatch_math",
    pick: { subjectId: "math", topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED },
    expect: {
      forbiddenSteps: ["advance_grade_topic_only"],
      diagnosticType: "knowledge_gap",
      recommendedNextStep: "maintain_current_path",
      adcAction: "collect_more_evidence",
      adcIntensity: "RI0",
      targetTopic: "addition",
    },
  },
];

function pickRecommendation(base, pick) {
  const { subjectId, topicRowKey, geometryKey } = pick;
  const analysis = base.analysis || {};
  const maps = {
    math: base.mathOperations || {},
    geometry: base.geometryTopics || {},
  };
  const mistakesBySubject = {
    math: analysis.mathMistakesByOperation || {},
    geometry: analysis.geometryMistakesByTopic || {},
  };
  const rawMistakesBySubject = { math: [], geometry: [] };

  enrichReportMapsWithTopicStepHints(
    maps,
    mistakesBySubject,
    END_MS,
    DEFAULT_TOPIC_NEXT_STEP_CONFIG,
    { rawMistakesBySubject, startMs: 0 },
  );
  const diagnosticEngineV2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: 0,
    endMs: END_MS,
  });
  const diagnosticEngineV3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs: 0,
    endMs: END_MS,
    diagnosticEngineV2,
  });
  applyLearningPatternDecisionToUnitsAndRows({
    diagnosticEngineV2,
    maps,
    diagnosticEngineV3,
    rawMistakesBySubject,
    startMs: 0,
    endMs: END_MS,
  });

  const aKey =
    subjectId === "geometry"
      ? "geometryMistakesByTopic"
      : "mathMistakesByOperation";
  const recs = buildTopicRecommendationsForSubject(
    subjectId,
    maps[subjectId] || {},
    { [aKey]: mistakesBySubject[subjectId] || {} },
    DEFAULT_TOPIC_NEXT_STEP_CONFIG,
    END_MS,
  );
  if (!recs.length) return null;
  if (topicRowKey) {
    const hit = recs.find((r) => r.topicRowKey === topicRowKey);
    if (hit) return hit;
  }
  if (geometryKey) {
    const hit = recs.find((r) => r.topicRowKey === geometryKey);
    if (hit) return hit;
  }
  return recs[0];
}

function checkExpectation(expect, actualRec) {
  const failures = [];
  if (expect.skipIfNoRow && !actualRec) return { ok: true, failures: [] };
  if (!actualRec) {
    failures.push("missing recommendation row");
    return { ok: false, failures };
  }
  if (expect.recommendedNextStep != null && actualRec.recommendedNextStep !== expect.recommendedNextStep) {
    failures.push(`recommendedNextStep want ${expect.recommendedNextStep} got ${actualRec.recommendedNextStep}`);
  }
  if (expect.diagnosticType != null && actualRec.diagnosticType !== expect.diagnosticType) {
    failures.push(`diagnosticType want ${expect.diagnosticType} got ${actualRec.diagnosticType}`);
  }
  if (expect.rootCause != null && actualRec.rootCause !== expect.rootCause) {
    failures.push(`rootCause want ${expect.rootCause} got ${actualRec.rootCause}`);
  }
  if (Array.isArray(expect.rootCauseNotIn) && expect.rootCauseNotIn.includes(actualRec.rootCause)) {
    failures.push(`rootCause should not be ${actualRec.rootCause}`);
  }
  if (Array.isArray(expect.forbiddenSteps) && expect.forbiddenSteps.includes(actualRec.recommendedNextStep)) {
    failures.push(`forbidden step ${actualRec.recommendedNextStep}`);
  }
  if (
    expect.adcAction != null &&
    actualRec.actionDecisionContract?.action !== expect.adcAction
  ) {
    failures.push(
      `ADC action want ${expect.adcAction} got ${actualRec.actionDecisionContract?.action}`,
    );
  }
  if (
    expect.adcIntensity != null &&
    actualRec.actionDecisionContract?.intensity !== expect.adcIntensity
  ) {
    failures.push(
      `ADC intensity want ${expect.adcIntensity} got ${actualRec.actionDecisionContract?.intensity}`,
    );
  }
  if (
    expect.targetTopic != null &&
    actualRec.actionDecisionContract?.target?.topic !== expect.targetTopic
  ) {
    failures.push(
      `ADC target topic want ${expect.targetTopic} got ${actualRec.actionDecisionContract?.target?.topic}`,
    );
  }
  return { ok: failures.length === 0, failures };
}

function summarize(rec) {
  if (!rec) return null;
  return {
    recommendedNextStep: rec.recommendedNextStep,
    diagnosticType: rec.diagnosticType,
    rootCause: rec.rootCause,
    questions: rec.questions,
    accuracy: rec.accuracy,
    adcAction: rec.actionDecisionContract?.action || null,
    adcIntensity: rec.actionDecisionContract?.intensity || null,
    target: rec.actionDecisionContract?.target || null,
  };
}

const rows = [];
let pass = 0;
let fail = 0;

for (const m of ENGINE_SCENARIO_MATRIX) {
  const factory = PARENT_REPORT_SCENARIOS[m.scenario];
  assert.ok(typeof factory === "function", `missing scenario ${String(m.scenario)}`);
  const base = factory();
  const actualRec = pickRecommendation(base, m.pick);
  const actual = summarize(actualRec);
  const { ok, failures } = checkExpectation(m.expect, actualRec);
  if (ok) pass++;
  else fail++;
  rows.push({
    scenario: m.id,
    factory: m.scenario,
    expected: m.expect,
    actual,
    pass: ok,
    failures,
  });
}

for (const r of rows) {
  const status = r.pass ? "PASS" : "FAIL";
  console.log(
    `[${status}] ${r.scenario} (${r.factory})\n  expected: ${JSON.stringify(r.expected)}\n  actual:   ${JSON.stringify(r.actual)}\n  ${r.failures?.length ? r.failures.join("; ") : ""}`
  );
}

console.log(`\nSummary: ${pass} pass, ${fail} fail (total ${rows.length})`);
if (fail > 0) {
  process.exitCode = 1;
}
