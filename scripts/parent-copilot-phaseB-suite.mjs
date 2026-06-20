/**
 * Phase B gate: follow-up ranking / memory de-dup / in-session continuity (no Phase C).
 */
import assert from "node:assert/strict";
import truthPacket from "../utils/parent-copilot/truth-packet-v1.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";
import parentCopilot from "../utils/parent-copilot/index.js";

const { planConversation } = await import("../utils/parent-copilot/conversation-planner.js");
const { selectFollowUp } = await import("../utils/parent-copilot/followup-engine.js");

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

// Continuity: repeated intent rotates block order (same contract slots).
const plan1 = planConversation("explain_report", tp, { continuityRepeat: false });
const plan2 = planConversation("explain_report", tp, { continuityRepeat: true });
assert.deepEqual(plan1.blockPlan.slice(0, 2), ["observation", "meaning"]);
assert.deepEqual(plan2.blockPlan.slice(0, 2), ["meaning", "observation"]);

// Session memory stores suggested follow-up + answer digest for Phase B ranking.
sessionMemory.resetParentCopilotSessionForTests("phaseB-mem");
sessionMemory.applyConversationStateDelta("phaseB-mem", {
  suggestedFollowupTextHe: "רוצים לזהות יחד מה כדאי להימנע ממנו בשבוע הקרוב?",
  assistantAnswerSummary: "יש כיוון עבודה סביר ועדיין נדרש אישור נוסף לפני כיוון ברור במשמעות ארוכה.",
});
const sm = sessionMemory.getConversationState("phaseB-mem");
assert.ok(Array.isArray(sm.recentSuggestedFollowupTexts) && sm.recentSuggestedFollowupTexts.length === 1);
assert.ok(Array.isArray(sm.answerSummaryFingerprints) && sm.answerSummaryFingerprints.length >= 1);

// De-dup: same Hebrew chip text recently suggested → demote that family when others exist.
const avoidNowChip = "רוצים לזהות יחד מה כדאי להימנע ממנו בשבוע הקרוב?";
sessionMemory.resetParentCopilotSessionForTests("phaseB-dedup");
sessionMemory.applyConversationStateDelta("phaseB-dedup", {
  suggestedFollowupTextHe: avoidNowChip,
});
const convDedup = sessionMemory.getConversationState("phaseB-dedup");
const fu = selectFollowUp({
  audience: "parent",
  intent: "what_to_do_this_week",
  scopeType: "topic",
  scopeKey: "topic:t1",
  clickedFollowupFamilyThisTurn: null,
  truthPacket: {
    cannotConcludeYet: false,
    readiness: "emerging",
    confidenceBand: "medium",
    recommendationEligible: true,
    recommendationIntensityCap: "RI2",
    allowedFollowupFamilies: ["avoid_now", "advance_or_hold", "explain_to_child"],
  },
  conversationState: convDedup,
});
assert.notEqual(fu.selected?.family, "avoid_now");

// End-to-end: same session + same observation intent → second answer leads with meaning block.
sessionMemory.resetParentCopilotSessionForTests("phaseB-e2e");
const utteranceObs = "מה רואים בנתונים בשברים";
const r1 = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: utteranceObs,
  sessionId: "phaseB-e2e",
  selectedContextRef: null,
});
const r2 = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: utteranceObs,
  sessionId: "phaseB-e2e",
  selectedContextRef: null,
});
assert.equal(r1.answerBlocks[0]?.type, "observation");
assert.equal(r2.answerBlocks[0]?.type, "meaning");

console.log("parent-copilot-phaseB-suite: OK");
