/**
 * Answer composition quality + short conversational follow-ups (not routing / intent suites).
 * Run: npm run test:parent-copilot-answer-quality-conversation
 */
import assert from "node:assert/strict";
import { syntheticPayload } from "./parent-copilot-test-fixtures.mjs";
import parentCopilot from "../utils/parent-copilot/index.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";
import { parentDirectOpenerHe } from "../utils/parent-copilot/direct-answer-openers.js";
import { compactParentAnswerBlocks } from "../utils/parent-copilot/answer-compaction.js";
import { buildTruthPacketV1 } from "../utils/parent-copilot/truth-packet-v1.js";

const runParentCopilotTurn = parentCopilot.runParentCopilotTurn;

// 1) Compaction: same uncertainty trope must not repeat across blocks
{
  const dupBlocks = [
    { type: "observation", textHe: "עדיין מוקדם לקבוע משהו כאן.", source: "composed" },
    { type: "meaning", textHe: "נכון לעכשיו עדיין מוקדם לקבוע גם בפסקה השנייה.", source: "composed" },
  ];
  const compacted = compactParentAnswerBlocks(dupBlocks, { maxBlocks: 4, maxTotalChars: 2200 });
  const joinedComp = compacted.map((b) => b.textHe).join(" ");
  const n = (joinedComp.match(/עדיין מוקדם לקבוע/g) || []).length;
  assert.ok(n <= 1, "expected at most one occurrence of the early-uncertainty trope after compaction");
}

// 2) Default length bound (topic scope)
{
  sessionMemory.resetParentCopilotSessionForTests("aqc-len");
  const payload = syntheticPayload({ eligible: true });
  const rLen = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה קורה בשברים בפועל?",
    sessionId: "aqc-len",
    selectedContextRef: { scopeType: "topic", scopeId: "t1", subjectId: "math" },
  });
  assert.equal(rLen.resolutionStatus, "resolved");
  const bodyLen = (rLen.answerBlocks || []).map((b) => b.textHe).join("\n").length;
  assert.ok(bodyLen <= 2800, "default parent answer should stay within compact length");
}

// 3) Executive broad: avoid long middot-separated inventory chains
{
  sessionMemory.resetParentCopilotSessionForTests("aqc-exec");
  const payload = syntheticPayload({ eligible: true });
  const rExec = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה התמונה הכללית של הדוח?",
    sessionId: "aqc-exec",
    selectedContextRef: null,
  });
  assert.equal(rExec.resolutionStatus, "resolved");
  const execJoined = (rExec.answerBlocks || []).map((b) => b.textHe).join(" ");
  const middots = (execJoined.match(/·/g) || []).length;
  assert.ok(middots <= 8, "executive answer should not stitch a long middot inventory chain");
}

// 4) Direct openers exist for major question classes
{
  const payload = syntheticPayload({ eligible: true });
  const tpTopic = buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: "t1",
    scopeLabel: "שברים",
    interpretationScope: "executive",
    canonicalIntent: "explain_report",
  });
  assert.ok(tpTopic);
  for (const intent of [
    "explain_report",
    "what_is_most_important",
    "what_to_do_today",
    "why_not_advance",
    "what_is_going_well",
    "what_is_still_difficult",
    "how_to_tell_child",
    "question_for_teacher",
    "is_intervention_needed",
    "clarify_term",
  ]) {
    const o = parentDirectOpenerHe(intent, tpTopic);
    assert.ok(o && o.length >= 8 && o.length <= 260, `opener for ${intent}`);
    assert.match(o, /^בקצרה/u, `opener should be direct parent-facing for ${intent}`);
  }
}

// 5) Short conversational reply classes + continuity: see `parent-copilot-reply-class-paraphrase-suite.mjs` (run via same npm script chain).

// 6) Parent-visible copy must not include common meta-coaching filler lines
{
  sessionMemory.resetParentCopilotSessionForTests("aqc-meta");
  const payload = syntheticPayload({ eligible: true });
  const rMeta = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה המשמעות של הנושא הזה בשבילנו?",
    sessionId: "aqc-meta",
    selectedContextRef: { scopeType: "topic", scopeId: "t1", subjectId: "math" },
  });
  assert.equal(rMeta.resolutionStatus, "resolved");
  const jMeta = (rMeta.answerBlocks || []).map((b) => b.textHe).join(" ");
  const banned = ["מבחינה הורית אפשר לשאול", "שווה לחבר את המשפט", "אפשר להשתמש בזה כמסגרת"];
  for (const b of banned) {
    assert.ok(!jMeta.includes(b), `parent copy must not contain coaching filler: ${b}`);
  }
}

// 7) Sparse executive: short, human, limited-data aware (not a numeric wall)
{
  const sparsePayload = {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          {
            topicRowKey: "tSparse",
            displayName: "יחידה קצרה",
            questions: 3,
            accuracy: 62,
            contractsV1: {
              narrative: {
                contractVersion: "v1",
                topicKey: "tSparse",
                subjectId: "math",
                wordingEnvelope: "WE1",
                hedgeLevel: "mandatory",
                allowedTone: "parent_professional_warm",
                forbiddenPhrases: [],
                requiredHedges: ["נכון לעכשיו"],
                allowedSections: ["summary", "finding"],
                recommendationIntensityCap: "RI0",
                textSlots: {
                  observation: "נכון לעכשיו יש כאן רק מעט תרגול ביחידה הקצרה.",
                  interpretation: "נכון לעכשיו עדיין מוקדם לקבוע כיוון עקבי.",
                  action: null,
                  uncertainty: "נכון לעכשיו כדאי להמשיך לאסוף עוד ניסיון לפני החלטה.",
                },
              },
              decision: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", decisionTier: 0, cannotConcludeYet: true },
              readiness: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", readiness: "insufficient" },
              confidence: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", confidenceBand: "low" },
              recommendation: {
                contractVersion: "v1",
                topicKey: "tSparse",
                subjectId: "math",
                eligible: false,
                intensity: "RI0",
                family: null,
                anchorEvidenceIds: [],
                rationaleCodes: [],
                forbiddenBecause: [],
              },
              evidence: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math" },
            },
          },
        ],
      },
    ],
    executiveSummary: { majorTrendsHe: [] },
  };
  sessionMemory.resetParentCopilotSessionForTests("aqc-sparse");
  const sparseRes = runParentCopilotTurn({
    audience: "parent",
    payload: sparsePayload,
    utterance: "איך לסכם את הדוח בשביל עצמנו?",
    sessionId: "aqc-sparse",
    selectedContextRef: null,
  });
  assert.equal(sparseRes.resolutionStatus, "resolved");
  const sj = (sparseRes.answerBlocks || []).map((b) => b.textHe).join(" ");
  assert.ok(sj.length <= 2600, "sparse executive answer should stay short");
  assert.ok(/\D{8,}/u.test(sj), "sparse executive should include substantive wording, not digits-only");
}

console.log("parent-copilot-answer-quality-conversation-suite: OK");
