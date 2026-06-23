/**
 * Parent Copilot multi-turn conversation quality — scope inheritance, polarity, mistake patterns.
 * Run: npm run test:parent-copilot-conversation-quality
 */
import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";
import sessionMemory from "../utils/parent-copilot/session-memory.js";
import evidencePolarity from "../utils/parent-copilot/evidence-polarity.js";

const { FORBIDDEN_POSITIVE_WHEN_WEAK_RE } = evidencePolarity;
const runParentCopilotTurn = parentCopilot.runParentCopilotTurn;
const resetSession = sessionMemory.resetParentCopilotSessionForTests;

/** Generic ambiguous fallback opener — must not appear on contextual follow-ups. */
const AMBIGUOUS_SNIP = "לא הצלחתי להבין בדיוק";

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(res.clarificationQuestionHe || "");
}

/**
 * @param {string} topicRowKey
 * @param {string} subjectId
 * @param {string} displayName
 * @param {number} q
 * @param {number} acc
 * @param {object} [narrativeSlots]
 */
function makeTopicRow(topicRowKey, subjectId, displayName, q, acc, narrativeSlots = null) {
  const slots = narrativeSlots || {
    observation: `ב${displayName} בתקופה הזו יש ${q} שאלות, עם דיוק של כ־${acc}%.`,
    interpretation:
      acc <= 54
        ? "ניכר כאן כיוון חזק יחסית; נמשיך באותו קצב ונוודא שההצלחה חוזרת לאורך זמן."
        : "נכון לעכשיו יציבות טובה יחסית בתקופה — אפשר לשמר תרגול שגרתי.",
    action: "תרגול ממוקד קצר.",
    uncertainty: "",
  };
  return {
    topicRowKey,
    displayName,
    questions: q,
    accuracy: acc,
    contractsV1: {
      evidence: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        questionCount: q,
        accuracyPct: acc,
      },
      decision: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        decisionTier: q >= 20 ? 2 : 1,
        cannotConcludeYet: false,
      },
      readiness: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        readiness: acc >= 75 ? "ready" : "emerging",
      },
      confidence: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        confidenceBand: acc >= 78 ? "high" : "medium",
      },
      recommendation: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        eligible: true,
        intensity: "RI2",
        family: "general_practice",
        anchorEvidenceIds: ["ev"],
        forbiddenBecause: [],
      },
      narrative: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        wordingEnvelope: acc <= 54 ? "WE4" : "WE3",
        hedgeLevel: "light",
        allowedTone: "parent_professional_warm",
        forbiddenPhrases: [],
        requiredHedges: [],
        allowedSections: ["summary", "finding", "recommendation", "limitations"],
        recommendationIntensityCap: "RI2",
        textSlots: slots,
      },
    },
  };
}

/**
 * @param {object} opts
 */
function buildPayload(opts = {}) {
  const mathTopics = opts.mathTopics || [
    makeTopicRow("fractions", "math", "שברים", 76, 41),
  ];
  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        subjectQuestionCount: mathTopics.reduce((n, tr) => n + Math.max(0, Number(tr?.questions) || 0), 0),
        topicRecommendations: mathTopics,
      },
      {
        subject: "english",
        subjectQuestionCount:
          opts.englishTopics?.reduce((n, tr) => n + Math.max(0, Number(tr?.questions) || 0), 0) ?? 0,
        topicRecommendations: opts.englishTopics || [
          makeTopicRow("grammar", "english", "דקדוק", 0, 0, {
            observation: "",
            interpretation: "",
            action: null,
            uncertainty: "",
          }),
        ],
      },
    ],
    diagnosticEngineV2: {
      units: Array.isArray(opts.diagnosticUnits) ? opts.diagnosticUnits : [],
    },
    executiveSummary: { majorTrendsHe: ["מגמה כללית"] },
  };
}

let sid = 0;
const freshSid = () => `pcq-${++sid}`;

// A — topic + follow-up inherits scope; uses pattern when available
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [makeTopicRow("topic_a", "math", "נושא א׳", 24, 48)],
    diagnosticUnits: [
      {
        subjectId: "math",
        topicRowKey: "topic_a",
        diagnosis: { lineHe: "בלבול בין מונה למכנה", allowed: true },
        taxonomy: { patternHe: "ערבוב מונה ומכנה" },
      },
    ],
  });
  const t1 = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הבעיה בנושא א׳?",
    sessionId,
  });
  assert.equal(t1.resolutionStatus, "resolved");
  const t2 = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הטעויות הבולטות?",
    sessionId,
  });
  assert.equal(t2.resolutionStatus, "resolved", "follow-up must resolve, not fallback");
  const t2Text = answerText(t2);
  assert.ok(!t2Text.includes(AMBIGUOUS_SNIP), "follow-up must not use generic ambiguous fallback");
  assert.ok(/נושא א׳|מונה|מכנה|דפוס|טעויות/i.test(t2Text), "follow-up should use inherited topic + pattern evidence");
}

// B — typo variant treated as mistake-pattern intent
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [makeTopicRow("topic_a", "math", "נושא א׳", 18, 50)],
    diagnosticUnits: [
      {
        subjectId: "math",
        topicRowKey: "topic_a",
        taxonomy: { patternHe: "טעות חוזרת בחיבור שברים" },
      },
    ],
  });
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הטעיות בנושא א׳?",
    sessionId,
  });
  assert.equal(r.resolutionStatus, "resolved");
  const text = answerText(r);
  assert.ok(/טעות|דפוס|חיבור שברים/i.test(text), "typo טעיות should surface mistake-pattern evidence");
}

// C — low accuracy high volume: difficulty wording, never success hype
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload();
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הבעיה בשברים?",
    sessionId,
  });
  assert.equal(r.resolutionStatus, "resolved");
  const text = answerText(r);
  assert.ok(!FORBIDDEN_POSITIVE_WHEN_WEAK_RE.test(text), "76q/41% must not get positive success wording");
  assert.ok(/חיזוק|קושי|דיוק|41|76/i.test(text), "should cite difficulty/support framing with evidence");
}

// D — high accuracy row: stable / maintain wording
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [makeTopicRow("mastery", "math", "שליטה", 450, 88)],
  });
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "איך הוא בשליטה?",
    sessionId,
  });
  assert.equal(r.resolutionStatus, "resolved");
  const text = answerText(r);
  assert.ok(/יציב|שמר|טוב|88/i.test(text), "high accuracy should read as stable/good");
  assert.ok(!/חיזוק ממוקד.*לפני שמסיקים שהכול יציב/i.test(text), "strong row should not get weak-support-only copy");
}

// E — grade split: weak g5 vs strong g4
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [
      makeTopicRow("fractions::grade:g4", "math", "שברים", 30, 82),
      makeTopicRow("fractions::grade:g5", "math", "שברים", 28, 38),
    ],
  });
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הבעיה בשברים?",
    sessionId,
  });
  assert.equal(r.resolutionStatus, "resolved");
  const text = answerText(r);
  assert.ok(/שברים/i.test(text));
  assert.ok(
    /כיתה|g5|g4|חלש|נמוך|38|82|פער|שתי/i.test(text) || /38|82/.test(text),
    "grade split should surface weaker practice row without calling strong row weak",
  );
}

// F — missing mistake pattern: precise limitation, not fallback
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [makeTopicRow("topic_b", "math", "נושא ב׳", 40, 45)],
    diagnosticUnits: [],
  });
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הטעויות בנושא ב׳?",
    sessionId,
  });
  assert.equal(r.resolutionStatus, "resolved");
  const text = answerText(r);
  assert.ok(
    text.includes("אין פירוט מספיק כדי לזהות את סוג הטעות המדויק"),
    "must state precise limitation when pattern metadata missing",
  );
  assert.ok(!text.includes(AMBIGUOUS_SNIP), "must not generic-fallback");
}

// G — subject scope + follow-up mistake question
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    mathTopics: [
      makeTopicRow("fractions", "math", "שברים", 76, 41),
      makeTopicRow("multiplication", "math", "כפל", 20, 85),
    ],
    diagnosticUnits: [
      {
        subjectId: "math",
        topicRowKey: "fractions",
        taxonomy: { patternHe: "טעות בצמצום שברים" },
      },
    ],
  });
  const t1 = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "מה הבעיה בחשבון?",
    sessionId,
  });
  assert.equal(t1.resolutionStatus, "resolved");
  const t2 = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "ואיפה הוא טעה יותר?",
    sessionId,
  });
  assert.equal(t2.resolutionStatus, "resolved");
  const t2Text = answerText(t2);
  assert.ok(!t2Text.includes(AMBIGUOUS_SNIP), "subject-scoped follow-up must not fallback");
  assert.ok(/חשבון|שברים|טעה|דפוס|טעות/i.test(t2Text), "continues within math scope");
}

// H — zero-evidence english
{
  const sessionId = freshSid();
  resetSession(sessionId);
  const payload = buildPayload({
    englishTopics: [makeTopicRow("grammar", "english", "דקדוק", 0, 0)],
  });
  const r = runParentCopilotTurn({
    audience: "parent",
    payload,
    utterance: "איך הוא באנגלית?",
    sessionId,
  });
  assert.ok(
    r.resolutionStatus === "resolved" || r.resolutionStatus === "clarification_required",
    "english zero-evidence should resolve or clarify with no-data policy",
  );
  const text = answerText(r);
  assert.ok(/לא תורגל|אין.*תרגול|לא נאספו|0|לא נצפ|בטווח/i.test(text), "must communicate no practice in period");
}

process.stdout.write("OK parent-copilot-conversation-quality\n");
