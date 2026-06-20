/**
 * Semantic answer-first path for recommendation / next-step Hebrew questions.
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

const questions = [
  "המלצות להמשך?",
  "מה לעשות עכשיו?",
  "מה לעשות השבוע?",
  "מה הצעד הבא?",
  "על מה להתמקד עכשיו?",
  "מה הכי חשוב כרגע?",
];

for (const q of questions) {
  const r = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: eligiblePayload,
    utterance: q,
    sessionId: `rec-eligible-${q.slice(0, 12)}`,
    selectedContextRef: null,
  });
  assert.equal(r.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(r).ok);
  assert.equal(r.suggestedFollowUp, null);
  const body = r.answerBlocks.map((b) => b.textHe).join(" ");
  assert.ok(
    body.includes("מומלץ חיזוק ממוקד") || body.includes("אפשר לבחור צעד תמיכה"),
    `${q} must lead with concrete recommendation text from contracts (topic or executive aggregate)`,
  );
  assert.ok(!/^מהצד ההורי|^כהורה|^לפי הדוח:\s*$/m.test(r.answerBlocks[0]?.textHe || ""), `${q} must not be coaching-first`);
}

for (const q of questions) {
  const r = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: ineligiblePayload,
    utterance: q,
    sessionId: `rec-ineligible-${q.slice(0, 12)}`,
    selectedContextRef: null,
  });
  assert.equal(r.resolutionStatus, "resolved");
  assert.ok(guardrail.validateParentCopilotResponseV1(r).ok);
  assert.equal(r.suggestedFollowUp, null);
  const body = r.answerBlocks.map((b) => b.textHe).join(" ");
  assert.ok(
    /עדיין מוקדם מדי|לא מכוון כרגע|אין כרגע ניסוח מעשי|לא הצלחנו לגזור|לא סגורה|עדיין לא ניתן לסגור|לא ניתן לסגור|לא קובעים כיוון|מוקדם לקבוע|לא ניתן לקבוע כיוון/.test(
      body,
    ),
    `${q} must state insufficiency in parent-facing language when contract blocks concrete recommendation`,
  );
  assert.ok(!/\bRI0\b|\bRI1\b|\bRI2\b|\bRI3\b/.test(body), `${q} must not expose intensity codes in parent copy`);
  assert.ok(
    !/חוזי ההמלצה|לא מסומנת כזמינה|אין שורת פעולה/.test(body),
    `${q} must not use internal/contract insufficiency wording`,
  );
}

console.log("parent-copilot-recommendation-semantic-suite: OK");
