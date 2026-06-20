/**
 * Phase 3: Stage B scope resolution — entity + interpretation scope, clarifications.
 * Run: npm run test:parent-copilot-stage-b-scope
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { syntheticPayload } = await import(pathToFileURL(join(ROOT, "scripts/parent-copilot-test-fixtures.mjs")).href);
const { resolveScope } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/scope-resolver.js")).href);
const { interpretFreeformStageA } = await import(
  pathToFileURL(join(ROOT, "utils/parent-copilot/stage-a-freeform-interpretation.js")).href
);
const { buildTruthPacketV1 } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/truth-packet-v1.js")).href);

const FORBIDDEN_CLARIFICATION_SUBSTRINGS = [
  "נסחו",
  "בקצרה",
  "ממוקד",
  "פורמט",
  "schema",
  "JSON",
  "אינטנט",
  "canonical",
];

function assertClarificationParentFacing(q, label) {
  const s = String(q || "");
  assert.ok(s.length > 0 && s.length <= 160, `${label}: clarification length`);
  for (const bad of FORBIDDEN_CLARIFICATION_SUBSTRINGS) {
    assert.ok(!s.includes(bad), `${label}: must not contain "${bad}"`);
  }
}

const payload = syntheticPayload();

// Entity: topic from utterance
const topicOut = resolveScope({ payload, utterance: "מה המצב בנושא השברים?", selectedContextRef: null });
assert.equal(topicOut.resolutionStatus, "resolved");
assert.equal(topicOut.scope?.scopeType, "topic");
assert.equal(topicOut.scope?.scopeId, "t1");
assert.ok(topicOut.scope?.interpretationScope);
assert.equal(topicOut.scope?.interpretationScope, topicOut.scope?.scopeClass);

// Entity: subject from utterance
const subOut = resolveScope({ payload, utterance: "אני רוצה להבין אנגלית", selectedContextRef: null });
assert.equal(subOut.resolutionStatus, "resolved");
assert.equal(subOut.scope?.scopeType, "subject");
assert.equal(subOut.scope?.scopeId, "english");

// Entity: executive aggregate
const aggOut = resolveScope({ payload, utterance: "מה המקצוע החזק?", selectedContextRef: null });
assert.equal(aggOut.resolutionStatus, "resolved");
assert.equal(aggOut.scope?.scopeType, "executive");

// Selected context: topic
const selOut = resolveScope({
  payload,
  utterance: "מה קורה?",
  selectedContextRef: { scopeType: "topic", scopeId: "t1", subjectId: "math" },
});
assert.equal(selOut.resolutionStatus, "resolved");
assert.equal(selOut.scope?.scopeType, "topic");
assert.equal(selOut.scope?.interpretationScope, selOut.scope?.scopeClass);

// Truth packet carries interpretationScope from scope
const tp = buildTruthPacketV1(payload, topicOut.scope);
assert.ok(tp);
assert.equal(tp.interpretationScope, topicOut.scope.interpretationScope);

// Interpretation: strengths framing on subject-scoped utterance (no aggregate short-circuit)
const strengthsSub = interpretFreeformStageA("מה הולך טוב בחשבון?", payload);
assert.equal(strengthsSub.canonicalIntent, "what_is_going_well");
const subStrengthRes = resolveScope({ payload, utterance: "מה הולך טוב בחשבון?", selectedContextRef: null });
assert.equal(subStrengthRes.scope?.scopeType, "subject");
assert.equal(subStrengthRes.scope?.interpretationScope, "strengths");

// Ambiguity: two anchored topics whose names both appear
const dualPayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        {
          topicRowKey: "tA",
          displayName: "נושא א",
          questions: 5,
          accuracy: 70,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              topicKey: "tA",
              subjectId: "math",
              wordingEnvelope: "WE2",
              hedgeLevel: "light",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: [],
              requiredHedges: ["נכון לעכשיו"],
              allowedSections: ["summary", "finding"],
              recommendationIntensityCap: "RI1",
              textSlots: { observation: "יש נתונים.", interpretation: "כיוון רך.", action: null, uncertainty: "נכון לעכשיו." },
            },
            decision: { contractVersion: "v1", topicKey: "tA", subjectId: "math", decisionTier: 1, cannotConcludeYet: false },
            readiness: { contractVersion: "v1", topicKey: "tA", subjectId: "math", readiness: "emerging" },
            confidence: { contractVersion: "v1", topicKey: "tA", subjectId: "math", confidenceBand: "medium" },
            recommendation: {
              contractVersion: "v1",
              topicKey: "tA",
              subjectId: "math",
              eligible: true,
              intensity: "RI1",
              family: "general_practice",
              anchorEvidenceIds: ["e1"],
              rationaleCodes: [],
              forbiddenBecause: [],
            },
            evidence: { contractVersion: "v1", topicKey: "tA", subjectId: "math" },
          },
        },
        {
          topicRowKey: "tB",
          displayName: "נושא ב",
          questions: 6,
          accuracy: 72,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              topicKey: "tB",
              subjectId: "math",
              wordingEnvelope: "WE2",
              hedgeLevel: "light",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: [],
              requiredHedges: ["נכון לעכשיו"],
              allowedSections: ["summary", "finding"],
              recommendationIntensityCap: "RI1",
              textSlots: { observation: "יש נתונים ב׳.", interpretation: "כיוון רך ב׳.", action: null, uncertainty: "נכון לעכשיו." },
            },
            decision: { contractVersion: "v1", topicKey: "tB", subjectId: "math", decisionTier: 1, cannotConcludeYet: false },
            readiness: { contractVersion: "v1", topicKey: "tB", subjectId: "math", readiness: "emerging" },
            confidence: { contractVersion: "v1", topicKey: "tB", subjectId: "math", confidenceBand: "medium" },
            recommendation: {
              contractVersion: "v1",
              topicKey: "tB",
              subjectId: "math",
              eligible: true,
              intensity: "RI1",
              family: "general_practice",
              anchorEvidenceIds: ["e2"],
              rationaleCodes: [],
              forbiddenBecause: [],
            },
            evidence: { contractVersion: "v1", topicKey: "tB", subjectId: "math" },
          },
        },
      ],
    },
  ],
  executiveSummary: { majorTrendsHe: ["א"] },
};
const amb = resolveScope({
  payload: dualPayload,
  utterance: "מה המצב בנושא א ובנושא ב?",
  selectedContextRef: null,
});
assert.equal(amb.resolutionStatus, "clarification_required");
assertClarificationParentFacing(amb.clarificationQuestionHe, "topic_ambiguous");

// Stage A intent tie → short clarification (injected stageA to avoid aggregate short-circuit)
const baseStageA = interpretFreeformStageA("אפשר הסבר נוסף?", payload);
const tieOut = resolveScope({
  payload,
  utterance: "אפשר הסבר נוסף?",
  selectedContextRef: null,
  stageA: { ...baseStageA, shouldClarifyIntent: true, ambiguityLevel: "high" },
});
assert.equal(tieOut.resolutionStatus, "resolved");
assert.equal(tieOut.scope?.scopeType, "executive");
assert.equal(tieOut.scopeReason, "stage_a_intent_tie_executive_default");

// Vague free-form without entity anchor: defaults to executive when payload has anchors (broad report class)
const vague = resolveScope({ payload, utterance: "אפשר הסבר נוסף?", selectedContextRef: null });
assert.equal(vague.resolutionStatus, "resolved");
assert.equal(vague.scope?.scopeType, "executive");
assert.equal(vague.scopeReason, "broad_report_executive_fallback");

console.log("parent-copilot-stage-b-scope-suite: OK");
