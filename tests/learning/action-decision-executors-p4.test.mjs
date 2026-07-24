import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceActionDecisionExecutionState,
  executeActionDecisionContractV2,
} from "../../lib/learning/action-decision-executor.js";
import { buildParentSafeActionDecisionV1 } from "../../utils/action-decision-contract/parent-action-decision-translations-he.js";
import { projectActionDecisionContractV2ForApi } from "../../utils/action-decision-contract/public-action-decision-v2.js";
import { findStudentActionDecision } from "../../lib/learning-client/studentLearningProfileClient.js";
import {
  bindDiagnosticStateTestStore,
  DIAGNOSTIC_STATE_VERSION,
} from "../../lib/learning/diagnostic-state-persistence.js";
import {
  applyTopicEngineParentFacingInsights,
  buildParentFacingFromAdcV2,
} from "../../utils/parent-report-engine-insights-he.js";

function contract(action, overrides = {}) {
  return {
    version: "2.0.0",
    action,
    family: "monitoring",
    intensity: "RI0",
    eligible: true,
    intervention: false,
    target: { subject: "math", topic: "division", subskill: null, subskillId: null },
    deliveryMode: "standard",
    evidenceBasis: [{ source: "test", codes: ["safe"] }],
    reasonCodes: ["test:authorized"],
    blockedAlternatives: [],
    authorityTrace: {
      soleAuthority: "canonicalState",
      actionState: "maintain",
      intensityCap: "RI2",
      interventionAuthorized: true,
    },
    createdAt: "2026-07-24T00:00:00.000Z",
    expiry: {
      expiresAt: "2026-07-25T00:00:00.000Z",
      afterActivities: 4,
    },
    reevaluation: {
      condition: "new_independent_evidence_or_activity_limit",
      afterActivities: 4,
      onNewIndependentEvidence: true,
      transitionWhen: ["evidence_changes"],
    },
    evidenceSnapshot: { wrongEvents: 4, independentSessions: 2 },
    previousAction: null,
    rollbackBehavior: "return_to_standard_current_topic_path",
    ...overrides,
  };
}

const EXPECTED = {
  collect_more_evidence: (d) => d.sessionPolicy.allowEscalation === false,
  give_probe_questions: (d) => d.questionPolicy.mode === "independent_probe",
  practice_more: (d) => d.questionPolicy.additionalQuestions > 0,
  targeted_practice: (d) => d.questionPolicy.mode === "topic_focus",
  strengthen_prerequisite: (d) => d.routePolicy.level === "easy",
  remove_timer: (d) => d.sessionPolicy.timerEnabled === false,
  reduce_reading_load: (d) =>
    d.sessionPolicy.readingPresentation === "concise_chunked",
  guided_to_independent_transition: (d) => d.sessionPolicy.guidance === "guided",
  maintain: (d) => d.sessionPolicy.allowEscalation === false,
  monitor_before_escalation: (d) => d.sessionPolicy.allowEscalation === false,
  advance_cautiously: (d) =>
    d.routePolicy.level === "hard" &&
    d.routePolicy.maxAdvanceSteps === 1 &&
    d.sessionPolicy.allowEscalation === false,
};

test("P4 all eleven actions produce concrete bounded learning directives", () => {
  for (const [action, assertion] of Object.entries(EXPECTED)) {
    const input =
      action === "strengthen_prerequisite"
        ? contract(action, {
            target: {
              subject: "math",
              topic: "division",
              prerequisite: "grade-foundation:math:g4",
              prerequisiteDetail: { precision: "grade_foundation_area" },
            },
          })
        : contract(action);
    const directive = executeActionDecisionContractV2(input, {
      topicKey: "division",
      levelKey: "medium",
      nowMs: Date.parse("2026-07-24T01:00:00.000Z"),
    });
    assert.equal(directive.active, true, action);
    assert.equal(directive.topic, "division", action);
    assert.equal(assertion(directive), true, action);
  }
});

test("P4 expiry and activity limits rollback without leaving stale adaptation", () => {
  const input = contract("remove_timer");
  const state = advanceActionDecisionExecutionState(
    { activitiesSinceDecision: 3 },
    input,
    { nowMs: Date.parse("2026-07-24T02:00:00.000Z") },
  );
  assert.equal(state.reevaluationRequired, true);
  const directive = executeActionDecisionContractV2(input, {
    activitiesSinceDecision: state.activitiesSinceDecision,
    nowMs: Date.parse("2026-07-24T02:00:00.000Z"),
  });
  assert.equal(directive.active, false);
  assert.equal(directive.rollback.behavior, "return_to_standard_current_topic_path");
});

test("P4 public API projection is validated and omits internal fields", () => {
  const projected = projectActionDecisionContractV2ForApi(contract("maintain"));
  assert.equal(projected.contractVersion, "2.0.0");
  assert.equal(projected.action, "maintain");
  assert.equal(projected.authorityTrace.soleAuthority, "canonicalState");
  for (const key of [
    "contractVersion",
    "action",
    "family",
    "intensity",
    "eligible",
    "intervention",
    "target",
    "evidenceBasis",
    "reasonCodes",
    "authorityTrace",
    "expiry",
    "reevaluation",
  ]) {
    assert.equal(Object.hasOwn(projected, key), true, key);
  }
  assert.equal("blockedAlternatives" in projected, false);
  assert.equal("evidenceSnapshot" in projected, false);
});

test("P4 parent mapping exposes four-state safe copy without RI, taxonomy or raw reasons", () => {
  const parent = buildParentSafeActionDecisionV1(
    contract("targeted_practice", {
      target: {
        subject: "math",
        topic: "division",
        subskill: null,
        subskillId: null,
      },
    }),
    { topicLabel: "חילוק" },
  );
  assert.equal(parent.state, "strengthening_needed");
  const serialized = JSON.stringify(parent);
  assert.equal(serialized.includes("RI"), false);
  assert.equal(serialized.includes("test:authorized"), false);
  assert.equal(parent.target.subskill, null);
});

test("P4 all eleven actions map to approved parent states without redeciding", () => {
  const expected = {
    collect_more_evidence: "insufficient_information",
    give_probe_questions: "verification_needed",
    practice_more: "strengthening_needed",
    targeted_practice: "strengthening_needed",
    strengthen_prerequisite: "strengthening_needed",
    remove_timer: "strengthening_needed",
    reduce_reading_load: "strengthening_needed",
    guided_to_independent_transition: "strengthening_needed",
    maintain: "progress_or_mastery",
    monitor_before_escalation: "progress_or_mastery",
    advance_cautiously: "progress_or_mastery",
  };
  for (const [action, state] of Object.entries(expected)) {
    const parent = buildParentSafeActionDecisionV1(contract(action), {
      topicLabel: "חילוק",
    });
    assert.equal(parent.state, state, action);
    assert.equal(JSON.stringify(parent).includes("RI"), false, action);
  }
});

test("P4 client selection permits canonical aliases but never falls back across topics", () => {
  const response = {
    decisions: [
      { target: { subject: "english", topic: "phonics" }, action: "maintain" },
      { target: { subject: "math", topic: "division" }, action: "practice_more" },
    ],
  };
  assert.equal(
    findStudentActionDecision(response, "english", "listening")?.action,
    "maintain",
  );
  assert.equal(findStudentActionDecision(response, "math", "decimals"), null);
});

test("P4 active ADC lifecycle persists with diagnostic state across sessions", () => {
  const store = new Map();
  const persistence = bindDiagnosticStateTestStore(store);
  const ctx = {
    studentId: "student-1",
    subjectId: "math",
    gradeKey: "g4",
    levelKey: "medium",
    operationOrTopic: "division",
    activeActionDecision: {
      contract: contract("practice_more"),
      activitiesSinceDecision: 2,
    },
  };
  persistence.save(ctx);
  const loaded = persistence.load(ctx);
  assert.equal(loaded.v, DIAGNOSTIC_STATE_VERSION);
  assert.equal(
    loaded.activeActionDecision.decisionCreatedAt,
    "2026-07-24T00:00:00.000Z",
  );
  assert.equal("contract" in loaded.activeActionDecision, false);
  assert.equal(loaded.activeActionDecision.activitiesSinceDecision, 2);
});

test("P4 parent insights and home actions share the same ADC V2 authority", () => {
  const report = {
    mathOperations: {
      division: {
        displayName: "חילוק",
        questions: 12,
        correct: 5,
        wrong: 7,
        actionDecisionContract: contract("targeted_practice", {
          intervention: true,
          family: "current_topic_reinforcement",
          intensity: "RI2",
        }),
        topicEngineRowSignals: { diagnosticType: "knowledge_gap" },
      },
    },
    parentFacing: {
      insights: ["legacy insight"],
      homeRecommendations: ["legacy home"],
    },
  };
  const mapped = buildParentFacingFromAdcV2(report);
  assert.equal(mapped.parentState, "strengthening_needed");
  applyTopicEngineParentFacingInsights(report);
  assert.equal(report._parentFacingInsightsSource, "adc_v2");
  assert.equal(report._parentFacingHomeSource, "adc_v2");
  assert.notDeepEqual(report.parentFacing.insights, ["legacy insight"]);
  assert.notDeepEqual(report.parentFacing.homeRecommendations, ["legacy home"]);
  const exposed = JSON.stringify(report.parentFacing);
  assert.equal(exposed.includes("RI2"), false);
  assert.equal(exposed.includes("test:authorized"), false);
});

test("P4 expired parent decisions cannot keep an adaptation active", () => {
  const report = {
    mathOperations: {
      division: {
        displayName: "חילוק",
        questions: 12,
        correct: 5,
        wrong: 7,
        actionDecisionContract: contract("remove_timer", {
          createdAt: "2026-01-01T00:00:00.000Z",
          expiry: {
            expiresAt: "2026-01-02T00:00:00.000Z",
            afterActivities: 4,
          },
        }),
      },
    },
  };
  const mapped = buildParentFacingFromAdcV2(report);
  assert.equal(mapped.parentState, "insufficient_information");
  assert.match(mapped.insights[0], /אינה פעילה עוד/);
  assert.equal(mapped.homeRecommendations[0].includes("הסרת"), false);
});
