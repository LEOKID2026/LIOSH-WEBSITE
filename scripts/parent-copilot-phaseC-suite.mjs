/**
 * Phase C gate: coaching packs, script variants, in-session personalization (contract-bound).
 */
import assert from "node:assert/strict";
import truthPacket from "../utils/parent-copilot/truth-packet-v1.js";
import parentCopilot from "../utils/parent-copilot/index.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";

const { planConversation } = await import("../utils/parent-copilot/conversation-planner.js");
const { composeAnswerDraft } = await import("../utils/parent-copilot/answer-composer.js");
const { validateAnswerDraft, validateParentCopilotResponseV1 } = await import(
  "../utils/parent-copilot/guardrail-validator.js"
);
const { coachingVariantIndex, pickUncertaintyReasonScript } = await import(
  "../utils/parent-copilot/parent-coaching-packs.js"
);

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
  const decision = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    decisionTier: 2,
    cannotConcludeYet: false,
  };
  const readiness = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    readiness: "emerging",
  };
  const confidence = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    confidenceBand: "medium",
  };
  const recommendation = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    eligible: true,
    intensity: "RI2",
    family: "general_practice",
    anchorEvidenceIds: ["ev1"],
    rationaleCodes: [],
    forbiddenBecause: [],
  };
  const tr = {
    topicRowKey: "t1",
    displayName: "שברים",
    questions: 12,
    accuracy: 75,
    contractsV1: {
      narrative,
      decision,
      readiness,
      confidence,
      recommendation,
      evidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math" },
    },
  };
  return {
    version: 2,
    subjectProfiles: [{ subject: "math", topicRecommendations: [tr] }],
    executiveSummary: { majorTrendsHe: ["קו ראשון בתקופה"] },
  };
}

const payload = syntheticPayload();
const tp = truthPacket.buildTruthPacketV1(payload, {
  scopeType: "topic",
  scopeId: "t1",
  scopeLabel: "שברים",
});
assert.ok(tp);

const canonicalMeaningIntent = "what_is_most_important";
const plan = planConversation(canonicalMeaningIntent, tp, { continuityRepeat: false });
const draftPlain = composeAnswerDraft(plan, tp, null);
const draftC = composeAnswerDraft(plan, tp, {
  intent: canonicalMeaningIntent,
  continuityRepeat: false,
  conversationState: { priorIntents: [], repeatedPhraseHits: 0 },
});
const obs0 = String(draftC.answerBlocks.find((b) => b.type === "observation")?.textHe || "");
assert.ok(/בקצרה|הנה מה שכדאי לשים לב|זה מה שהדוח מסכם|בשברים נצפו/u.test(obs0), "expected direct parent-facing opener on primary observation");
const joinedDraftC = draftC.answerBlocks.map((b) => b.textHe).join(" ");
assert.ok(!joinedDraftC.includes("מבחינה הורית אפשר לשאול"), "parent-visible draft must not include meta-coaching filler");

const v = validateAnswerDraft(draftC, tp);
assert.ok(v.ok, v.failCodes.join(","));

const ixA = coachingVariantIndex({ priorIntents: [canonicalMeaningIntent], repeatedPhraseHits: 0 }, canonicalMeaningIntent);
const ixB = coachingVariantIndex({ priorIntents: ["what_to_do_today", "what_to_do_this_week"], repeatedPhraseHits: 0 }, canonicalMeaningIntent);
assert.notEqual(ixA, ixB);

const u0 = pickUncertaintyReasonScript({ cannotConcludeYet: false, confidenceBand: "high" }, canonicalMeaningIntent, 0);
const u1 = pickUncertaintyReasonScript({ cannotConcludeYet: false, confidenceBand: "high" }, canonicalMeaningIntent, 1);
assert.notEqual(u0, u1);

sessionMemory.resetParentCopilotSessionForTests("phaseC-e2e");
const r = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: "מה המשמעות של המספרים בשברים?",
  sessionId: "phaseC-e2e",
  selectedContextRef: null,
});
assert.ok(r.answerBlocks.length >= 2);
const ok = validateParentCopilotResponseV1(r);
assert.ok(ok.ok, ok.hardFails.join(","));

console.log("parent-copilot-phaseC-suite: OK");
