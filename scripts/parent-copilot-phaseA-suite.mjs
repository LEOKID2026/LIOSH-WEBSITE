/**
 * Phase A Parent Copilot gate suite (contract + response shape).
 */
import assert from "node:assert/strict";
import truthPacket from "../utils/parent-copilot/truth-packet-v1.js";
import contractReader from "../utils/parent-copilot/contract-reader.js";
import guardrail from "../utils/parent-copilot/guardrail-validator.js";
import parentCopilot from "../utils/parent-copilot/index.js";
import scopeResolver from "../utils/parent-copilot/scope-resolver.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";
import renderAdapter from "../utils/parent-copilot/render-adapter.js";
import followupEngine from "../utils/parent-copilot/followup-engine.js";

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
    executiveSummary: { majorTrendsHe: ["קו ראשון בתקופה", "קו שני בתקופה"] },
  };
}

const payload = syntheticPayload();

// Blocker 1 — utterance-driven scope (topic / subject before executive)
const scopeTopic = scopeResolver.resolveScope({
  payload,
  utterance: "מה המצב בנושא השברים?",
  selectedContextRef: null,
});
assert.equal(scopeTopic.resolutionStatus, "resolved");
assert.equal(scopeTopic.scope?.scopeType, "topic");
assert.equal(scopeTopic.scope?.scopeId, "t1");
assert.equal(scopeTopic.scope?.scopeLabel, "שברים");

const scopeSubject = scopeResolver.resolveScope({
  payload,
  utterance: "אני רוצה לדבר על חשבון",
  selectedContextRef: null,
});
assert.equal(scopeSubject.resolutionStatus, "resolved");
assert.equal(scopeSubject.scope?.scopeType, "subject");
assert.equal(scopeSubject.scope?.scopeId, "math");

const scopeAgg = scopeResolver.resolveScope({
  payload,
  utterance: "מה המקצוע החזק?",
  selectedContextRef: null,
});
assert.equal(scopeAgg.resolutionStatus, "resolved");
assert.equal(scopeAgg.scope?.scopeType, "executive");
assert.equal(scopeAgg.scope?.scopeLabel, "הדוח בתקופה הנבחרה");

const scopeBroadExecutiveFallback = scopeResolver.resolveScope({
  payload,
  utterance: "אפשר הסבר נוסף?",
  selectedContextRef: null,
});
assert.equal(scopeBroadExecutiveFallback.resolutionStatus, "resolved");
assert.equal(scopeBroadExecutiveFallback.scope?.scopeType, "executive");
assert.equal(scopeBroadExecutiveFallback.scopeReason, "broad_report_executive_fallback");

// Blocker 3 — session memory contract fields
sessionMemory.resetParentCopilotSessionForTests("mem-contract");
sessionMemory.applyConversationStateDelta("mem-contract", {
  addedIntent: "understand_meaning",
  addedFollowUpFamily: "action_today",
  clickedFollowupFamily: "action_today",
  addedScopeKey: "topic:t1",
  answeredConstraintTag: "turn:validator_pass",
  closingSnippet: "מילות בדיקה חוזרות מילות בדיקה חוזרות",
});
const mem = sessionMemory.getConversationState("mem-contract");
assert.ok(Array.isArray(mem.priorScopes) && mem.priorScopes.includes("topic:t1"));
assert.ok(Array.isArray(mem.clickedFollowups) && mem.clickedFollowups.includes("action_today"));
assert.ok(Array.isArray(mem.answeredConstraints) && mem.answeredConstraints.length >= 1);
assert.ok(mem.phraseLedger && typeof mem.phraseLedger === "object");
assert.ok(typeof mem.repeatedPhraseHits === "number");

assert.equal(sessionMemory.PARENT_COPILOT_SESSION_IDLE_MS, 60 * 60 * 1000);

sessionMemory.resetParentCopilotSessionForTests("tag-split");
sessionMemory.applyConversationStateDelta("tag-split", { answeredConstraintTag: "turn:validator_pass,surface:caution" });
const memTags = sessionMemory.getConversationState("tag-split");
assert.ok(memTags.answeredConstraints.includes("turn:validator_pass"));
assert.ok(memTags.answeredConstraints.includes("surface:caution"));

// Memory consumption — clickedFollowups suppresses same follow-up family next turn
sessionMemory.resetParentCopilotSessionForTests("fu-clicked");
sessionMemory.applyConversationStateDelta("fu-clicked", { clickedFollowupFamily: "action_today" });
const convClicked = sessionMemory.getConversationState("fu-clicked");
const fuClicked = followupEngine.selectFollowUp({
  audience: "parent",
  intent: "understand_meaning",
  scopeType: "topic",
  scopeKey: "topic:t1",
  clickedFollowupFamilyThisTurn: null,
  truthPacket: {
    cannotConcludeYet: false,
    readiness: "emerging",
    confidenceBand: "medium",
    recommendationEligible: true,
    recommendationIntensityCap: "RI2",
    allowedFollowupFamilies: ["action_today", "action_week", "advance_or_hold", "uncertainty_boundary"],
  },
  conversationState: convClicked,
});
assert.notEqual(fuClicked.selected?.family, "action_today");

// answeredConstraints — surface:uncertainty lowers uncertainty_boundary follow-up when intent does not require it
sessionMemory.resetParentCopilotSessionForTests("fu-constraint");
sessionMemory.applyConversationStateDelta("fu-constraint", { answeredConstraintTag: "surface:uncertainty,turn:validator_pass" });
const convConstraint = sessionMemory.getConversationState("fu-constraint");
const fuConstraint = followupEngine.selectFollowUp({
  audience: "parent",
  intent: "understand_meaning",
  scopeType: "topic",
  scopeKey: "topic:x",
  truthPacket: {
    cannotConcludeYet: false,
    readiness: "emerging",
    confidenceBand: "medium",
    recommendationEligible: true,
    recommendationIntensityCap: "RI2",
    allowedFollowupFamilies: ["uncertainty_boundary", "action_week", "explain_to_child"],
  },
  conversationState: convConstraint,
});
assert.notEqual(fuConstraint.selected?.family, "uncertainty_boundary");

// priorScopes streak — same topic scope twice → diversify away from action_today
sessionMemory.resetParentCopilotSessionForTests("fu-scope");
sessionMemory.applyConversationStateDelta("fu-scope", { addedScopeKey: "topic:t1" });
sessionMemory.applyConversationStateDelta("fu-scope", { addedScopeKey: "topic:t1" });
const convScope = sessionMemory.getConversationState("fu-scope");
const fuScope = followupEngine.selectFollowUp({
  audience: "parent",
  intent: "understand_meaning",
  scopeType: "topic",
  scopeKey: "topic:t1",
  truthPacket: {
    cannotConcludeYet: false,
    readiness: "emerging",
    confidenceBand: "medium",
    recommendationEligible: true,
    recommendationIntensityCap: "RI2",
    allowedFollowupFamilies: ["action_today", "action_week"],
  },
  conversationState: convScope,
});
assert.notEqual(fuScope.selected?.family, "action_today");

// Blocker 2 — qa_advance_or_hold contract gate (tier/readiness/confidence)
const lowDecisionPayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        {
          ...payload.subjectProfiles[0].topicRecommendations[0],
          contractsV1: {
            ...payload.subjectProfiles[0].topicRecommendations[0].contractsV1,
            decision: {
              contractVersion: "v1",
              topicKey: "t1",
              subjectId: "math",
              decisionTier: 0,
              cannotConcludeYet: true,
            },
            readiness: {
              contractVersion: "v1",
              topicKey: "t1",
              subjectId: "math",
              readiness: "insufficient",
            },
            confidence: {
              contractVersion: "v1",
              topicKey: "t1",
              subjectId: "math",
              confidenceBand: "low",
            },
            recommendation: {
              contractVersion: "v1",
              topicKey: "t1",
              subjectId: "math",
              eligible: false,
              intensity: "RI0",
              family: null,
              anchorEvidenceIds: [],
              forbiddenBecause: ["cannot_conclude_yet"],
            },
          },
        },
      ],
    },
  ],
  executiveSummary: payload.executiveSummary,
};
const tpLow = truthPacket.buildTruthPacketV1(lowDecisionPayload, {
  scopeType: "executive",
  scopeId: "executive",
  scopeLabel: "מבט על התקופה",
});
const qaList = renderAdapter.buildQuickActions(tpLow, true);
const qaAdv = qaList.find((q) => q.id === "qa_advance_or_hold");
assert.ok(qaAdv);
assert.equal(qaAdv.enabled, false);
assert.equal(qaAdv.validatorCompatible, false);

function assertTruthPacketShape(tp) {
  assert.equal(tp.schemaVersion, "v1");
  assert.equal(tp.audience, "parent");
  assert.ok(["topic", "subject", "executive"].includes(tp.scopeType));
  assert.ok(String(tp.scopeId || "").length);
  assert.ok(String(tp.scopeLabel || "").length);
  assert.ok(tp.contracts && typeof tp.contracts === "object");
  for (const k of ["evidence", "decision", "readiness", "confidence", "recommendation", "narrative"]) {
    assert.ok(k in tp.contracts);
  }
  assert.ok(tp.derivedLimits);
  assert.ok(typeof tp.derivedLimits.cannotConcludeYet === "boolean");
  assert.ok(typeof tp.derivedLimits.recommendationEligible === "boolean");
  assert.ok(["RI0", "RI1", "RI2", "RI3"].includes(tp.derivedLimits.recommendationIntensityCap));
  assert.ok(["insufficient", "forming", "ready", "emerging"].includes(tp.derivedLimits.readiness));
  assert.ok(["low", "medium", "high"].includes(tp.derivedLimits.confidenceBand));
  assert.ok(tp.surfaceFacts && typeof tp.surfaceFacts.questions === "number");
  assert.ok(Array.isArray(tp.surfaceFacts.relevantSummaryLines));
  assert.ok(tp.allowedClaimEnvelope?.wordingEnvelope);
  assert.ok(Array.isArray(tp.allowedFollowupFamilies));
  assert.ok(Array.isArray(tp.forbiddenMoves));
}

// Truth packet first + single owner path
const tpExec = truthPacket.buildTruthPacketV1(payload, {
  scopeType: "executive",
  scopeId: "executive",
  scopeLabel: "מבט על התקופה",
});
assertTruthPacketShape(tpExec);
assert.equal(contractReader.readContractsSliceForScope("executive", "executive", "", payload)?.subjectId, "math");

// Downstream consumes same packet shape via runParentCopilotTurn only (no second truth builder in consumers)
const resEmpty = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: "",
  sessionId: "test-session-empty",
  selectedContextRef: null,
});
assert.equal(resEmpty.resolutionStatus, "resolved", "empty utterance must not default to clarification when payload exists");

const res = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: "מה המשמעות של המספרים?",
  sessionId: "test-session-a",
  selectedContextRef: null,
});
const v = guardrail.validateParentCopilotResponseV1(res);
assert.ok(v.ok, v.hardFails.join(","));

if (res.resolutionStatus === "resolved") {
  assert.ok(res.answerBlocks.length >= 2);
  assert.ok(res.contractSourcesUsed.includes("contractsV1.narrative"));
  for (const qa of res.quickActions) {
    assert.ok(qa.sourceContract);
    assert.ok(typeof qa.validatorCompatible === "boolean");
    if (qa.enabled) assert.equal(qa.validatorCompatible, true);
  }
}

// Parent-only
const teacherTry = parentCopilot.runParentCopilotTurn({
  audience: "teacher",
  payload,
  utterance: "שלום",
  sessionId: "t2",
});
assert.equal(teacherTry.resolutionStatus, "clarification_required");
assert.ok(guardrail.validateParentCopilotResponseV1(teacherTry).ok);

// Clarification branch contract
const clar = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: null,
  utterance: "שלום",
  sessionId: "t3",
});
assert.equal(clar.resolutionStatus, "clarification_required");
assert.ok(String(clar.clarificationQuestionHe || "").length);
assert.deepEqual(clar.answerBlocks, []);
assert.deepEqual(clar.contractSourcesUsed, []);
assert.equal(clar.suggestedFollowUp, null);
assert.deepEqual(clar.quickActions, []);
assert.equal(clar.fallbackUsed, false);
assert.ok(guardrail.validateParentCopilotResponseV1(clar).ok);

// Validator fail → deterministic fallback path still returns valid response object
const badPayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        {
          topicRowKey: "x",
          displayName: "בעיה",
          questions: 0,
          accuracy: 0,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              topicKey: "x",
              subjectId: "math",
              wordingEnvelope: "WE0",
              hedgeLevel: "mandatory",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: [],
              requiredHedges: [],
              allowedSections: ["summary", "finding"],
              recommendationIntensityCap: "RI0",
              textSlots: {
                observation: "אין מספיק תרגול.",
                interpretation: "בשלב זה לא קובעים כיוון עקבי.",
                uncertainty: "בשלב זה ועדיין מוקדם לקבוע סופית, לכן ממשיכים במעקב זהיר.",
              },
            },
            decision: { contractVersion: "v1", topicKey: "x", subjectId: "math", cannotConcludeYet: true, decisionTier: 0 },
            readiness: { contractVersion: "v1", topicKey: "x", subjectId: "math", readiness: "insufficient" },
            confidence: { contractVersion: "v1", topicKey: "x", subjectId: "math", confidenceBand: "low" },
            recommendation: {
              contractVersion: "v1",
              topicKey: "x",
              subjectId: "math",
              eligible: false,
              intensity: "RI0",
              family: null,
              anchorEvidenceIds: [],
              forbiddenBecause: ["cannot_conclude_yet"],
            },
            evidence: {},
          },
        },
      ],
    },
  ],
  executiveSummary: { majorTrendsHe: [] },
};
const res2 = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: badPayload,
  utterance: "מה לעשות היום?",
  sessionId: "t4",
});
assert.ok(guardrail.validateParentCopilotResponseV1(res2).ok);

/**
 * Three subjects with distinct weighted averages for aggregate semantic QA.
 * @param {ReturnType<typeof syntheticPayload>} basePayload
 */
function multiSubjectPayloadFrom(basePayload) {
  const baseTr = structuredClone(basePayload.subjectProfiles[0].topicRecommendations[0]);
  /**
   * @param {typeof baseTr} tr
   * @param {string} sid
   */
  const fixIds = (tr, sid) => {
    const cv = tr.contractsV1;
    for (const p of ["narrative", "decision", "readiness", "confidence", "recommendation"]) {
      if (cv[p] && typeof cv[p] === "object") cv[p].subjectId = sid;
    }
    if (cv.evidence && typeof cv.evidence === "object") cv.evidence.subjectId = sid;
  };
  const m1 = structuredClone(baseTr);
  m1.topicRowKey = "m1";
  m1.displayName = "כפל";
  m1.questions = 30;
  m1.accuracy = 60;
  fixIds(m1, "math");
  const e1 = structuredClone(baseTr);
  e1.topicRowKey = "e1";
  e1.displayName = "מילים";
  e1.questions = 10;
  e1.accuracy = 95;
  fixIds(e1, "english");
  const h1 = structuredClone(baseTr);
  h1.topicRowKey = "h1";
  h1.displayName = "דיקדוק";
  h1.questions = 5;
  h1.accuracy = 40;
  fixIds(h1, "hebrew");
  return {
    version: 2,
    executiveSummary: { majorTrendsHe: ["קו מגמה ראשון לתקופה", "קו משני לתקופה"] },
    subjectProfiles: [
      { subject: "math", topicRecommendations: [m1] },
      { subject: "english", topicRecommendations: [e1] },
      { subject: "hebrew", topicRecommendations: [h1] },
    ],
  };
}

const multiPayload = multiSubjectPayloadFrom(payload);

const rStrongest = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: multiPayload,
  utterance: "מה המקצוע החזק?",
  sessionId: "semantic-strongest",
});
assert.equal(rStrongest.resolutionStatus, "resolved");
assert.ok(guardrail.validateParentCopilotResponseV1(rStrongest).ok);
assert.ok(rStrongest.answerBlocks[0].textHe.includes("אנגלית"));
assert.ok(!rStrongest.answerBlocks.map((b) => b.textHe).join(" ").includes("כפל"));
assert.equal(rStrongest.suggestedFollowUp, null);

const rSubjectsList = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: multiPayload,
  utterance: "יש עוד מקצועות?",
  sessionId: "semantic-subjects-list",
});
assert.ok(rSubjectsList.answerBlocks[0].textHe.includes("מתמטיקה"));
assert.ok(rSubjectsList.answerBlocks[0].textHe.includes("אנגלית"));
assert.ok(rSubjectsList.answerBlocks[0].textHe.includes("עברית"));
assert.equal(rSubjectsList.suggestedFollowUp, null);

const rHardest = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: multiPayload,
  utterance: "באיזה מקצוע הכי קשה?",
  sessionId: "semantic-hardest",
});
assert.ok(rHardest.answerBlocks[0].textHe.includes("עברית"));
assert.equal(rHardest.suggestedFollowUp, null);

const rPeriod = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: multiPayload,
  utterance: "מה הכי בולט בתקופה?",
  sessionId: "semantic-period",
});
assert.ok(rPeriod.answerBlocks[0].textHe.includes("כיוון ראשון"));
assert.ok(!rPeriod.answerBlocks[0].textHe.includes("קו מגמה"));
assert.ok(rPeriod.answerBlocks[0].textHe.includes("מה שמסתמן בתקופה"));
assert.equal(rPeriod.suggestedFollowUp, null);

console.log("parent-copilot-phaseA-suite: OK");
