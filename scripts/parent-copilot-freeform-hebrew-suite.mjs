/**
 * Free-form Hebrew robustness: utterance normalization + scope parity + pipeline smoke.
 * Run: npm run test:parent-copilot-freeform-hebrew
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { normalizeFreeformParentUtteranceHe, foldUtteranceForHeMatch } = await import(
  pathToFileURL(join(ROOT, "utils/parent-copilot/utterance-normalize-he.js")).href
);
const { interpretFreeformStageA } = await import(
  pathToFileURL(join(ROOT, "utils/parent-copilot/stage-a-freeform-interpretation.js")).href
);
const { resolveScope } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/scope-resolver.js")).href);
const parentMod = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href);
const runParentCopilotTurn = parentMod.default?.runParentCopilotTurn ?? parentMod.runParentCopilotTurn;
const { buildTruthPacketV1 } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/truth-packet-v1.js")).href);
const guardrail = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/guardrail-validator.js")).href);

function syntheticPayload() {
  const narrative = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    wordingEnvelope: "WE2",
    hedgeLevel: "light",
    allowedTone: "parent_professional_warm",
    forbiddenPhrases: ["בטוח לחלוטין"],
    requiredHedges: ["נכון לעכשיו"],
    allowedSections: ["summary", "finding", "recommendation", "limitations"],
    recommendationIntensityCap: "RI2",
    textSlots: {
      observation: "בשברים נצפו 12 שאלות, עם דיוק של כ־75%.",
      interpretation: "יש כיוון עבודה סביר, ועדיין נדרש אישור נוסף לפני כיוון ברור.",
      action: "מומלץ חיזוק ממוקד ובדיקת עצמאות קצרה לפני קידום.",
      uncertainty: "נכון לעכשיו כדאי להמשיך לעקוב ולאמת את הכיוון בסבב הקרוב.",
    },
  };
  const tr = {
    topicRowKey: "t1",
    displayName: "שברים",
    questions: 12,
    accuracy: 75,
    contractsV1: {
      narrative,
      decision: { contractVersion: "v1", topicKey: "t1", subjectId: "math", decisionTier: 2, cannotConcludeYet: false },
      readiness: { contractVersion: "v1", topicKey: "t1", subjectId: "math", readiness: "emerging" },
      confidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math", confidenceBand: "medium" },
      recommendation: {
        contractVersion: "v1",
        topicKey: "t1",
        subjectId: "math",
        eligible: true,
        intensity: "RI2",
        family: "general_practice",
        anchorEvidenceIds: ["ev1"],
        rationaleCodes: [],
        forbiddenBecause: [],
      },
      evidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math" },
    },
  };
  return {
    version: 2,
    subjectProfiles: [{ subject: "math", topicRecommendations: [tr] }],
    executiveSummary: { majorTrendsHe: ["א", "ב"] },
  };
}

const payload = syntheticPayload();

// 1) Normalization strips invisible / odd spaces and is stable
const rawNoisy = `  מה\u200Bהמצב\u00A0בנושא\u201Cהשברים\u201D?  `;
const once = normalizeFreeformParentUtteranceHe(rawNoisy);
const twice = normalizeFreeformParentUtteranceHe(once);
assert.equal(once, twice, "normalization must be idempotent");
assert.ok(once.includes("השברים"), "quotes/spaces normalized");
assert.ok(!/\u200B/.test(once), "zero-width removed");

// 2) Fold match: noisy utterance resolves same topic scope as clean
const clean = "מה המצב בנושא השברים?";
const scopeClean = resolveScope({ payload, utterance: clean, selectedContextRef: null });
const scopeNoisy = resolveScope({ payload, utterance: rawNoisy, selectedContextRef: null });
assert.equal(scopeClean.resolutionStatus, "resolved");
assert.equal(scopeNoisy.resolutionStatus, "resolved");
assert.equal(scopeClean.scope?.scopeId, scopeNoisy.scope?.scopeId, "scope parity under noisy Hebrew");
assert.equal(scopeClean.scope?.scopeType, "topic");

// 3) foldUtteranceForHeMatch strips cantillation for substring match
const folded = foldUtteranceForHeMatch("מה המצב בנושא ה\u05B4ש\u05B8ב\u05B8ר\u05B4ים?");
assert.ok(folded.includes("שברים"), "cantillation fold preserves letters");

// 4) Full turn: resolved, validator pass, no internal leak in blocks
const res = runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: rawNoisy,
  sessionId: "freeform-hebrew-suite",
});
assert.equal(res.resolutionStatus, "resolved");
assert.ok(Array.isArray(res.answerBlocks) && res.answerBlocks.length >= 2);
const draft = { answerBlocks: res.answerBlocks };
const scopeForTruth = resolveScope({ payload, utterance: rawNoisy, selectedContextRef: null });
const truthPacket = buildTruthPacketV1(payload, scopeForTruth.scope);
assert.ok(truthPacket, "truth packet");
const v = guardrail.validateAnswerDraft(draft, truthPacket);
assert.ok(v.ok, `answer draft must validate: ${v.failCodes?.join(",")}`);
const joined = res.answerBlocks.map((b) => b.textHe).join(" ");
assert.ok(!/\bcontractsV1\b|validatorFailCodes|schemaVersion/i.test(joined), "no internal tokens in parent-facing blocks");

// 5) Clarification path still valid shape (selected topic missing anchor in payload)
const clarPayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        {
          topicRowKey: "ghost",
          displayName: "נושא בלי עיגון",
          questions: 1,
          accuracy: 50,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              topicKey: "ghost",
              subjectId: "math",
              wordingEnvelope: "WE0",
              hedgeLevel: "mandatory",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: [],
              requiredHedges: [],
              allowedSections: ["summary"],
              recommendationIntensityCap: "RI0",
              textSlots: { observation: "", interpretation: "", action: null, uncertainty: "" },
            },
            decision: { contractVersion: "v1", topicKey: "ghost", subjectId: "math", decisionTier: 0, cannotConcludeYet: true },
            readiness: { contractVersion: "v1", topicKey: "ghost", subjectId: "math", readiness: "insufficient" },
            confidence: { contractVersion: "v1", topicKey: "ghost", subjectId: "math", confidenceBand: "low" },
            recommendation: {
              contractVersion: "v1",
              topicKey: "ghost",
              subjectId: "math",
              eligible: false,
              intensity: "RI0",
              family: null,
              anchorEvidenceIds: [],
              rationaleCodes: [],
              forbiddenBecause: [],
            },
            evidence: { contractVersion: "v1", topicKey: "ghost", subjectId: "math" },
          },
        },
      ],
    },
  ],
  executiveSummary: { majorTrendsHe: ["א"] },
};
const clar = runParentCopilotTurn({
  audience: "parent",
  payload: clarPayload,
  utterance: "מה קורה?",
  sessionId: "freeform-hebrew-suite-2",
  selectedContextRef: { scopeType: "topic", scopeId: "ghost", subjectId: "math" },
});
assert.equal(clar.resolutionStatus, "clarification_required");
const finalCheck = guardrail.validateParentCopilotResponseV1(clar);
assert.ok(finalCheck.ok, `response contract: ${finalCheck.hardFails?.join(",")}`);

// 6) Stage A: typo-tolerant parity + intentHitSignals + home-week disambiguation
const typoWhy = interpretFreeformStageA("למה לא מתקדמיםם?", null);
const cleanWhy = interpretFreeformStageA("למה לא מתקדמים?", null);
assert.equal(typoWhy.canonicalIntent, cleanWhy.canonicalIntent);
assert.equal(typoWhy.canonicalIntent, "why_not_advance");
assert.ok(
  typoWhy.intentHitSignals && typeof typoWhy.intentHitSignals.why_not_advance === "number",
  "intentHitSignals telemetry shape",
);

const homeWeek = interpretFreeformStageA("מה הכי חשוב עכשיו בבית?", null);
assert.equal(
  homeWeek.canonicalIntent,
  "what_to_do_this_week",
  '"עכשיו בבית" should map to weekly home focus, not generic importance',
);

const importanceNow = interpretFreeformStageA("מה הכי חשוב עכשיו?", null);
assert.equal(importanceNow.canonicalIntent, "what_is_most_important");

console.log("parent-copilot-freeform-hebrew-suite: OK");
