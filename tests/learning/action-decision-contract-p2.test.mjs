import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_CODES_V2,
  ACTIVE_INTERVENTION_ACTIONS_V2,
  LEGACY_ACTION_MAPPINGS_V2,
  UNSUPPORTED_LEGACY_ACTIONS_V2,
  buildActionDecisionContractV2,
  legacyRecommendedActionFromContractV2,
  validateActionDecisionContractV2,
} from "../../utils/action-decision-contract/action-decision-contract-v2.js";
import { normalizeRecommendationContract } from "../../utils/contracts/recommendation-contract-normalizer.js";
import {
  buildParentReportEngineDecisionContract,
} from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";

function canonical(actionState, intensityCap = "RI2", allowed = true) {
  return {
    actionState,
    recommendation: {
      allowed,
      intensityCap,
      reasonCodes: [`fixture:${actionState}`],
    },
  };
}

function context(overrides = {}) {
  const base = {
    evidenceEligibility: {
      unifiedConclusion: "supported",
      independent: true,
    },
    signals: {
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
    },
    reconciler: { reasonCodes: ["fixture:context"] },
  };
  return {
    ...base,
    ...overrides,
    evidenceEligibility: {
      ...base.evidenceEligibility,
      ...(overrides.evidenceEligibility || {}),
    },
    signals: {
      ...base.signals,
      ...(overrides.signals || {}),
    },
    reconciler: {
      ...base.reconciler,
      ...(overrides.reconciler || {}),
    },
  };
}

function build({
  actionState = "intervene",
  cap = "RI2",
  allowed = true,
  engineDecision = "clear_topic_gap",
  context: unifiedDecisionContext = context(),
  questions = 12,
  decisionTimestamp = Date.UTC(2026, 3, 10, 12, 0, 0),
} = {}) {
  return buildActionDecisionContractV2({
    subjectId: "math",
    topicKey: "subtraction",
    engineDecision,
    metrics: { questions, accuracy: 45, wrong: 7 },
    canonicalState: canonical(actionState, cap, allowed),
    unifiedDecisionContext,
    decisionTimestamp,
  });
}

function assertValid(contract) {
  const validation = validateActionDecisionContractV2(contract);
  assert.deepEqual(validation, { ok: true, errors: [] });
  assert.equal(contract.authorityTrace.soleAuthority, "canonicalState");
  assert.ok(contract.reasonCodes.length > 0);
  assert.ok(contract.target);
}

const reachable = [
  {
    action: "collect_more_evidence",
    input: { actionState: "withhold", cap: "RI0", allowed: false },
  },
  {
    action: "give_probe_questions",
    input: { actionState: "probe_only", cap: "RI0", allowed: false },
  },
  { action: "practice_more", input: {} },
  {
    action: "targeted_practice",
    input: {
      context: context({
        signals: {
          subskill: {
            eligible: true,
            safe: true,
            candidate: { taxonomyId: "M-09", labelHe: "borrow-across-zero" },
          },
        },
      }),
    },
  },
  {
    action: "strengthen_prerequisite",
    input: {
      context: context({
        signals: {
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
        },
      }),
    },
  },
  {
    action: "remove_timer",
    input: {
      context: context({
        signals: {
          timing: { eligible: true, fastWrongCount: 3, medianWrongMs: 420 },
          riskFlags: { values: { speedOnlyRisk: true } },
        },
      }),
    },
  },
  {
    action: "reduce_reading_load",
    input: {
      context: context({
        signals: {
          v3: {
            eligible: true,
            recommendedNextStep: "reduce_reading_load",
            dominantErrorType: "reading_comprehension_issue",
          },
        },
      }),
    },
  },
  {
    action: "guided_to_independent_transition",
    input: {
      engineDecision: "partial_stable",
      context: context({
        evidenceEligibility: { independent: false },
        signals: {
          assistance: { eligible: true, evidenceMode: "guided" },
        },
      }),
    },
  },
  { action: "maintain", input: { actionState: "maintain", cap: "RI1" } },
  {
    action: "monitor_before_escalation",
    input: {
      context: context({
        signals: {
          trend: { eligible: true, direction: "improving" },
        },
      }),
    },
  },
  {
    action: "advance_cautiously",
    input: { actionState: "expand_cautiously", cap: "RI1" },
  },
];

test("P2 reachability: every active non-none action has a valid reachable contract", () => {
  const seen = new Set();
  for (const scenario of reachable) {
    const contract = build(scenario.input);
    assert.equal(contract.action, scenario.action);
    assertValid(contract);
    assert.equal(contract.eligible, true);
    seen.add(contract.action);
  }
  assert.deepEqual(
    [...seen].sort(),
    ACTION_CODES_V2.filter((action) => action !== "none").sort(),
  );
});

test("P2 pipeline reachability: EDC emits every active action through the authoritative contract", () => {
  const seen = new Set();
  for (const scenario of reachable) {
    const input = scenario.input;
    const accuracy =
      scenario.action === "guided_to_independent_transition" ? 80 : 45;
    const questions = 12;
    const correct = Math.round((questions * accuracy) / 100);
    const edc = buildParentReportEngineDecisionContract({
      subjectId: "math",
      topicRowKey: "subtraction",
      topicName: "Subtraction",
      row: {
        questions,
        correct,
        wrong: questions - correct,
        accuracy,
        modeKey: "practice",
      },
      unit: {
        subjectId: "math",
        bucketKey: "subtraction",
        canonicalState: canonical(
          input.actionState || "intervene",
          input.cap || "RI2",
          input.allowed ?? true,
        ),
      },
      unifiedDecisionContext: input.context || context(),
    });
    assert.equal(edc.actionDecisionContract.action, scenario.action);
    assertValid(edc.actionDecisionContract);
    seen.add(edc.actionDecisionContract.action);
  }
  assert.equal(seen.size, ACTION_CODES_V2.length - 1);
});

test("P2 exclusion: every active action has a scenario that excludes it", () => {
  const withhold = build({ actionState: "withhold", cap: "RI0", allowed: false });
  for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
    assert.notEqual(withhold.action, action);
    assert.ok(
      withhold.blockedAlternatives.some((item) => item.action === action),
      `missing exclusion trace for ${action}`,
    );
  }
});

test("P2 differential: random mistakes vs repeated known taxonomy", () => {
  const random = build();
  const repeated = build({
    context: context({
      signals: {
        pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
        sessions: { eligible: true, consistency: "cross_session" },
      },
    }),
  });
  assert.equal(random.action, "practice_more");
  assert.equal(repeated.action, "targeted_practice");
  assert.equal(repeated.family, "current_topic_reinforcement");
});

test("P2 differential: same-grade weakness vs below-grade foundation risk", () => {
  const same = build();
  const foundation = build({
    context: context({
      signals: {
        grade: {
          eligible: true,
          relation: "lower",
          foundationRisk: true,
          caveatNeeded: false,
          contentGradeKey: "g2",
        },
      },
    }),
  });
  assert.equal(same.action, "practice_more");
  assert.equal(foundation.action, "strengthen_prerequisite");
  assert.equal(foundation.target.prerequisite, "subtraction");
  assert.equal(
    foundation.target.prerequisiteDetail.precision,
    "grade_foundation_area",
  );
});

test("P2 differential: normal timing vs supported speed pressure", () => {
  const normal = build();
  const speed = build({
    context: context({
      signals: {
        timing: { eligible: true, fastWrongCount: 3, medianWrongMs: 380 },
        riskFlags: { values: { speedOnlyRisk: true } },
      },
    }),
  });
  assert.equal(normal.action, "practice_more");
  assert.equal(speed.action, "remove_timer");
});

test("P2 differential: blocked subskill vs safe subskill", () => {
  const blocked = build();
  const safe = build({
    context: context({
      signals: {
        subskill: {
          eligible: true,
          safe: true,
          candidate: { taxonomyId: "M-09", labelHe: "regrouping" },
        },
      },
    }),
  });
  assert.equal(blocked.target.subskill, null);
  assert.equal(safe.action, "targeted_practice");
  assert.equal(safe.family, "subskill_reinforcement");
  assert.equal(safe.target.subskill, "regrouping");
});

test("P2 differential: independent success vs guided success", () => {
  const independent = build({ engineDecision: "partial_stable" });
  const guided = build({
    engineDecision: "partial_stable",
    context: context({
      evidenceEligibility: { independent: false },
      signals: {
        assistance: { eligible: true, evidenceMode: "guided" },
      },
    }),
  });
  assert.equal(independent.action, "practice_more");
  assert.equal(guided.action, "guided_to_independent_transition");
});

test("P2 differential: improving vs declining", () => {
  const improving = build({
    context: context({
      signals: { trend: { eligible: true, direction: "improving" } },
    }),
  });
  const declining = build({
    context: context({
      signals: { trend: { eligible: true, direction: "declining" } },
    }),
  });
  assert.equal(improving.action, "monitor_before_escalation");
  assert.equal(declining.action, "practice_more");
  assert.ok(declining.reasonCodes.includes("action:declining_same_level_reinforcement"));
});

test("P2 differential: V3 practice-more vs strengthen-prerequisite", () => {
  const grade = {
    eligible: true,
    relation: "lower",
    foundationRisk: false,
    caveatNeeded: false,
    contentGradeKey: "g3",
  };
  const practice = build({
    context: context({
      signals: {
        grade,
        v3: { eligible: true, recommendedNextStep: "practice_more" },
      },
    }),
  });
  const prerequisite = build({
    context: context({
      signals: {
        grade,
        v3: { eligible: true, recommendedNextStep: "strengthen_prerequisite" },
      },
    }),
  });
  assert.equal(practice.action, "practice_more");
  assert.equal(prerequisite.action, "strengthen_prerequisite");
});

test("P2 differential: reading-load issue vs conceptual issue", () => {
  const commonPattern = {
    pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
    sessions: { eligible: true, consistency: "cross_session" },
  };
  const reading = build({
    context: context({
      signals: {
        ...commonPattern,
        v3: {
          eligible: true,
          recommendedNextStep: "reduce_reading_load",
          dominantErrorType: "reading_comprehension_issue",
        },
      },
    }),
  });
  const conceptual = build({
    context: context({
      signals: {
        ...commonPattern,
        v3: {
          eligible: true,
          recommendedNextStep: "practice_more",
          dominantErrorType: "conceptual_misunderstanding",
        },
      },
    }),
  });
  assert.equal(reading.action, "reduce_reading_load");
  assert.equal(conceptual.action, "targeted_practice");
});

test("P2 differential: single-session vs cross-session recurrence", () => {
  const pattern = { eligible: true, taxonomyMatched: true, recurrenceFull: true };
  const single = build({
    context: context({
      signals: {
        pattern,
        sessions: { eligible: true, consistency: "single_session" },
      },
    }),
  });
  const cross = build({
    context: context({
      signals: {
        pattern,
        sessions: { eligible: true, consistency: "cross_session" },
      },
    }),
  });
  assert.equal(single.action, "practice_more");
  assert.equal(cross.action, "targeted_practice");
});

test("P2 differential: canonical diagnose_only vs intervene", () => {
  const diagnose = build({ actionState: "diagnose_only" });
  const intervene = build({ actionState: "intervene" });
  assert.equal(diagnose.action, "give_probe_questions");
  assert.equal(diagnose.intensity, "RI0");
  assert.equal(intervene.action, "practice_more");
});

test("P2 differential: canonical maintain vs expand_cautiously", () => {
  const maintain = build({ actionState: "maintain", cap: "RI1" });
  const expand = build({ actionState: "expand_cautiously", cap: "RI1" });
  assert.equal(maintain.action, "maintain");
  assert.equal(expand.action, "advance_cautiously");
});

test("P2 differential: RI1 vs RI2 preserves family and action while changing intensity", () => {
  const ri1 = build({ cap: "RI1" });
  const ri2 = build({ cap: "RI2" });
  assert.equal(ri1.action, "practice_more");
  assert.equal(ri2.action, "practice_more");
  assert.equal(ri1.family, ri2.family);
  assert.equal(ri1.intensity, "RI1");
  assert.equal(ri2.intensity, "RI2");
});

test("P2 invariant: RI0 and allowed=false never produce intervention", () => {
  for (const input of [
    { actionState: "intervene", cap: "RI0", allowed: true },
    { actionState: "intervene", cap: "RI3", allowed: false },
    { actionState: "probe_only", cap: "RI0", allowed: false },
  ]) {
    const contract = build(input);
    assert.equal(contract.intervention, false);
    assert.equal(contract.intensity, "RI0");
  }
});

test("P2 invariant: unsafe/unknown taxonomy never creates a specific target", () => {
  const contract = build({
    context: context({
      signals: {
        pattern: { eligible: false, taxonomyMatched: false, recurrenceFull: true },
        subskill: {
          eligible: false,
          safe: false,
          candidate: { labelHe: "unsafe-specific-skill" },
        },
      },
    }),
  });
  assert.equal(contract.action, "practice_more");
  assert.equal(contract.target.subskill, null);
});

test("P2 invariant: prerequisite, speed, reading, and advancement require supporting evidence", () => {
  const generic = build();
  assert.notEqual(generic.action, "strengthen_prerequisite");
  assert.notEqual(generic.action, "remove_timer");
  assert.notEqual(generic.action, "reduce_reading_load");
  const guardedAdvance = build({
    actionState: "expand_cautiously",
    cap: "RI1",
    context: context({ evidenceEligibility: { independent: false } }),
  });
  assert.equal(guardedAdvance.action, "maintain");
  assert.ok(
    guardedAdvance.blockedAlternatives.some(
      (item) => item.action === "advance_cautiously",
    ),
  );
});

test("P2 invariant: selection is deterministic and evidence-order invariant", () => {
  const aContext = context({
    reconciler: { reasonCodes: ["pattern:a", "trend:b", "v3:c"] },
    signals: {
      pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
      sessions: { eligible: true, consistency: "cross_session" },
    },
  });
  const bContext = context({
    reconciler: { reasonCodes: ["v3:c", "pattern:a", "trend:b"] },
    signals: {
      pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
      sessions: { eligible: true, consistency: "cross_session" },
    },
  });
  const first = build({ context: aContext });
  const repeat = build({ context: aContext });
  const permuted = build({ context: bContext });
  assert.deepEqual(first, repeat);
  assert.deepEqual(
    {
      action: first.action,
      family: first.family,
      intensity: first.intensity,
      target: first.target,
    },
    {
      action: permuted.action,
      family: permuted.family,
      intensity: permuted.intensity,
      target: permuted.target,
    },
  );
});

test("P2 invariant: all legacy actions are explicitly mapped and adapter is one-way", () => {
  assert.ok(Object.keys(LEGACY_ACTION_MAPPINGS_V2).length >= 20);
  for (const mapped of Object.values(LEGACY_ACTION_MAPPINGS_V2)) {
    assert.ok(ACTION_CODES_V2.includes(mapped));
  }
  assert.equal(
    LEGACY_ACTION_MAPPINGS_V2.maintain_regular_strengthen_medium,
    "practice_more",
  );
  assert.equal(
    LEGACY_ACTION_MAPPINGS_V2.suggest_return_to_regular,
    "maintain",
  );
  assert.ok(
    Object.values(UNSUPPORTED_LEGACY_ACTIONS_V2).every((reason) =>
      reason.startsWith("unsupported:"),
    ),
  );
  assert.equal(
    Object.keys(UNSUPPORTED_LEGACY_ACTIONS_V2).some((action) =>
      Object.hasOwn(LEGACY_ACTION_MAPPINGS_V2, action),
    ),
    false,
  );
  const authoritative = build();
  assert.equal(legacyRecommendedActionFromContractV2(authoritative), "remediate_same_level");
});

test("P2 invariant: normalizer still cannot raise intensity", () => {
  const normalized = normalizeRecommendationContract(
    {
      eligible: true,
      intensity: "RI1",
      family: "general_practice",
      anchorEvidenceIds: ["e1"],
      forbiddenBecause: [],
    },
    "drop_one_level_topic_only",
  );
  assert.equal(normalized.intensity, "RI1");
});
