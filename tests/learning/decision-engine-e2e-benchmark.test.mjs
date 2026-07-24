/**
 * Real end-to-end decision-engine benchmark.
 *
 * docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 5,
 * closing BLOCKER-3 from docs/audits/DECISION-ENGINE-INDEPENDENT-CLAUDE-AUDIT-2026-07-24.md):
 * the previous "50 scenario" benchmark
 * (tests/learning/action-decision-contract-unit-p4.test.mjs, renamed from
 * decision-calibration-benchmark-p4.test.mjs) injects `canonicalState` /
 * `unifiedDecisionContext` as hand-written literals and never calls the real
 * evidence pipeline. It is a unit test of ActionDecisionContractV2's branch
 * logic, not a benchmark of real behavior.
 *
 * Every scenario below instead starts from REAL raw practice-answer evidence
 * (real question generators/banks via lib/learning/fixtures/taxonomy-real-runtime-fixtures.js,
 * loaded through tests/engine-decision-audit/p3-raw-evidence-harness.mjs) and
 * runs it through the actual production pipeline:
 *   raw independent practice answers
 *   -> mistake events (real classifyAnswerEvidence/classifyRealRuntimeScenario tagging)
 *   -> taxonomy (utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js)
 *   -> recurrence / canonical state (same DE2 run + utils/canonical-topic-state/decision-table.js)
 *   -> unified decision context (utils/learning-pattern-decision/build-unified-decision-context.js)
 *   -> ActionDecisionContractV2 (utils/action-decision-contract/action-decision-contract-v2.js)
 *   -> executor directive (lib/learning/action-decision-executor.js)
 *
 * No scenario hand-constructs a canonicalState/unifiedDecisionContext object.
 *
 * Coverage note (honest limitation): the shared raw-evidence harness only
 * generates WRONG-answer events by construction (rawEventsFromRealProducer
 * hardcodes isCorrect:false), so canonical states that require a real,
 * dominant CORRECT-answer history (`maintain`, `expand_cautiously` /
 * `advance_cautiously`, and `guided_to_independent_transition`'s
 * `engineDecision in {mastery_stable, partial_stable}` requirement) could not
 * be reliably reproduced from real generated evidence in the time available
 * for this closure pass. Those three actions remain verified by direct
 * source-code trace only (see the closure report's action map) — this file
 * does not claim end-to-end scenario coverage for them, and it does not
 * fabricate a shortcut to make it look otherwise.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { runP3RawRuleScenario } from "../engine-decision-audit/p3-raw-evidence-harness.mjs";
import { runDiagnosticEngineV2 } from "../../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js";
import { runDiagnosticEngineV3 } from "../../utils/diagnostic-engine-v3/run-diagnostic-engine-v3.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { REAL_RUNTIME_SCENARIOS, classifyRealRuntimeScenario } from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import {
  executeActionDecisionContractV2,
  isActionDecisionExpired,
} from "../../lib/learning/action-decision-executor.js";
import { validateActionDecisionContractV2 } from "../../utils/action-decision-contract/action-decision-contract-v2.js";

const START_MS = Date.UTC(2026, 6, 1);
const END_MS = Date.UTC(2026, 6, 31, 23, 59, 59, 999);

// ---------------------------------------------------------------------------
// Part A — real evidence through runP3RawRuleScenario (the same harness
// tests/learning/action-decision-subject-e2e-p4.test.mjs already uses for
// its 7 subject checks). Each entry documents the evidence shape and the
// REAL outcome the pipeline produced, verified by running it, not assumed.
// ---------------------------------------------------------------------------

const SCENARIOS = [
  {
    id: "single_wrong_no_escalation",
    category: "single incorrect answer, no intervention",
    ruleId: "M-01",
    options: { questions: 10, correct: 9, eventCount: 1 },
    expect: { action: "give_probe_questions", intensity: "RI0", intervention: false },
  },
  {
    id: "sparse_evidence",
    category: "sparse evidence",
    ruleId: "M-01",
    options: { questions: 3, correct: 1, eventCount: 2 },
    expect: { action: "give_probe_questions", intensity: "RI0", intervention: false },
  },
  {
    id: "cross_session_safe_subskill_subtraction",
    category: "real cross-session pattern -> safe subskill (subtraction, previously-flagged topic)",
    ruleId: "M-09",
    options: {},
    expect: { action: "targeted_practice", family: "subskill_reinforcement", intensity: "RI2", hasSubskill: true },
  },
  {
    id: "topic_level_only_division",
    category: "topic-level only (division, previously-flagged topic; must never claim a subskill)",
    ruleId: "M-13",
    options: {},
    expect: { action: "targeted_practice", family: "current_topic_reinforcement", hasSubskill: false },
  },
  {
    id: "topic_level_only_percentages",
    category: "topic-level only (percentages, previously-flagged topic)",
    ruleId: "M-17",
    options: {},
    expect: { action: "targeted_practice", family: "current_topic_reinforcement", hasSubskill: false },
  },
  {
    id: "topic_level_only_order_of_operations",
    category: "topic-level only (order_of_operations, previously-flagged topic)",
    ruleId: "M-20",
    options: {},
    expect: { action: "targeted_practice", family: "current_topic_reinforcement", hasSubskill: false },
  },
  {
    id: "above_grade_never_foundation",
    category: "above-grade content error must never become a foundation claim",
    ruleId: "M-01",
    options: { gradeRelation: "higher" },
    expect: { action: "monitor_before_escalation", intensity: "RI0", family: "monitoring" },
  },
  {
    id: "foundation_review_generic",
    category: "grade-level foundation fallback (no exact prerequisite registered)",
    ruleId: "M-01",
    options: { gradeRelation: "lower" },
    expect: { action: "strengthen_prerequisite", precision: "grade_foundation_area", entityType: "topic_foundation_area" },
  },
  {
    // science has a real registered curriculum skill id + real bank content
    // for sci_body_fact_recall, but no master page consumes
    // contentOverrideTarget for science yet (see
    // lib/learning/prerequisite-content-source.js's
    // EXACT_SKILL_CONSUMER_SUBJECTS) — so the contract must fall back
    // instead of claiming exact_skill (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md, round 4).
    id: "registered_prerequisite_without_runtime_consumer",
    category: "registered curriculum skill id, gated fallback (no wired runtime consumer)",
    ruleId: "S-01",
    options: { gradeRelation: "lower", prerequisiteSkillIds: ["sci_body_fact_recall"] },
    expect: { action: "strengthen_prerequisite", precision: "grade_foundation_area", entityType: "topic_foundation_area" },
  },
  {
    id: "guided_only_withheld",
    category: "guided-only evidence must never be treated as independent mastery",
    ruleId: "M-01",
    options: { guidedOnly: true },
    expect: { action: "collect_more_evidence", intervention: false },
  },
  {
    id: "timer_evidence_remove_timer",
    category: "real timing evidence -> remove_timer (never without timing evidence)",
    ruleId: "M-01",
    options: { riskFlags: { speedOnlyRisk: true }, responseMs: 1500 },
    expect: { action: "remove_timer", intensity: "RI1" },
  },
  {
    id: "environment_topic_level_safe",
    category: "environment topic (previously-flagged taxonomy mapping) — must stay topic-level unless a genuinely safe subskill match exists",
    ruleId: "S-07",
    options: {},
    expect: { action: "targeted_practice", topic: "environment" },
  },
  {
    id: "hasmonaeans_subskill",
    category: "hasmonaeans (previously-flagged topic), real cause/effect pattern",
    ruleId: "HI-03",
    options: { topicKeyOverride: "hasmonaeans" },
    expect: { action: "targeted_practice", family: "subskill_reinforcement", topic: "hasmonaeans" },
  },
  {
    id: "pythagoras_subskill",
    category: "geometry exact subskill fit (pythagoras)",
    ruleId: "G-09",
    options: {},
    expect: { action: "targeted_practice", family: "subskill_reinforcement", topic: "pythagoras" },
  },
];

for (const scenario of SCENARIOS) {
  test(`E2E benchmark: ${scenario.id} (${scenario.category})`, () => {
    const result = runP3RawRuleScenario(scenario.ruleId, scenario.options);
    const contract = result.actionDecisionContract;
    assert.ok(contract, `${scenario.id}: no ActionDecisionContractV2 produced`);
    const validation = validateActionDecisionContractV2(contract);
    assert.equal(validation.ok, true, `${scenario.id}: invalid contract shape: ${validation.errors.join(",")}`);

    if (scenario.expect.action) assert.equal(contract.action, scenario.expect.action, scenario.id);
    if (scenario.expect.intensity) assert.equal(contract.intensity, scenario.expect.intensity, scenario.id);
    if (scenario.expect.family) assert.equal(contract.family, scenario.expect.family, scenario.id);
    if (scenario.expect.topic) assert.equal(contract.target?.topic, scenario.expect.topic, scenario.id);
    if (scenario.expect.intervention === false) {
      assert.equal(contract.intervention, false, `${scenario.id}: must not be an intervention`);
    }
    if (scenario.expect.hasSubskill === true) {
      assert.ok(contract.target?.subskill, `${scenario.id}: expected a safe subskill target`);
      assert.ok(contract.target?.subskillId, `${scenario.id}: subskillId must be set alongside subskill`);
    }
    if (scenario.expect.hasSubskill === false) {
      assert.equal(contract.target?.subskill, null, `${scenario.id}: topic-level evidence must never claim a subskill`);
    }
    if (scenario.expect.precision) {
      assert.equal(
        contract.target?.prerequisiteDetail?.precision,
        scenario.expect.precision,
        scenario.id,
      );
    }
    if (scenario.expect.entityType) {
      assert.equal(
        contract.target?.prerequisiteDetail?.entityType,
        scenario.expect.entityType,
        scenario.id,
      );
    }

    // Full pipeline continuation: executor directive must be a real,
    // bounded, non-expired directive matching this exact contract.
    const directive = executeActionDecisionContractV2(contract, {
      subjectId: result.subjectId,
      topicKey: result.topicKey,
      levelKey: "medium",
      activitiesSinceDecision: 0,
      nowMs: Date.parse(contract.createdAt) + 1_000,
    });
    assert.equal(directive.active, true, `${scenario.id}: fresh contract must produce an active directive`);
    assert.equal(directive.action, contract.action, scenario.id);
  });
}

// ---------------------------------------------------------------------------
// Part B — random / mismatched evidence must never be misfiled into an
// unrelated topic's taxonomy row (wrong-topic rejection).
// ---------------------------------------------------------------------------

test("E2E benchmark: unrelated evidence does not falsely match a different rule's taxonomy row", () => {
  // Real geometry evidence (G-09 pythagoras) fed under the "subtraction" math
  // topic key. Distinct subjects + a topic key the geometry scenario's own
  // taxonomy rule does not map to must never produce a targeted claim for
  // "subtraction".
  const scenario = REAL_RUNTIME_SCENARIOS.find((item) => item.ruleId === "G-09");
  assert.ok(scenario, "fixture G-09 must exist");
  const evidence = classifyRealRuntimeScenario(scenario, true);
  const payload = scenario.loadPositive();
  const rawMistakes = Array.from({ length: 6 }, (_, index) => ({
    subject: "math",
    topic: "subtraction",
    bucketKey: "subtraction",
    grade: "g4",
    level: "medium",
    mode: "practice",
    isCorrect: false,
    userAnswer: payload.userAnswer,
    correctAnswer: payload.expectedAnswer,
    params: payload.params || payload.question?.params || {},
    answerEvidence: evidence,
    metadata: { metadataSource: "question_metadata_normalizer", answerEvidence: evidence },
    metadataPresent: true,
    responseMs: 12_000,
    timestamp: Date.UTC(2026, 6, 1 + (index % 3), 10, index),
    sessionId: `wrong-topic-session-${index % 2}`,
    questionLabel: `wrong-topic-${index}`,
  }));
  const topicRowKey = "subtractionpracticeg4medium";
  const row = {
    displayName: "subtraction",
    bucketKey: "subtraction",
    grade: "g4",
    level: "medium",
    questions: 6,
    correct: 0,
    wrong: 6,
    accuracy: 0,
    needsPractice: true,
    confidence01: 0.82,
    dataSufficiencyLevel: "strong",
    isEarlySignalOnly: false,
    modeKey: "practice",
    gradeKey: "g4",
    contentGradeKey: "g4",
    registeredGradeKey: "g4",
    gradeRelation: "same",
    trend: { accuracyDirection: "flat", confidence: 0.9, windows: {} },
    behaviorProfile: { dominantType: "knowledge_gap", signals: { hintRate: 0, hintKnownCount: 6 } },
    topicEngineRowSignals: { riskFlags: {} },
  };
  const maps = { math: { [topicRowKey]: row } };
  const rawMistakesBySubject = { math: rawMistakes };
  const de2 = runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs: START_MS, endMs: END_MS });
  const unit = de2.units[0] || null;
  // The geometry pythagoras evidence tag must NOT resolve to a taxonomy row
  // registered for math/subtraction.
  assert.notEqual(unit?.taxonomy?.id, "M-09", "mismatched-subject evidence must not match the subtraction rule");
});

// ---------------------------------------------------------------------------
// Part C — mode eligibility: guided / learning / book / step-by-step events
// must produce ZERO diagnostic evidence through the real DE2 pipeline (not a
// mocked substitute). Activity time itself is a separate, allowed concern —
// see Part 6 of the closure report for the parent-report time-only path.
// ---------------------------------------------------------------------------

function rawEventWithMode(mode, extra = {}) {
  return {
    subject: "math",
    topic: "addition",
    bucketKey: "addition",
    grade: "g4",
    level: "medium",
    mode,
    isCorrect: false,
    userAnswer: "wrong",
    correctAnswer: "right",
    params: {},
    metadataPresent: true,
    responseMs: 5000,
    timestamp: Date.UTC(2026, 6, 1),
    sessionId: "mode-exclusion-session",
    questionLabel: `mode-exclusion-${mode}`,
    ...extra,
  };
}

for (const [label, mode, extra] of [
  ["learning_mode", "learning", {}],
  ["guided_practice_mode", "guided_practice", {}],
  ["learning_book_mode", "learning_book", {}],
  ["step_by_step", "practice", { afterStepByStep: true }],
]) {
  test(`E2E benchmark: ${label} produces 0 diagnostic evidence (real DE2 run)`, () => {
    const topicRowKey = "addition" + mode + "g4medium";
    const row = {
      displayName: "addition",
      bucketKey: "addition",
      grade: "g4",
      level: "medium",
      questions: 8,
      correct: 0,
      wrong: 8,
      accuracy: 0,
      needsPractice: true,
      confidence01: 0.82,
      dataSufficiencyLevel: "strong",
      isEarlySignalOnly: false,
      modeKey: mode,
      gradeKey: "g4",
      contentGradeKey: "g4",
      registeredGradeKey: "g4",
      gradeRelation: "same",
      trend: { accuracyDirection: "flat", confidence: 0.9, windows: {} },
      behaviorProfile: { dominantType: "knowledge_gap", signals: { hintRate: 0, hintKnownCount: 8 } },
      topicEngineRowSignals: { riskFlags: {} },
    };
    const rawMistakes = Array.from({ length: 8 }, (_, index) => rawEventWithMode(mode, extra));
    const maps = { math: { [topicRowKey]: row } };
    const rawMistakesBySubject = { math: rawMistakes };
    const de2 = runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs: START_MS, endMs: END_MS });
    const unit = de2.units[0] || null;
    assert.equal(
      unit?.recurrence?.eligibleCount ?? 0,
      0,
      `${label}: excluded-mode evidence must contribute 0 eligible recurrence count`,
    );
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey,
      row,
      unit,
      rawMistakes,
      startMs: START_MS,
      endMs: END_MS,
    });
    const contract = lpd.engineDecisionContract?.actionDecisionContract || null;
    if (contract) {
      assert.equal(contract.intervention, false, `${label}: must never authorize an intervention`);
    }
  });
}

// ---------------------------------------------------------------------------
// Part D — executor lifecycle on a REAL produced contract: expiry, rollback
// payload, and fail-safe behavior on a malformed/missing contract.
// ---------------------------------------------------------------------------

test("E2E benchmark: expiry — a real intervention contract stops applying once its budget is exhausted", () => {
  const result = runP3RawRuleScenario("M-09");
  const contract = result.actionDecisionContract;
  assert.ok(contract?.eligible, "fixture must produce an eligible intervention contract");
  const activeDirective = executeActionDecisionContractV2(contract, {
    subjectId: result.subjectId,
    topicKey: result.topicKey,
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1_000,
  });
  assert.equal(activeDirective.active, true);

  const afterActivities = Number(contract.expiry?.afterActivities || 0);
  assert.ok(afterActivities > 0, "contract must declare a real reevaluation budget");
  const expiredByActivities = executeActionDecisionContractV2(contract, {
    subjectId: result.subjectId,
    topicKey: result.topicKey,
    levelKey: "medium",
    activitiesSinceDecision: afterActivities,
    nowMs: Date.parse(contract.createdAt) + 1_000,
  });
  assert.equal(expiredByActivities.active, false, "must go inactive once the activity budget is exhausted");
  assert.equal(expiredByActivities.action, "none");
  assert.ok(expiredByActivities.rollback, "expired directive must carry a rollback payload");
  assert.equal(expiredByActivities.rollback.behavior, contract.rollbackBehavior);

  const expiredByTime = executeActionDecisionContractV2(contract, {
    subjectId: result.subjectId,
    topicKey: result.topicKey,
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.expiry.expiresAt) + 1_000,
  });
  assert.equal(expiredByTime.active, false, "must go inactive once wall-clock expiry passes");
  assert.ok(isActionDecisionExpired(contract, { nowMs: Date.parse(contract.expiry.expiresAt) + 1, activitiesSinceDecision: 0 }));
});

test("E2E benchmark: fail-safe — missing/malformed contract never activates an adaptation", () => {
  const directiveForNull = executeActionDecisionContractV2(null, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
  });
  assert.equal(directiveForNull.active, false);
  assert.equal(directiveForNull.action, "none");

  const malformed = { action: "targeted_practice", eligible: true }; // missing expiry/target/etc.
  const validation = validateActionDecisionContractV2(malformed);
  assert.equal(validation.ok, false, "a malformed contract must fail validation, never be treated as authoritative");
});
