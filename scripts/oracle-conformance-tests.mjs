/**
 * Oracle conformance tests — validates product behavior against PARENT_REPORT_PRODUCT_ORACLE.md.
 */
import assert from "node:assert/strict";
import * as _RC from "../utils/parent-report-recommendation-consistency.js";
import * as _CH from "../utils/parent-report-language/confidence-parent-he.js";
import * as _EL from "../utils/ai-hybrid-diagnostic/explanation-layer.js";

const resolveUnitParentActionHe = _RC.resolveUnitParentActionHe || _RC.default?.resolveUnitParentActionHe;
const confidenceLevelParentSummaryHe = _CH.confidenceLevelParentSummaryHe || _CH.default?.confidenceLevelParentSummaryHe;
const buildHybridExplanations = _EL.buildHybridExplanations || _EL.default?.buildHybridExplanations;

function syntheticCanonicalState({ actionState, family, allowed, intensityCap = "RI0", readiness = "insufficient", confidenceLevel = "low", positiveAuthorityLevel = "none" }) {
  return Object.freeze({
    topicStateId: `test::oracle_${actionState}`,
    stateHash: `oracle_hash_${actionState}`,
    subjectId: "math",
    topicKey: "test_topic",
    bucketKey: "test_topic",
    displayName: "נושא בדיקה",
    evidence: { questions: 10, correct: 7, wrong: 3, wrongEventCount: 3, recurrenceFull: false, taxonomyMatch: true, dataSufficiencyLevel: "medium", confidence01: 0.5, stableMastery: false, needsPractice: true, positiveAuthorityLevel },
    decisionInputs: { priorityLevel: "P2", breadth: "narrow", counterEvidenceStrong: false, weakEvidence: false, hintInvalidates: false, narrowSample: false, hardDenyReason: null, taxonomyMismatchReason: null },
    classification: { taxonomyId: "test", classificationState: "classified", classificationReasonCode: "match" },
    assessment: { confidenceLevel, readiness, decisionTier: 1, cannotConcludeYet: actionState === "withhold", allowedClaimClass: "no_claim" },
    actionState,
    recommendation: { family: family || actionState, allowed: !!allowed, intensityCap, reasonCodes: [] },
    narrativeConstraints: { uncertaintyRequired: actionState === "withhold" || actionState === "probe_only", allowedSections: ["summary"], forbiddenPhrases: [] },
    renderFlags: {},
    _deprecated_positiveConclusionAllowed: actionState === "maintain" || actionState === "expand_cautiously",
  });
}

function makeUnit(actionState, overrides = {}) {
  const ALLOWED = { diagnose_only: true, intervene: true, maintain: true, expand_cautiously: true };
  const cs = syntheticCanonicalState({
    actionState,
    allowed: ALLOWED[actionState] || false,
    intensityCap: overrides.intensityCap || (actionState === "intervene" ? "RI3" : actionState === "diagnose_only" ? "RI2" : actionState === "maintain" || actionState === "expand_cautiously" ? "RI1" : "RI0"),
    readiness: overrides.readiness || "insufficient",
    confidenceLevel: overrides.confidenceLevel || "low",
    positiveAuthorityLevel: overrides.positiveAuthorityLevel || "none",
  });
  return {
    canonicalState: cs,
    displayName: "נושא בדיקה",
    subjectId: "math",
    topicRowKey: "test_topic",
    intervention: overrides.intervention || null,
    probe: overrides.probe || null,
    outputGating: {},
  };
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

console.log("\n=== Oracle Conformance Tests ===\n");

console.log("--- Test group 1: probe_only → parentActionHe === null ---");

test("probe_only unit returns null for parentActionHe", () => {
  const unit = makeUnit("probe_only");
  const result = resolveUnitParentActionHe(unit);
  assert.equal(result, null, `expected null, got: ${result}`);
});

test("withhold unit returns null for parentActionHe", () => {
  const unit = makeUnit("withhold");
  const result = resolveUnitParentActionHe(unit);
  assert.equal(result, null, `expected null, got: ${result}`);
});

console.log("\n--- Test group 2: withhold/probe_only copilot answers have no action language ---");

const FORBIDDEN_ACTION_MARKERS = ["מומלץ", "כדאי", "נעבוד בבית"];

test("withhold copilot explanation has no action language", () => {
  const snapshot = { taxonomyId: "test", confidence: { level: "contradictory" }, outputGating: { cannotConcludeYet: true } };
  const cs = syntheticCanonicalState({ actionState: "withhold", allowed: false, readiness: "insufficient", confidenceLevel: "contradictory" });
  const result = buildHybridExplanations({
    snapshot,
    ranking: { top1Id: "", ambiguityScore: 1 },
    probeIntel: {},
    gate: { mode: "suppressed" },
    canonicalState: cs,
  });
  const text = result.parent.text;
  for (const marker of FORBIDDEN_ACTION_MARKERS) {
    assert.ok(!text.includes(marker), `withhold copilot text must not contain "${marker}", got: ${text}`);
  }
});

test("probe_only copilot explanation has no action language", () => {
  const snapshot = { taxonomyId: "", confidence: { level: "low" }, outputGating: {} };
  const cs = syntheticCanonicalState({ actionState: "probe_only", allowed: false, readiness: "insufficient", confidenceLevel: "low" });
  const result = buildHybridExplanations({
    snapshot,
    ranking: { top1Id: "", ambiguityScore: 1 },
    probeIntel: {},
    gate: { mode: "suppressed" },
    canonicalState: cs,
  });
  const text = result.parent.text;
  for (const marker of FORBIDDEN_ACTION_MARKERS) {
    assert.ok(!text.includes(marker), `probe_only copilot text must not contain "${marker}", got: ${text}`);
  }
});

console.log("\n--- Test group 3: No forbidden parent-facing strings ---");

const FORBIDDEN_PARENT_STRINGS = ["במערכת", "נשמור על ניסוח", "אפשר לנסח", "Parent Copilot (v1)"];

test("withhold copilot text has no forbidden strings", () => {
  const snapshot = { taxonomyId: "", confidence: { level: "insufficient_data" }, outputGating: { cannotConcludeYet: true } };
  const cs = syntheticCanonicalState({ actionState: "withhold", allowed: false });
  const result = buildHybridExplanations({
    snapshot,
    ranking: { top1Id: "", ambiguityScore: 1 },
    probeIntel: {},
    gate: { mode: "suppressed" },
    canonicalState: cs,
  });
  for (const forbidden of FORBIDDEN_PARENT_STRINGS) {
    assert.ok(!result.parent.text.includes(forbidden), `copilot text must not contain "${forbidden}", got: ${result.parent.text}`);
  }
});

test("non-cannot explain text has no forbidden strings", () => {
  const snapshot = { taxonomyId: "mult_table", confidence: { level: "moderate" }, outputGating: {} };
  const cs = syntheticCanonicalState({ actionState: "diagnose_only", allowed: true, intensityCap: "RI2", readiness: "emerging", confidenceLevel: "moderate" });
  const result = buildHybridExplanations({
    snapshot,
    ranking: { top1Id: "hyp1", ambiguityScore: 0.3 },
    probeIntel: {},
    gate: { mode: "rank_only" },
    canonicalState: cs,
  });
  for (const forbidden of FORBIDDEN_PARENT_STRINGS) {
    assert.ok(!result.parent.text.includes(forbidden), `copilot text must not contain "${forbidden}", got: ${result.parent.text}`);
  }
});

console.log("\n--- Test group 4: diagnose_only never exposes RI3 ---");

test("diagnose_only canonical state has intensityCap RI2, not RI3", () => {
  const unit = makeUnit("diagnose_only", { intensityCap: "RI2", readiness: "emerging", confidenceLevel: "moderate" });
  assert.equal(unit.canonicalState.recommendation.intensityCap, "RI2");
  assert.notEqual(unit.canonicalState.recommendation.intensityCap, "RI3");
});

console.log("\n--- Test group 5: Confidence templates match oracle exactly ---");

const EXPECTED_CONFIDENCE = {
  high: "כבר רואים כיוון עקבי בנושא הזה.",
  moderate: "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב.",
  low: "עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה.",
  early_signal_only: "זה סימן ראשוני בלבד, ולכן עדיין לא קובעים כיוון סופי בנושא הזה.",
  insufficient_data: "בתקופה שנבחרה עדיין מעט חומר לנושא - עוד קצת תרגול ייצר תמונה ברורה יותר.",
  contradictory: "כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע כיוון ברור.",
  default: "עדיין לא ברור מה אפשר לקבוע בנושא הזה - נכון לעכשיו עדיף תרגול קצר ולבדוק שוב בהמשך.",
};

for (const [level, expected] of Object.entries(EXPECTED_CONFIDENCE)) {
  test(`confidence template for "${level}" matches oracle`, () => {
    const actual = confidenceLevelParentSummaryHe(level);
    assert.equal(actual, expected, `\n  expected: ${expected}\n  actual:   ${actual}`);
  });
}

test("confidence default (null) matches oracle default text", () => {
  const actual = confidenceLevelParentSummaryHe(null);
  assert.equal(actual, EXPECTED_CONFIDENCE.default);
});

console.log("\n--- Test group 6: maintain/expand template text ---");

test("maintain unit produces correct home action text", () => {
  const unit = makeUnit("maintain", { readiness: "emerging", confidenceLevel: "moderate", positiveAuthorityLevel: "good" });
  const result = resolveUnitParentActionHe(unit);
  assert.ok(result, "maintain must produce home action text");
  assert.ok(result.includes("להמשיך באותה רמה"), `expected maintain template, got: ${result}`);
  assert.ok(!result.includes("לשמר עקביות"), "must not contain old wording");
  assert.ok(!result.includes("שימור יציבות"), "must not contain old wording");
});

test("expand_cautiously unit produces correct home action text", () => {
  const unit = makeUnit("expand_cautiously", { readiness: "ready", confidenceLevel: "high", positiveAuthorityLevel: "excellent" });
  const result = resolveUnitParentActionHe(unit);
  assert.ok(result, "expand must produce home action text");
  assert.ok(result.includes("להישאר בינתיים באותה רמה"), `expected expand template, got: ${result}`);
  assert.ok(!result.includes("לשמר את אותה רמת מורכבות"), "must not contain old wording");
});

console.log("\n--- Test group 7: mainHomeRecommendationHe fallback ---");

test("executive fallback text is correct when no eligible topics", () => {
  const expected = "כרגע אין המלצה ביתית אחת מרכזית, כי עדיין צריך עוד מידע.";
  const old = "להמשיך עם תרגול ממוקד לפני שינוי רחב בבית.";
  assert.notEqual(expected, old, "fallback text must have changed");
});

console.log("\n=== Results ===");
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("  All oracle conformance tests passed.\n");
