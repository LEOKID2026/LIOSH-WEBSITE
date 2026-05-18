/**
 * Real panel path: runParentCopilotTurnAsync + redactPayloadForCopilotGrounding (same as API/UI).
 * Run: npm run test:parent-copilot-real-panel-contracts
 */
import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";
import intentComposers from "../utils/parent-copilot/intent-answer-composers.js";
import redactMod from "../utils/parent-copilot/redact-payload-for-copilot-grounding.js";

const { redactPayloadForCopilotGrounding } = redactMod;

const { fingerprintAnswerHe } = intentComposers;
const runAsync = parentCopilot.runParentCopilotTurnAsync;
const resetSession = sessionMemory.resetParentCopilotSessionForTests;

const AMBIGUOUS_SNIP = "לא הבנתי בדיוק";
const METRIC_STATUS_RE = /בתקופה הזו יש \d+ שאלות.*דיוק של כ־\d+%/u;

function makeRow(topicRowKey, subjectId, displayName, q, acc, riv = null) {
  return {
    topicRowKey,
    displayName,
    questions: q,
    accuracy: acc,
    rowIdentityV1: riv,
    contractsV1: {
      evidence: { contractVersion: "v1", topicKey: topicRowKey, subjectId, questionCount: q, accuracyPct: acc },
      decision: { cannotConcludeYet: false, decisionTier: 2 },
      readiness: { readiness: "emerging" },
      confidence: { confidenceBand: "medium" },
      recommendation: { eligible: true, intensity: "RI2", forbiddenBecause: [] },
      narrative: {
        textSlots: {
          observation: `ב${displayName} יש ${q} שאלות, דיוק ${acc}%.`,
          interpretation: "כיוון חזק",
          action: "תרגול",
          uncertainty: "",
        },
        wordingEnvelope: "WE2",
      },
    },
  };
}

function realShapedPayload() {
  return {
    version: 2,
    registeredGradeKey: "g5",
    subjectProfiles: [
      {
        subject: "math",
        subjectQuestionCount: 100,
        topicRecommendations: [
          makeRow("fractions::grade:g5", "math", "שברים", 76, 41, {
            contentGradeKey: "g5",
            gradeRelation: "same",
          }),
          makeRow("multiplication", "math", "כפל", 24, 88),
        ],
      },
      {
        subject: "english",
        subjectQuestionCount: 0,
        topicRecommendations: [makeRow("grammar", "english", "דקדוק", 0, 0)],
      },
    ],
    diagnosticEngineV2: {
      units: [
        {
          subjectId: "math",
          topicRowKey: "fractions::grade:g5",
          displayName: "שברים",
          taxonomy: { patternHe: "ערבוב מונה ומכנה בצמצום" },
          diagnosis: { lineHe: "בלבול בין מונה למכנה", allowed: true },
        },
      ],
    },
    executiveSummary: { majorTrendsHe: ["מגמה"] },
  };
}

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(res.clarificationQuestionHe || "");
}

/**
 * Same pipeline as pages/api/parent/copilot-turn.js → runParentCopilotTurnAsync.
 */
async function panelTurn(sessionId, rawPayload, utterance) {
  const payload = redactPayloadForCopilotGrounding(rawPayload);
  const res = await runAsync({
    audience: "parent",
    payload,
    utterance,
    sessionId,
    selectedContextRef: null,
  });
  const tel = res?.telemetry || {};
  const trace = {
    endpoint: "/api/parent/copilot-turn",
    utterance,
    resolutionStatus: res.resolutionStatus,
    resolvedIntent: tel.intent || res.intent,
    answerContract: tel.answerContract,
    resolvedScope: tel.scopeType && tel.scopeId ? `${tel.scopeType}:${tel.scopeId}` : "",
    inheritedScope: String(tel.scopeReason || "").includes("conversation_inherited"),
    answerComposerUsed: tel.answerComposerUsed || tel.generationPath,
    generationPath: tel.generationPath,
    fallbackUsed: tel.fallbackUsed,
    rowSourceIds: tel.evidenceUsed?.rowSourceIds,
    patternHe: tel.evidenceUsed?.patternHe,
    preview: previewText(answerText(res), 120),
  };
  if (process.env.COPILOT_PANEL_TRACE === "1") {
    process.stderr.write(`${JSON.stringify(trace)}\n`);
  }
  return { res, trace, payload };
}

function previewText(t, n) {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

const rawPayload = realShapedPayload();
const sessionId = "real-panel-session";
resetSession(sessionId);

/** @type {Record<string, { res: object; trace: object }>} */
const turns = {};

// 1 mistake pattern (no prior scope — must focus weakest topic, not metric-only)
turns.mistakes = await panelTurn(sessionId, rawPayload, "מה הטעויות הבולטות");
assert.equal(turns.mistakes.res.resolutionStatus, "resolved");
assert.ok(!answerText(turns.mistakes.res).includes(AMBIGUOUS_SNIP));
assert.equal(turns.mistakes.trace.generationPath, "intent_composer");
assert.ok(
  /הטעות|דפוס|מונה|מכנה|ערבוב/i.test(answerText(turns.mistakes.res)),
  "mistake answer must use pattern, not metrics-only status",
);
assert.ok(
  !METRIC_STATUS_RE.test(answerText(turns.mistakes.res)) ||
    /הטעות|דפוס/i.test(answerText(turns.mistakes.res)),
);

// 2 important focus / report explanation
turns.important = await panelTurn(sessionId, rawPayload, "תסביר לי מה חשוב כאן");
assert.equal(turns.important.res.resolutionStatus, "resolved");
assert.ok(!answerText(turns.important.res).includes(AMBIGUOUS_SNIP));
assert.equal(turns.important.trace.generationPath, "intent_composer");
assert.ok(
  turns.important.trace.answerContract === "important_focus" ||
    turns.important.trace.answerContract === "report_explanation",
);
assert.ok(/בטווח|תורגל|מקצוע|חשבון|חשוב|דגש/i.test(answerText(turns.important.res)));
assert.ok(
  !/במילים פשוטות/i.test(answerText(turns.important.res)),
  "must not use short-followup confusion_simpler copy",
);

// 3 topic lookup — multiplication exists
turns.mult = await panelTurn(sessionId, rawPayload, "מה לגבי כפל?");
assert.equal(turns.mult.res.resolutionStatus, "resolved");
assert.ok(!answerText(turns.mult.res).includes(AMBIGUOUS_SNIP));
assert.ok(/כפל|88|24/i.test(answerText(turns.mult.res)));

// 4 strength — only math practiced
turns.strong = await panelTurn(sessionId, rawPayload, "מה המקצוע החזק?");
assert.equal(turns.strong.res.resolutionStatus, "resolved");
const strongText = answerText(turns.strong.res);
assert.ok(/חשבון|מקצוע|תורגל/i.test(strongText));
assert.ok(/רק|יחיד|השוואה/i.test(strongText) || /כפל/i.test(strongText));

// 5 topic problem
turns.fracProblem = await panelTurn(sessionId, rawPayload, "מה הבעיה בשברים?");
assert.equal(turns.fracProblem.res.resolutionStatus, "resolved");
assert.ok(/שברים|41|76|חיזוק|קושי/i.test(answerText(turns.fracProblem.res)));
assert.ok(turns.fracProblem.trace.generationPath === "intent_composer");

// 6 home practice (after topic context from prior turns)
turns.home = await panelTurn(sessionId, rawPayload, "מה לעשות בבית?");
assert.equal(turns.home.res.resolutionStatus, "resolved");
const homeText = answerText(turns.home.res);
assert.ok(/דקות|תרגול|בית|שאלות/i.test(homeText));
assert.ok(turns.home.trace.generationPath === "intent_composer");
const fpProblem = fingerprintAnswerHe({ answerBlocks: turns.fracProblem.res.answerBlocks });
const fpHome = fingerprintAnswerHe({ answerBlocks: turns.home.res.answerBlocks });
assert.notEqual(fpProblem, fpHome);

const fpMistake = fingerprintAnswerHe({ answerBlocks: turns.mistakes.res.answerBlocks });
assert.notEqual(fpMistake, fpProblem);

process.stdout.write("OK parent-copilot-real-panel-contracts\n");
