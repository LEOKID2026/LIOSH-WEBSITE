/**
 * Selftest: safe read-only usage of intelligenceV1 (truth packet, contract reader, decision guards, copilot tone).
 * Run: npm run test:intelligence-layer-v1-usage
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { DEFAULT_TOPIC_NEXT_STEP_CONFIG } = await import(
  pathToFileURL(join(ROOT, "utils", "topic-next-step-config.js")).href
);
const { getIntelligenceSignals } = await import(
  pathToFileURL(join(ROOT, "utils", "parent-copilot", "contract-reader.js")).href
);
const { composeAnswerDraft } = await import(
  pathToFileURL(join(ROOT, "utils", "parent-copilot", "answer-composer.js")).href
);
const { buildTruthPacketV1 } = await import(
  pathToFileURL(join(ROOT, "utils", "parent-copilot", "truth-packet-v1.js")).href
);
const { syntheticPayload } = await import(pathToFileURL(join(ROOT, "scripts", "parent-copilot-test-fixtures.mjs")).href);
const { buildTopicRecommendationRecord, decideTopicNextStep } = await import(
  pathToFileURL(join(ROOT, "utils", "topic-next-step-engine.js")).href
);
const { summarizeV2UnitsForSubjectForTests, v2PositiveStrengthBodyFromUnitForTests } = await import(
  pathToFileURL(join(ROOT, "utils", "parent-report-v2.js")).href
);
const { getIntelligencePriority } = await import(
  pathToFileURL(join(ROOT, "utils", "intelligence-layer-v1", "signal-priority.js")).href
);
const { pickUncertaintyReasonScript } = await import(
  pathToFileURL(join(ROOT, "utils", "parent-copilot", "parent-coaching-packs.js")).href
);
const { applyIntelligenceDecisionGuards } = await import(
  pathToFileURL(join(ROOT, "utils", "intelligence-layer-v1", "intelligence-decision-guards.js")).href
);
const { normalizeRecommendationContract } = await import(
  pathToFileURL(join(ROOT, "utils", "contracts", "recommendation-contract-normalizer.js")).href
);
const { assertContractMatchesStep } = await import(
  pathToFileURL(join(ROOT, "utils", "contracts", "assert-contract-step-consistency.js")).href
);
const { applyConsistencyGuards } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "consistency-engine.js")).href
);
const { applyDependencyGuards } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "dependency-engine.js")).href
);
const { attachFeedbackSignal } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "feedback-engine.js")).href
);
const { applyTimeDecisionGuards } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "time-decision-engine.js")).href
);
const { applyFeedbackDecisionGuards } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "feedback-decision-engine.js")).href
);
const { computeGlobalScore } = await import(
  pathToFileURL(join(ROOT, "utils", "system-intelligence", "global-score.js")).href
);

{
  const c = normalizeRecommendationContract({ intensity: "RI3", eligible: true }, "maintain_and_strengthen");
  assert.equal(c.intensity, "RI1");
}

{
  const c = normalizeRecommendationContract({ intensity: "RI1", eligible: true }, "advance_level");
  assert.equal(c.intensity, "RI3");
}

{
  assert.throws(() =>
    assertContractMatchesStep({ intensity: "RI1" }, "advance_level")
  );
}

{
  const res = applyConsistencyGuards([
    { topicKey: "a", recommendedNextStep: "advance_level" },
    { topicKey: "b", recommendedNextStep: "drop_one_level_topic_only" },
  ]);

  assert.equal(res[0].recommendedNextStep, "maintain_and_strengthen");
}

{
  const res = applyDependencyGuards([
    { topicKey: "fractions", recommendedNextStep: "advance_level" },
    { topicKey: "multiplication", recommendedNextStep: "drop_one_level_topic_only" },
  ]);

  assert.equal(res[0].recommendedNextStep, "maintain_and_strengthen");
}

{
  const res = attachFeedbackSignal([{ topicKey: "t1" }], {
    t1: [{ accuracy: 70 }, { accuracy: 80 }],
  });

  assert.equal(res[0]._feedback, "improved");
}

{
  const res = applyTimeDecisionGuards(
    [{ topicKey: "t1", recommendedNextStep: "advance_level" }],
    { t1: [{ accuracy: 90 }, { accuracy: 80 }, { accuracy: 70 }] }
  );

  assert.equal(res[0].recommendedNextStep, "maintain_and_strengthen");
}

{
  const res = applyFeedbackDecisionGuards([
    { topicKey: "t1", recommendedNextStep: "advance_level", _feedback: "worsened" },
  ]);

  assert.equal(res[0].recommendedNextStep, "maintain_and_strengthen");
}

{
  const g = computeGlobalScore([
    { recommendedNextStep: "advance_level" },
    { recommendedNextStep: "maintain_and_strengthen" },
  ]);

  assert.ok(g.score > 2);
}

{
  const r = applyIntelligenceDecisionGuards("advance_level", {
    intelligenceV1: { weaknessLevel: "stable", confidenceBand: "low", recurrence: false },
  });
  assert.equal(r.step, "maintain_and_strengthen");
  assert.ok(r.blockers.some((b) => b.id === "low_confidence_block"));
}

{
  const r = applyIntelligenceDecisionGuards("advance_level", {
    intelligenceV1: { weaknessLevel: "stable", confidenceBand: "high", recurrence: true },
  });
  assert.equal(r.step, "remediate_same_level");
  assert.ok(r.blockers.some((b) => b.id === "recurrence_block"));
}

{
  const r = applyIntelligenceDecisionGuards("remediate_same_level", {
    intelligenceV1: { weaknessLevel: "none", confidenceBand: "high", recurrence: false },
  });
  assert.equal(r.step, "maintain_and_strengthen");
  assert.ok(r.blockers.some((b) => b.id === "no_weakness_block"));
}

{
  const r = applyIntelligenceDecisionGuards("advance_level", {
    intelligenceV1: { weaknessLevel: "not_a_real_level", confidenceBand: "galaxy", recurrence: false },
  });
  assert.equal(r.step, "maintain_and_strengthen", "invalid weakness/confidence fall back to none/low then low blocks advance");
  assert.ok(r.applied);
}

{
  const sig = getIntelligenceSignals({
    intelligenceV1: {
      weakness: { level: "tentative" },
      confidence: { band: "medium" },
      patterns: { recurrenceFull: true },
    },
  });
  assert.equal(sig.weaknessLevel, "tentative");
  assert.equal(sig.confidenceBand, "medium");
  assert.equal(sig.recurrence, true);
}

{
  const truthPacket = {
    scopeType: "topic",
    interpretationScope: "recommendation",
    derivedLimits: {
      cannotConcludeYet: false,
      confidenceBand: "medium",
      recommendationEligible: true,
      recommendationIntensityCap: "RI3",
      readiness: "ready",
    },
    signals: {
      intelligenceV1: {
        weaknessLevel: "none",
        confidenceBand: "medium",
        recurrence: false,
        hasPattern: false,
      },
    },
    contracts: {
      narrative: {
        textSlots: {
          observation: "שורת תצפית לבדיקה.",
          interpretation: "שורת פרשנות לבדיקה.",
          action: "שורת פעולה לבדיקה.",
          uncertainty: "שורת הגבלה לבדיקה.",
        },
      },
    },
    allowedClaimEnvelope: { requiredHedges: [] },
  };
  const plan = {
    intent: "what_to_do_today",
    blockPlan: ["observation", "next_step", "uncertainty_reason"],
  };
  const draft = composeAnswerDraft(plan, truthPacket, { intent: "what_to_do_today" });
  assert.ok(!draft.answerBlocks.some((b) => b.type === "next_step"), "weakness none must skip contract next_step slot");
}

{
  const truthPacket = {
    scopeType: "topic",
    interpretationScope: "recommendation",
    derivedLimits: {
      cannotConcludeYet: false,
      confidenceBand: "high",
      recommendationEligible: true,
      recommendationIntensityCap: "RI3",
      readiness: "ready",
    },
    signals: {
      intelligenceV1: {
        weaknessLevel: "stable",
        confidenceBand: "low",
        recurrence: true,
        hasPattern: true,
      },
    },
    contracts: {
      narrative: {
        textSlots: {
          observation: "שורת תצפית לבדיקה.",
          interpretation: "שורת פרשנות לבדיקה.",
          action: "שורת פעולה לבדיקה.",
          uncertainty: "שורת הגבלה לבדיקה.",
        },
      },
    },
    allowedClaimEnvelope: { requiredHedges: [] },
  };
  const plan = {
    intent: "explain_report",
    blockPlan: ["uncertainty_reason"],
  };
  const draft = composeAnswerDraft(plan, truthPacket, { intent: "explain_report" });
  const u = draft.answerBlocks.find((b) => b.type === "uncertainty_reason");
  assert.ok(u, "uncertainty_reason block expected");
  // Verify the route directly: the composed reason must contain one of the actual
  // approved low-confidence script variants (rotation-safe — avoids hardcoding a
  // narrow keyword subset that only some of the approved variants happen to use).
  const approvedLowConfidenceScripts = [0, 1, 2, 3].map((ix) =>
    pickUncertaintyReasonScript({ confidenceBand: "low" }, "explain_report", ix)
  );
  assert.ok(
    approvedLowConfidenceScripts.some((script) => String(u.textHe || "").includes(script)),
    "iv1 low confidence must steer to one of the approved low-confidence uncertainty scripts"
  );
  assert.ok(draft.debug && typeof draft.debug.intelligenceV1 === "object");
}

/** Minimal row for topic-next-step-engine integration (matches phase2 harness shape). */
function rowAugTopicEngine(p) {
  const q = p.questions ?? 20;
  const acc = p.accuracy ?? 88;
  const wrong = p.wrong ?? Math.max(0, q - Math.round((q * acc) / 100));
  return {
    displayName: p.displayName || "נושא",
    bucketKey: p.bucketKey || "topic_a",
    modeKey: p.modeKey ?? "learning",
    questions: q,
    correct: q - wrong,
    wrong,
    accuracy: acc,
    gradeKey: p.gradeKey ?? "g3",
    levelKey: p.levelKey ?? "medium",
    grade: p.grade ?? "g3",
    level: p.level ?? "בינוני",
    recencyScore: p.recencyScore ?? 50,
    dataSufficiencyLevel: p.dataSufficiencyLevel ?? "strong",
    evidenceStrength: p.evidenceStrength ?? "strong",
    isEarlySignalOnly: p.isEarlySignalOnly ?? false,
    suppressAggressiveStep: p.suppressAggressiveStep ?? false,
    trend: p.trend ?? null,
    behaviorProfile: p.behaviorProfile ?? null,
    ...(p.extra || {}),
  };
}

{
  const row = rowAugTopicEngine({
    extra: {
      intelligenceV1: {
        weakness: { level: "tentative" },
        confidence: { band: "medium" },
        patterns: { recurrenceFull: false },
      },
    },
  });
  const rec = buildTopicRecommendationRecord("math", "t1", row, {}, DEFAULT_TOPIC_NEXT_STEP_CONFIG, Date.now(), null);
  const intel = rec.contractsV1?.intelligence;
  assert.ok(intel && typeof intel === "object");
  assert.equal(intel.weaknessLevel, "tentative");
  assert.equal(intel.confidenceBand, "medium");
  assert.equal(intel.recurrence, false);
  assert.equal(rec.contractsV1?.intelligenceSignals, undefined);
}

{
  const d = decideTopicNextStep(
    rowAugTopicEngine({
      extra: {
        intelligenceV1: {
          weakness: { level: "stable" },
          confidence: { band: "high" },
          patterns: { recurrenceFull: true },
        },
      },
    }),
    0,
    DEFAULT_TOPIC_NEXT_STEP_CONFIG
  );
  const st = (d.recommendationDecisionTrace || []).find((e) => e && e.phase === "structured_trace");
  assert.ok(st?.sections?.intelligenceV1);
  assert.equal(st.sections.intelligenceV1.weaknessLevel, "stable");
  assert.equal(st.sections.intelligenceV1.confidenceBand, "high");
  assert.equal(st.sections.intelligenceV1.recurrence, true);
  assert.equal(st.sections.intelligencePriority, 1);
  assert.equal(
    st.sections.intelligencePriority,
    getIntelligencePriority(st.sections.intelligenceV1)
  );
}

{
  const units = [
    {
      subjectId: "math",
      displayName: "A",
      intelligenceV1: {
        weakness: { level: "none" },
        confidence: { band: "low" },
        patterns: { recurrenceFull: true },
      },
    },
    {
      subjectId: "math",
      displayName: "B",
      intelligenceV1: {
        weakness: { level: "tentative" },
        confidence: { band: "high" },
        patterns: { recurrenceFull: false },
      },
    },
  ];
  const subj = summarizeV2UnitsForSubjectForTests(units);
  assert.equal(subj.intelligenceSummary.lowConfidenceCount, 1);
  assert.equal(subj.intelligenceSummary.noWeaknessCount, 1);
  assert.equal(subj.intelligenceSummary.recurrenceCount, 1);
}

{
  const emptySubj = summarizeV2UnitsForSubjectForTests([]);
  assert.deepEqual(emptySubj.intelligenceSummary, {
    lowConfidenceCount: 0,
    noWeaknessCount: 0,
    recurrenceCount: 0,
  });
}

{
  const body = v2PositiveStrengthBodyFromUnitForTests({
    evidenceTrace: [{ type: "volume", value: { questions: 12, accuracy: 90 } }],
  });
  assert.ok(String(body).includes("12") && String(body).includes("90"));
  assert.ok(!String(body).includes("ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא"));
}

{
  const payload = syntheticPayload();
  payload.diagnosticEngineV2 = {
    units: [
      {
        subjectId: "math",
        topicRowKey: "t1",
        intelligenceV1: {
          weakness: { level: "tentative" },
          confidence: { band: "medium" },
          patterns: { recurrenceFull: true },
        },
      },
    ],
  };
  const tp = buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: "t1",
    scopeLabel: "שברים",
    scopeClass: "recommendation",
  });
  assert.ok(tp);
  assert.equal("intelligenceV1" in (tp.derivedLimits || {}), false);
  assert.ok(tp.signals && typeof tp.signals.intelligenceV1 === "object");
  assert.equal(tp.signals.intelligenceV1.weaknessLevel, "tentative");
  assert.equal(tp.signals.intelligenceV1.recurrence, true, "diagnosticEngineV2 unit → signals.intelligenceV1 recurrence");
  assert.equal(
    Object.prototype.hasOwnProperty.call(tp, "debug"),
    false,
    "Phase 6-B/C: truthPacket from buildTruthPacketV1 must not expose debug (use signals.intelligenceV1)",
  );
}

{
  const rowBase = rowAugTopicEngine({ questions: 22, accuracy: 91, wrong: 1, dataSufficiencyLevel: "strong" });
  const recA = buildTopicRecommendationRecord("math", "topic_key_iv1", rowBase, {}, DEFAULT_TOPIC_NEXT_STEP_CONFIG, Date.now(), null);
  const recB = buildTopicRecommendationRecord(
    "math",
    "topic_key_iv1",
    {
      ...rowBase,
      intelligenceV1: {
        weakness: { level: "stable" },
        confidence: { band: "high" },
        patterns: { recurrenceFull: false },
      },
    },
    {},
    DEFAULT_TOPIC_NEXT_STEP_CONFIG,
    Date.now(),
    null
  );
  assert.equal(
    recA.recommendedNextStep,
    recB.recommendedNextStep,
    "intelligence decision guards must not change step when no guard applies (stable/high/no recurrence)"
  );
}

{
  assert.equal(getIntelligencePriority({ confidenceBand: "low", weaknessLevel: "none", recurrence: false }), 3);
  assert.equal(getIntelligencePriority({ confidenceBand: "high", weaknessLevel: "tentative", recurrence: true }), 2);
  assert.equal(getIntelligencePriority({ confidenceBand: "high", weaknessLevel: "stable", recurrence: true }), 1);
  assert.equal(getIntelligencePriority({ confidenceBand: "high", weaknessLevel: "stable", recurrence: false }), 0);
}

{
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const { buildResolvedParentCopilotResponse } = await import(
    pathToFileURL(join(ROOT, "utils", "parent-copilot", "render-adapter.js")).href
  );
  const r = buildResolvedParentCopilotResponse({
    truthPacket: {
      scopeType: "topic",
      scopeId: "x",
      scopeLabel: "lbl",
      debug: { intelligenceV1: { weaknessLevel: "none", confidenceBand: "low", recurrence: false } },
    },
    intent: "explain_report",
    answerBlocks: [
      { type: "observation", textHe: "שורה אחת לבדיקה.", source: "contract_slot" },
      { type: "meaning", textHe: "שורה שנייה לבדיקה.", source: "contract_slot" },
    ],
    suggestedFollowUp: null,
    validatorStatus: "pass",
    validatorFailCodes: [],
    fallbackUsed: false,
    contractSourcesUsed: ["contractsV1.narrative"],
    priorRepeated: 0,
    debug: { extra: true },
  });
  assert.equal("debug" in r, false);
  if (prev === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prev;
}

{
  const { buildResolvedParentCopilotResponse } = await import(
    pathToFileURL(join(ROOT, "utils", "parent-copilot", "render-adapter.js")).href
  );
  const r = buildResolvedParentCopilotResponse({
    truthPacket: {
      scopeType: "topic",
      scopeId: "y",
      scopeLabel: "lbl2",
      debug: { intelligenceV1: { weaknessLevel: "none", confidenceBand: "low", recurrence: false } },
    },
    intent: "explain_report",
    answerBlocks: [
      { type: "observation", textHe: "שורה אחת לבדיקה.", source: "contract_slot" },
      { type: "meaning", textHe: "שורה שנייה לבדיקה.", source: "contract_slot" },
    ],
    suggestedFollowUp: null,
    validatorStatus: "pass",
    validatorFailCodes: [],
    fallbackUsed: false,
    contractSourcesUsed: ["contractsV1.narrative"],
    priorRepeated: 0,
  });
  if (process.env.NODE_ENV !== "production") {
    assert.ok(r.debug && typeof r.debug === "object");
  }
}

console.log("PASS: intelligence-layer-v1-usage-selftest");
