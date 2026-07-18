import assert from "node:assert/strict";

async function importUtils(path) {
  const mod = await import(path);
  return mod.default && typeof mod.default === "object" ? mod.default : mod;
}

const {
  applyNarrativeContractToRecord,
  buildNarrativeContractV1,
  narrativeSectionTextHe,
  validateNarrativeContractV1,
} = await importUtils("../utils/contracts/narrative-contract-v1.js");
const { buildTopicRecommendationNarrative } = await importUtils("../utils/detailed-report-parent-letter-he.js");
const {
  topicFreshnessUnifiedLineHe,
  topicGatesEvidenceDecisionCompactLineHe,
  topicSupportFlowUnifiedLineHe,
} = await importUtils("../utils/parent-report-ui-explain-he.js");
const { buildTopicRecommendationRecord } = await importUtils("../utils/topic-next-step-engine.js");

function runNarrativeContractV1Selftest() {
  const lowSignal = buildNarrativeContractV1({
    subjectId: "math",
    topicKey: "fractions",
    displayName: "שברים",
    questions: 6,
    accuracy: 52,
    contractsV1: {
      decision: { decisionTier: 1, cannotConcludeYet: true, gateReadiness: "insufficient" },
      readiness: { readiness: "insufficient" },
      confidence: { confidenceBand: "low" },
      recommendation: { eligible: false, intensity: "RI2", forbiddenBecause: ["cannot_conclude_yet"] },
    },
  });
  const lowValidation = validateNarrativeContractV1(lowSignal);
  assert.equal(lowValidation.ok, true);
  assert.equal(lowSignal.wordingEnvelope, "WE0");
  assert.equal(lowSignal.hedgeLevel, "mandatory");
  assert.equal(lowSignal.recommendationIntensityCap, "RI0");
  assert.equal(lowSignal.textSlots.action, null);
  assert.ok(String(lowSignal.textSlots.uncertainty || "").includes("מוקדם"));

  const highSignal = buildNarrativeContractV1({
    subjectId: "math",
    topicKey: "multiplication",
    displayName: "כפל",
    questions: 22,
    accuracy: 93,
    contractsV1: {
      decision: { decisionTier: 4, cannotConcludeYet: false, gateReadiness: "ready" },
      readiness: { readiness: "ready" },
      confidence: { confidenceBand: "high" },
      recommendation: { eligible: true, intensity: "RI3", forbiddenBecause: [] },
    },
  });
  const highValidation = validateNarrativeContractV1(highSignal);
  assert.equal(highValidation.ok, true);
  assert.equal(highSignal.wordingEnvelope, "WE4");
  assert.equal(highSignal.hedgeLevel, "none");
  assert.equal(highSignal.recommendationIntensityCap, "RI3");
  assert.ok(String(highSignal.textSlots.action || "").includes("התקדמות"));

  const record = applyNarrativeContractToRecord(
    { topicRowKey: "multiplication", contractsV1: {} },
    highSignal,
    highValidation
  );
  assert.equal(record.contractsV1.narrative.contractVersion, "v1");
  assert.equal(record.contractsV1.narrativeValidation.ok, true);

  const tr = {
    displayName: "כפל",
    questions: 22,
    accuracy: 93,
    topicRowKey: "multiplication",
    recommendedParentActionHe: "להמשיך",
    contractsV1: { narrative: highSignal },
  };
  const narrative = buildTopicRecommendationNarrative(tr);
  assert.equal(narrative.snapshot, `${highSignal.textSlots.observation} ${highSignal.textSlots.interpretation}`);
  assert.equal(narrative.homeLine, highSignal.textSlots.action);
  assert.equal(narrative.cautionLineHe, "יש מספיק מידע על מצב הנושא, אבל אין מספיק פירוט כדי לזהות את תת המיומנות המדויקת.");

  const trLow = {
    displayName: "שברים",
    questions: 6,
    accuracy: 52,
    topicRowKey: "fractions",
    contractsV1: { narrative: lowSignal },
  };
  assert.equal(topicFreshnessUnifiedLineHe(trLow), lowSignal.textSlots.uncertainty);
  assert.equal(topicGatesEvidenceDecisionCompactLineHe(trLow), lowSignal.textSlots.interpretation);
  assert.equal(topicSupportFlowUnifiedLineHe(trLow), "");
  assert.equal(narrativeSectionTextHe("summary", lowSignal), lowSignal.textSlots.observation);

  // Integration path: buildTopicRecommendationRecord must carry full canonical contracts chain.
  const lowRec = buildTopicRecommendationRecord(
    "math",
    "fractions",
    {
      displayName: "שברים",
      questions: 5,
      accuracy: 50,
      wrong: 3,
      gradeKey: "g3",
      levelKey: "medium",
      contractsV1: {
        evidence: {
          anchorEventIds: ["row:math:fractions:q:5:acc:50"],
        },
      },
    },
    {},
    undefined,
    Date.now()
  );
  for (const rec of [lowRec]) {
    assert.ok(rec?.contractsV1?.evidence, "missing contractsV1.evidence");
    assert.ok(rec?.contractsV1?.decision, "missing contractsV1.decision");
    assert.ok(rec?.contractsV1?.readiness, "missing contractsV1.readiness");
    assert.ok(rec?.contractsV1?.confidence, "missing contractsV1.confidence");
    assert.ok(rec?.contractsV1?.recommendation, "missing contractsV1.recommendation");
    assert.ok(rec?.contractsV1?.narrative, "missing contractsV1.narrative");
    assert.equal(typeof rec.contractsV1.readiness.readiness, "string");
  }

  assert.equal(lowRec.contractsV1.narrative.wordingEnvelope, "WE0");

  const forcedHighFromChain = buildNarrativeContractV1({
    ...lowRec,
    contractsV1: {
      ...lowRec.contractsV1,
      decision: { ...lowRec.contractsV1.decision, decisionTier: 4, cannotConcludeYet: false },
      readiness: { ...lowRec.contractsV1.readiness, readiness: "ready" },
      confidence: { ...lowRec.contractsV1.confidence, confidenceBand: "high" },
      recommendation: {
        ...lowRec.contractsV1.recommendation,
        eligible: true,
        intensity: "RI3",
        forbiddenBecause: [],
      },
    },
  });
  assert.equal(forcedHighFromChain.wordingEnvelope, "WE4");

  console.log("narrative-contract-v1-selftest: ok");
}

runNarrativeContractV1Selftest();
