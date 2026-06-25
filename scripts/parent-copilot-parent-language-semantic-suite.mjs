/**
 * Parent-facing copy for insufficiency (A), clarify/re-explain (B), advance-or-hold (C).
 */
import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";
import guardrail from "../utils/parent-copilot/guardrail-validator.js";

function baseTopicRow(overrides = {}) {
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
  return {
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
      ...overrides.contractsV1,
    },
  };
}

const eligiblePayload = {
  version: 2,
  subjectProfiles: [{ subject: "math", topicRecommendations: [baseTopicRow()] }],
  executiveSummary: { majorTrendsHe: [] },
};

const ineligiblePayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        baseTopicRow({
          contractsV1: {
            decision: { contractVersion: "v1", topicKey: "t1", subjectId: "math", decisionTier: 0, cannotConcludeYet: true },
            readiness: { contractVersion: "v1", topicKey: "t1", subjectId: "math", readiness: "insufficient" },
            confidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math", confidenceBand: "low" },
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
            narrative: {
              contractVersion: "v1",
              topicKey: "t1",
              subjectId: "math",
              wordingEnvelope: "WE0",
              hedgeLevel: "mandatory",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: ["בטוח לחלוטין"],
              requiredHedges: ["נכון לעכשיו", "בשלב זה"],
              allowedSections: ["summary", "finding", "limitations"],
              recommendationIntensityCap: "RI0",
              textSlots: {
                observation: "אין מספיק תרגול.",
                interpretation: "בשלב זה לא קובעים כיוון עקבי.",
                action: null,
                uncertainty: "בשלב זה ועדיין מוקדם לקבוע סופית, לכן ממשיכים במעקב זהיר.",
              },
            },
          },
        }),
      ],
    },
  ],
  executiveSummary: { majorTrendsHe: [] },
};

function assertNoInternalJargon(body, label) {
  assert.ok(!/\bRI0\b|\bRI1\b|\bRI2\b|\bRI3\b/.test(body), `${label}: no RI codes in parent copy`);
  assert.ok(!/חוזי ההמלצה|לא מסומנת כזמינה|אין שורת פעולה/.test(body), `${label}: no contract insufficiency jargon`);
}

const recQs = ["מה ההמלצות להמשך?", "מה לעשות עכשיו?", "מה הכי חשוב כרגע?"];
for (const q of recQs) {
  const r = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: ineligiblePayload,
    utterance: q,
    sessionId: `plang-rec-${q.slice(0, 10)}`,
    selectedContextRef: null,
  });
  assert.equal(r.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(r).ok);
  const body = r.answerBlocks.map((b) => b.textHe).join(" ");
  assertNoInternalJargon(body, q);
}

const rStrong = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: eligiblePayload,
  utterance: "מה המקצוע החזק?",
  sessionId: "plang-strongest-one-subject",
  selectedContextRef: null,
});
assert.equal(rStrong.resolutionStatus, "resolved");
assert.ok(guardrail.validateParentCopilotResponseV1(rStrong).ok);
const strongBody = rStrong.answerBlocks.map((b) => b.textHe).join(" ");
assert.ok(/מקצוע אחד|בלי השוואה|מתמטיקה|חשבון/.test(strongBody), "single-subject strongest uses warm parent explanation");
assert.ok(!/לא נדרגים כאן מקצועות אחד מול השני/.test(strongBody), "single-subject strongest must not use dry multi-subject-only boilerplate");

const clarifyQs = ["לא הבנתי. תסביר", "תסביר פשוט", "מה זה אומר בעצם", "למה?"];
for (const q of clarifyQs) {
  const r = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: eligiblePayload,
    utterance: q,
    sessionId: `plang-clarify-${q}`,
    selectedContextRef: null,
  });
  assert.equal(r.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(r).ok);
  const body = r.answerBlocks.map((b) => b.textHe).join(" ");
  assert.ok(/במילים פשוטות/.test(body), `${q}: clarify path uses plain-language framing`);
  assert.ok(
    /בדוח התקופתי נספרו|הדיוק הממוצע בתקופה|יש כיוון עבודה סביר|שברים|נצפו\s+\d+\s+שאלות/.test(body),
    `${q}: must anchor to narrative slots (executive or topic), not empty boilerplate`,
  );
}

const advanceQs = ["להתקדם או להמתין?", "כדאי להתקדם?", "לחכות או להמשיך?"];
for (const q of advanceQs) {
  const rHold = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: ineligiblePayload,
    utterance: q,
    sessionId: `plang-adv-hold-${q}`,
    selectedContextRef: null,
  });
  assert.equal(rHold.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(rHold).ok);
  const bHold = rHold.answerBlocks.map((b) => b.textHe).join(" ");
  assert.ok(/להמתין|לא לדחוף/.test(bHold), `${q} ineligible: bounded hold-first answer`);

  const rGo = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: eligiblePayload,
    utterance: q,
    sessionId: `plang-adv-go-${q}`,
    selectedContextRef: null,
  });
  assert.equal(rGo.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(rGo).ok);
  const bGo = rGo.answerBlocks.map((b) => b.textHe).join(" ");
  assert.ok(/להתקדם|בזהירות|צעדים קטנים/.test(bGo), `${q} eligible: bounded advance-with-care answer`);
}

console.log("parent-copilot-parent-language-semantic-suite: OK");
