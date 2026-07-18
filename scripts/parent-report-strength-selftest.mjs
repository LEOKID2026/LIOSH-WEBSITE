/**
 * Fix 2 — Parent report confirmed-strengths selftest.
 * Proves that high-accuracy/high-volume topics reach readiness:"ready" and
 * produce WE3/WE4 wording envelopes, while low-data and struggle scenarios
 * remain cautious.
 *
 * Run: node scripts/parent-report-strength-selftest.mjs
 */
import assert from "node:assert/strict";

const {
  buildDecisionReadinessContractsBundleV1,
  buildReadinessContractV1,
} = await import("../utils/contracts/decision-readiness-contract-v1.js");

const { buildNarrativeContractV1 } = await import(
  "../utils/contracts/narrative-contract-v1.js"
);

const { buildTopicRecommendationRecord } = await import(
  "../utils/topic-next-step-engine.js"
);

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      actual:   ${JSON.stringify(actual)}`);
  }
}

function checkTrue(label, value) {
  if (value) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label} (expected truthy, got ${JSON.stringify(value)})`);
  }
}

function checkNot(label, actual, unexpected) {
  if (actual !== unexpected) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label} (expected NOT ${JSON.stringify(unexpected)}, got it anyway)`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: build a readiness contract from raw gate values
// ──────────────────────────────────────────────────────────────────────────────
function makeReadinessFromGates({ gateReadiness, gateState, cannotConcludeYet = false }) {
  return buildReadinessContractV1({
    topicKey: "test_topic",
    subjectId: "math",
    internalGateReadinessBand: gateReadiness,
    gateState,
    cannotConcludeYet,
  });
}

// Helper: build a full topic recommendation record for a synthetic row
function makeRec(row, subjectId = "math", topicKey = "addition") {
  return buildTopicRecommendationRecord(subjectId, topicKey, row, {});
}

// Helper: get wording envelope from recommendation record
function envelopeOf(rec) {
  return rec?.contractsV1?.narrative?.wordingEnvelope ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// UNIT TESTS: deriveReadinessState via buildReadinessContractV1
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Unit] deriveReadinessState");

{
  // gateReadiness:"high" must now return "ready" regardless of gateState
  const r1 = makeReadinessFromGates({ gateReadiness: "high", gateState: "gates_not_ready" });
  check("gateReadiness:high + gateState:gates_not_ready → ready", r1.readiness, "ready");

  const r2 = makeReadinessFromGates({ gateReadiness: "high", gateState: "continue_gate_active" });
  check("gateReadiness:high + gateState:continue_gate_active → ready", r2.readiness, "ready");

  const r3 = makeReadinessFromGates({ gateReadiness: "moderate", gateState: "gates_not_ready" });
  check("gateReadiness:moderate → emerging", r3.readiness, "emerging");

  const r4 = makeReadinessFromGates({ gateReadiness: "low", gateState: "gates_not_ready" });
  check("gateReadiness:low → emerging", r4.readiness, "emerging");

  const r5 = makeReadinessFromGates({ gateReadiness: "insufficient", gateState: "gates_not_ready" });
  check("gateReadiness:insufficient → insufficient", r5.readiness, "insufficient");

  const r6 = makeReadinessFromGates({
    gateReadiness: "high",
    gateState: "gates_not_ready",
    cannotConcludeYet: true,
  });
  check("cannotConcludeYet=true → always insufficient", r6.readiness, "insufficient");
}

// ──────────────────────────────────────────────────────────────────────────────
// UNIT TESTS: normalizeReadiness (narrative-contract-v1)
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Unit] normalizeReadiness via buildNarrativeContractV1");
{
  const makeNarrative = (readiness) =>
    buildNarrativeContractV1({
      topicKey: "t",
      subjectId: "math",
      questions: 20,
      accuracy: 90,
      displayName: "חיבור",
      contractsV1: {
        readiness: { readiness },
        confidence: { confidenceBand: "high" },
        decision: { decisionTier: 3, cannotConcludeYet: false },
        recommendation: { eligible: false, intensity: "RI0" },
      },
    });

  const ne = makeNarrative("emerging");
  checkNot("emerging normalizes to non-insufficient → not WE0", ne.wordingEnvelope, "WE0");

  const nr = makeNarrative("ready");
  check("ready normalizes to ready → WE3/WE4", ["WE3","WE4"].includes(nr.wordingEnvelope), true);

  const ni = makeNarrative("insufficient");
  check("insufficient stays insufficient → WE0", ni.wordingEnvelope, "WE0");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — 2 questions, 100% accuracy → insufficient data, WE0/WE1
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 1] 2 questions, 100%");
{
  const row = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 2,
    correct: 2,
    wrong: 0,
    accuracy: 100,
    modeKey: "learning",
    lastSessionMs: Date.now() - 24 * 3600 * 1000,
  };
  const rec = makeRec(row);
  const env = envelopeOf(rec);
  checkTrue("envelope is WE0 or WE1 for 2 questions", env === "WE0" || env === "WE1");
  checkNot("readiness is NOT 'ready' for 2 questions", rec.contractsV1?.readiness?.readiness, "ready");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — 7 questions, 86% accuracy → cautious, NOT full strength
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 2] 7 questions, 86%");
{
  const row = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 7,
    correct: 6,
    wrong: 1,
    accuracy: 86,
    modeKey: "learning",
    lastSessionMs: Date.now() - 24 * 3600 * 1000,
  };
  const rec = makeRec(row);
  const env = envelopeOf(rec);
  checkTrue("7q/86% envelope is WE0/WE1/WE2 (no WE3/WE4)", env === "WE0" || env === "WE1" || env === "WE2");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — 20 questions, 95%, single day (no multi-day guard check)
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 3] 20 questions, 95%, single day");
{
  const row = {
    bucketKey: "fractions",
    displayName: "שברים",
    questions: 20,
    correct: 19,
    wrong: 1,
    accuracy: 95,
    modeKey: "learning",
    lastSessionMs: Date.now() - 2 * 3600 * 1000,
  };
  const rec = makeRec(row, "math", "fractions");
  const env = envelopeOf(rec);
  // 20q, ev depends on dataSufficiencyLevel which may be medium — WE2 or WE3 are both acceptable
  checkTrue("20q/95% envelope is at least WE2", env === "WE2" || env === "WE3" || env === "WE4");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — 35 questions, 94%, strong evidence → WE3
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 4] 35 questions, 94%, strong evidence");
{
  const row = {
    bucketKey: "fractions",
    displayName: "שברים",
    questions: 35,
    correct: 33,
    wrong: 2,
    accuracy: 94,
    modeKey: "learning",
    lastSessionMs: Date.now() - 2 * 3600 * 1000,
  };
  const rec = makeRec(row, "math", "fractions");
  const env = envelopeOf(rec);
  checkTrue("35q/94% envelope is WE3 or WE4", env === "WE3" || env === "WE4");
  const confidenceBand = rec.contractsV1?.confidence?.confidenceBand;
  check("35q/94% confidenceBand is 'high'", confidenceBand, "high");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — cannotConcludeYet explicitly set → stays cautious
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 5] 30 questions, 93%, cannotConcludeYet=true");
{
  // Test directly via narrative contract with cannotConcludeYet
  const nc = buildNarrativeContractV1({
    topicKey: "fractions",
    subjectId: "math",
    questions: 30,
    accuracy: 93,
    displayName: "שברים",
    cannotConcludeYet: true,
    contractsV1: {
      readiness: { readiness: "ready" },
      confidence: { confidenceBand: "high" },
      decision: { decisionTier: 3, cannotConcludeYet: true },
      recommendation: { eligible: false, intensity: "RI0", forbiddenBecause: ["cannot_conclude_yet"] },
    },
  });
  checkTrue(
    "cannotConcludeYet=true → no WE3/WE4",
    nc.wordingEnvelope === "WE0" || nc.wordingEnvelope === "WE1" || nc.wordingEnvelope === "WE2"
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — struggle: 20 questions, 55% accuracy
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 6] Struggle: 20 questions, 55%");
{
  const row = {
    bucketKey: "fractions",
    displayName: "שברים",
    questions: 20,
    correct: 11,
    wrong: 9,
    accuracy: 55,
    dataSufficiencyLevel: "supported_diagnosis",
    evidenceStrength: "strong",
    modeKey: "learning",
    lastSessionMs: Date.now() - 2 * 3600 * 1000,
  };
  const rec = makeRec(row, "math", "fractions");
  const env = envelopeOf(rec);
  // Struggle scenario — must not show as strength
  checkTrue("struggle 55% → WE1 or WE2", env === "WE1" || env === "WE2");
  checkNot("struggle does not show WE3", env, "WE3");
  checkNot("struggle does not show WE4", env, "WE4");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — Strength topic A (35q/95%), Struggle topic B (15q/55%)
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 7] Strength A + Struggle B (no contradiction)");
{
  const rowA = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 35,
    correct: 33,
    wrong: 2,
    accuracy: 94,
    dataSufficiencyLevel: "supported_diagnosis",
    evidenceStrength: "strong",
    modeKey: "learning",
    lastSessionMs: Date.now() - 2 * 3600 * 1000,
  };
  const rowB = {
    bucketKey: "fractions",
    displayName: "שברים",
    questions: 15,
    correct: 8,
    wrong: 7,
    accuracy: 53,
    dataSufficiencyLevel: "supported_diagnosis",
    evidenceStrength: "strong",
    modeKey: "learning",
    lastSessionMs: Date.now() - 2 * 3600 * 1000,
  };
  const recA = makeRec(rowA, "math", "addition");
  const recB = makeRec(rowB, "math", "fractions");
  const envA = envelopeOf(recA);
  const envB = envelopeOf(recB);
  checkTrue("topic A strength → WE3/WE4", envA === "WE3" || envA === "WE4");
  checkTrue("topic B struggle → WE1/WE2", envB === "WE1" || envB === "WE2");
  // They must not contradict
  checkNot("topic B does not show WE3", envB, "WE3");
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — Subject not practiced (0 questions)
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n[Scenario 8] Subject not practiced (0 questions)");
{
  // buildTopicRecommendationRecord requires q > 0 to be called,
  // so test the contract directly
  const bundle = buildDecisionReadinessContractsBundleV1({
    topicKey: "addition",
    subjectId: "math",
    q: 0,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    cannotConcludeYet: false,
    weak: false,
    internalGateReadinessBand: "insufficient",
    gateState: "gates_not_ready",
    dev2ConfidenceLevel: "low",
    confidence: "low",
  });
  check("0 questions → readiness insufficient", bundle.readiness.readiness, "insufficient");
  // Narrative envelope
  const narrative = buildNarrativeContractV1({
    topicKey: "addition",
    subjectId: "math",
    questions: 0,
    accuracy: 0,
    displayName: "חיבור",
    contractsV1: bundle,
  });
  check("0 questions → envelope WE0", narrative.wordingEnvelope, "WE0");
}

// ──────────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────`);
console.log(`Fix-2 Strength Selftest: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
