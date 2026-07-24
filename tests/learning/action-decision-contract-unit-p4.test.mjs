/**
 * ADC V2 contract unit test — NOT an end-to-end benchmark.
 *
 * docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 5,
 * closing BLOCKER-3 from docs/audits/DECISION-ENGINE-INDEPENDENT-CLAUDE-AUDIT-2026-07-24.md):
 * every `canonical`/`ctx` object below is a hand-written literal injected
 * directly into `buildActionDecisionContractV2` — it does NOT start from raw
 * child answer data, and it does NOT call the real evidence pipeline
 * (utils/canonical-topic-state/decision-table.js /
 * utils/learning-pattern-decision/build-unified-decision-context.js). It is
 * a real, useful regression test of ActionDecisionContractV2's own branch
 * logic (last-mile action selection), kept as-is on purpose — but it must
 * not be cited as validating what a real student's evidence produces.
 *
 * For a genuine raw-evidence-to-executor-directive benchmark, see
 * tests/learning/decision-engine-e2e-benchmark.test.mjs.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActionDecisionContractV2,
  isInterventionActionV2,
  validateActionDecisionContractV2,
} from "../../utils/action-decision-contract/action-decision-contract-v2.js";
import {
  DECISION_CALIBRATION_ACTIONS_V1,
  DECISION_CALIBRATION_CONTRACT_V1,
  validateDecisionCalibrationContractV1,
} from "../../utils/action-decision-contract/decision-calibration-contract-v1.js";

const RI_RANK = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 };

function canonical(actionState, intensityCap = "RI2", allowed = true) {
  return {
    actionState,
    recommendation: {
      allowed,
      intensityCap,
      reasonCodes: [`benchmark:${actionState}`],
    },
  };
}

function context(signalOverrides = {}, eligibilityOverrides = {}) {
  const baseSignals = {
    trend: { eligible: true, direction: "stable" },
    timing: { eligible: false, fastWrongCount: 0, medianWrongMs: null },
    assistance: { eligible: true, evidenceMode: "independent" },
    grade: {
      eligible: true,
      relation: "same",
      foundationRisk: false,
      caveatNeeded: false,
      contentGradeKey: "g4",
    },
    pattern: {
      eligible: false,
      taxonomyMatched: false,
      recurrenceFull: false,
    },
    subskill: { eligible: false, safe: false, candidate: null },
    sessions: { eligible: true, consistency: "single_session" },
    v3: {
      eligible: true,
      contradictory: false,
      recommendedNextStep: "practice_more",
      dominantErrorType: "",
      prerequisiteSkill: null,
    },
    riskFlags: { values: {} },
  };
  return {
    evidenceEligibility: {
      unifiedConclusion: "supported",
      independent: true,
      ...eligibilityOverrides,
    },
    signals: { ...baseSignals, ...signalOverrides },
    reconciler: { reasonCodes: ["benchmark:calibrated"] },
  };
}

const PROFILES = {
  no_activity: {
    questions: 0,
    wrong: 0,
    canonical: canonical("withhold", "RI0", false),
    expected: ["none", false, "RI0", "action:no_practice_evidence"],
  },
  single_error: {
    questions: 1,
    wrong: 1,
    canonical: canonical("withhold", "RI0", false),
    expected: ["collect_more_evidence", true, "RI0", "action:withhold_collect_only"],
  },
  thin_evidence: {
    questions: 2,
    wrong: 1,
    canonical: canonical("probe_only", "RI0", false),
    expected: ["collect_more_evidence", true, "RI0", "action:thin_evidence_collect_more"],
  },
  probe_hypothesis: {
    questions: 4,
    wrong: 2,
    canonical: canonical("probe_only", "RI0", false),
    expected: ["give_probe_questions", true, "RI0", "action:canonical_probe_questions"],
  },
  diagnose_only: {
    questions: 6,
    wrong: 3,
    canonical: canonical("diagnose_only", "RI0", false),
    expected: ["give_probe_questions", true, "RI0", "action:diagnosis_requires_independent_verification"],
  },
  repeated_topic: {
    questions: 12,
    wrong: 7,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
      sessions: { eligible: true, consistency: "cross_session" },
    }),
    expected: ["targeted_practice", true, "RI2", "action:repeated_taxonomy_pattern_cross_session"],
  },
  safe_subskill: {
    questions: 12,
    wrong: 7,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      subskill: {
        eligible: true,
        safe: true,
        candidate: { taxonomyId: "M-09", labelHe: "borrow-across-zero" },
      },
    }),
    expected: ["targeted_practice", true, "RI2", "action:safe_subskill_target"],
  },
  unsafe_subskill: {
    questions: 12,
    wrong: 7,
    canonical: canonical("intervene", "RI2", true),
    expected: ["practice_more", true, "RI2", "action:topic_level_reinforcement"],
  },
  same_session_pattern: {
    questions: 12,
    wrong: 7,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
      sessions: { eligible: true, consistency: "single_session" },
    }),
    expected: ["practice_more", true, "RI2", "action:topic_level_reinforcement"],
  },
  improving: {
    questions: 12,
    wrong: 5,
    canonical: canonical("intervene", "RI3", true),
    ctx: context({
      trend: { eligible: true, direction: "improving" },
      pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
      sessions: { eligible: true, consistency: "cross_session" },
    }),
    expected: ["monitor_before_escalation", true, "RI0", "action:improving_reduce_to_monitoring"],
  },
  declining: {
    questions: 12,
    wrong: 7,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({ trend: { eligible: true, direction: "declining" } }),
    expected: ["practice_more", true, "RI2", "action:declining_same_level_reinforcement"],
  },
  guided_only_gap: {
    questions: 10,
    wrong: 5,
    canonical: canonical("intervene", "RI2", true),
    ctx: context(
      { assistance: { eligible: true, evidenceMode: "guided" } },
      { independent: false, unifiedConclusion: "guided_only" }
    ),
    expected: ["give_probe_questions", true, "RI0", "action:guided_only_requires_independent_verification"],
  },
  guided_success: {
    questions: 10,
    wrong: 2,
    engineDecision: "partial_stable",
    canonical: canonical("intervene", "RI2", true),
    ctx: context(
      { assistance: { eligible: true, evidenceMode: "guided" } },
      { independent: false, unifiedConclusion: "guided_only" }
    ),
    expected: ["guided_to_independent_transition", true, "RI1", "action:guided_success_requires_independence_transition"],
  },
  exact_prerequisite: {
    questions: 12,
    wrong: 8,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      grade: {
        eligible: true,
        relation: "lower",
        foundationRisk: true,
        caveatNeeded: false,
        contentGradeKey: "g2",
      },
      v3: {
        eligible: true,
        recommendedNextStep: "strengthen_prerequisite",
        prerequisiteSkill: "sci_body_fact_recall",
      },
    }),
    expected: ["strengthen_prerequisite", true, "RI2", "action:foundation_prerequisite_supported"],
  },
  grade_foundation: {
    questions: 12,
    wrong: 8,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      grade: {
        eligible: true,
        relation: "lower",
        foundationRisk: true,
        caveatNeeded: false,
        contentGradeKey: "g2",
      },
      v3: {
        eligible: true,
        recommendedNextStep: "strengthen_prerequisite",
        prerequisiteSkill: null,
      },
    }),
    expected: ["strengthen_prerequisite", true, "RI2", "action:foundation_prerequisite_supported"],
  },
  above_grade: {
    questions: 10,
    wrong: 6,
    canonical: canonical("intervene", "RI3", true),
    ctx: context({
      grade: {
        eligible: true,
        relation: "higher",
        foundationRisk: false,
        caveatNeeded: true,
        contentGradeKey: "g6",
      },
    }),
    expected: ["monitor_before_escalation", true, "RI0", "action:above_grade_mistake_monitor_only"],
  },
  timing_pressure: {
    questions: 10,
    wrong: 5,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      timing: { eligible: true, fastWrongCount: 4, medianWrongMs: 420 },
      riskFlags: { values: { speedOnlyRisk: true } },
    }),
    expected: ["remove_timer", true, "RI1", "action:supported_speed_pressure"],
  },
  slow_accurate: {
    questions: 10,
    wrong: 2,
    canonical: canonical("intervene", "RI1", true),
    ctx: context({
      timing: { eligible: true, fastWrongCount: 0, medianWrongMs: 18000 },
    }),
    expected: ["practice_more", true, "RI1", "action:topic_level_reinforcement"],
  },
  reading_load: {
    questions: 10,
    wrong: 5,
    canonical: canonical("intervene", "RI2", true),
    ctx: context({
      v3: {
        eligible: true,
        recommendedNextStep: "reduce_reading_load",
        dominantErrorType: "reading_comprehension_issue",
      },
    }),
    expected: ["reduce_reading_load", true, "RI1", "action:supported_reading_load_issue"],
  },
  no_reading_evidence: {
    questions: 10,
    wrong: 5,
    canonical: canonical("intervene", "RI2", true),
    expected: ["practice_more", true, "RI2", "action:topic_level_reinforcement"],
  },
  mastery: {
    questions: 14,
    wrong: 1,
    engineDecision: "mastery_stable",
    canonical: canonical("maintain", "RI0", true),
    expected: ["maintain", true, "RI0", "action:stable_mastery_maintain"],
  },
  advance: {
    questions: 14,
    wrong: 0,
    engineDecision: "mastery_stable",
    canonical: canonical("expand_cautiously", "RI1", true),
    expected: ["advance_cautiously", true, "RI1", "action:canonical_expand_independent_evidence"],
  },
  advance_guided_blocked: {
    questions: 14,
    wrong: 0,
    engineDecision: "mastery_stable",
    canonical: canonical("expand_cautiously", "RI1", true),
    ctx: context(
      { assistance: { eligible: true, evidenceMode: "guided" } },
      { independent: false }
    ),
    expected: ["maintain", true, "RI0", "action:advancement_guarded_to_maintain"],
  },
  contradictory_advance: {
    questions: 14,
    wrong: 0,
    engineDecision: "mastery_stable",
    canonical: canonical("expand_cautiously", "RI1", true),
    ctx: context({
      v3: { eligible: true, contradictory: true, recommendedNextStep: "maintain" },
    }),
    expected: ["maintain", true, "RI0", "action:advancement_guarded_to_maintain"],
  },
  mixed_uncertain: {
    questions: 5,
    wrong: 3,
    canonical: canonical("diagnose_only", "RI0", false),
    ctx: context({}, { unifiedConclusion: "conflicting", independent: false }),
    expected: ["give_probe_questions", true, "RI0", "action:diagnosis_requires_independent_verification"],
  },
};

const VARIANTS = [
  ["math", "g2", "subtraction"],
  ["geometry", "g6", "pythagoras"],
  ["english", "g1", "phonics"],
  ["hebrew", "g4", "reading"],
  ["science", "g3", "environment"],
  ["history", "g6", "hasmonaeans"],
  ["moledet-geography", "g5", "maps"],
];

const BENCHMARK = Object.entries(PROFILES).flatMap(([profileId, profile], index) =>
  [0, 1].map((variantIndex) => {
    const [subject, grade, topic] = VARIANTS[(index * 2 + variantIndex) % VARIANTS.length];
    const [action, authorization, maxIntensity, reason] = profile.expected;
    return {
      id: `${profileId}:${subject}:${grade}`,
      profileId,
      subject,
      grade,
      topic,
      profile,
      expected: {
        authorization,
        action,
        allowedAlternative:
          action === "practice_more" ? "give_probe_questions" : "monitor_before_escalation",
        forbiddenActions:
          action === "remove_timer"
            ? ["strengthen_prerequisite", "reduce_reading_load"]
            : action === "strengthen_prerequisite"
              ? ["remove_timer", "advance_cautiously"]
              : ["none"],
        maxIntensity,
        targetAccuracy: action === "maintain" || action === "advance_cautiously" ? 85 : 70,
        reason,
      },
    };
  })
);

test("P4 calibration contract defines all eleven temporary actions", () => {
  assert.deepEqual(validateDecisionCalibrationContractV1(), {
    ok: true,
    errors: [],
  });
  assert.equal(DECISION_CALIBRATION_CONTRACT_V1.authority.includes("ADC_V2"), true);
  assert.equal(Object.keys(DECISION_CALIBRATION_ACTIONS_V1).length, 11);
});

test("P4 contract unit test: fifty injected-canonical-state cases match authorization and RI caps (NOT a raw-evidence benchmark — see decision-engine-e2e-benchmark.test.mjs)", () => {
  assert.equal(BENCHMARK.length, 50);
  for (const scenario of BENCHMARK) {
    const p = scenario.profile;
    const contract = buildActionDecisionContractV2({
      subjectId: scenario.subject,
      topicKey: scenario.topic,
      engineDecision: p.engineDecision || "clear_topic_gap",
      metrics: {
        questions: p.questions,
        wrong: p.wrong,
        accuracy:
          p.questions > 0
            ? Math.round(((p.questions - p.wrong) / p.questions) * 100)
            : 0,
      },
      canonicalState: p.canonical,
      unifiedDecisionContext: p.ctx || context(),
      decisionTimestamp: Date.UTC(2026, 6, 24, 0, 0, 0),
    });
    assert.equal(contract.action, scenario.expected.action, scenario.id);
    assert.equal(contract.eligible, scenario.expected.authorization, scenario.id);
    assert.ok(
      RI_RANK[contract.intensity] <= RI_RANK[scenario.expected.maxIntensity],
      scenario.id
    );
    assert.ok(contract.reasonCodes.includes(scenario.expected.reason), scenario.id);
    assert.equal(validateActionDecisionContractV2(contract).ok, true, scenario.id);
    assert.ok(contract.expiry?.expiresAt, scenario.id);
    assert.ok(contract.reevaluation?.condition, scenario.id);
    assert.equal(contract.expiry.temporary, true, scenario.id);
    if (isInterventionActionV2(contract.action)) {
      assert.equal(contract.authorityTrace.interventionAuthorized, true, scenario.id);
    }
    for (const forbidden of scenario.expected.forbiddenActions) {
      if (forbidden !== "none") assert.notEqual(contract.action, forbidden, scenario.id);
    }
    if (
      contract.action === "strengthen_prerequisite" &&
      contract.target.prerequisiteDetail?.precision === "grade_foundation_area"
    ) {
      assert.notEqual(
        contract.target.prerequisiteDetail.entityType,
        "curriculum_skill",
        scenario.id
      );
    }
  }
});

test("P4 counterfactuals lower specificity when required evidence is removed", () => {
  const byProfile = (id) => BENCHMARK.find((scenario) => scenario.profileId === id);
  assert.equal(byProfile("repeated_topic").expected.action, "targeted_practice");
  assert.equal(byProfile("same_session_pattern").expected.action, "practice_more");
  assert.equal(byProfile("guided_only_gap").expected.action, "give_probe_questions");
  assert.equal(byProfile("improving").expected.action, "monitor_before_escalation");
  assert.equal(byProfile("above_grade").expected.action, "monitor_before_escalation");
  assert.equal(byProfile("no_reading_evidence").expected.action, "practice_more");
  assert.equal(byProfile("slow_accurate").expected.action, "practice_more");
});
