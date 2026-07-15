/**
 * BLOCKER 2 closure — server parent-facing path (buildParentInsightsHe) must use LPD.
 */
import assert from "node:assert/strict";
import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import { buildParentInsightsHe } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  buildLearningPatternDecision,
  buildLpdSafeTopicInsightFromWeakTopic,
  buildLpdSafeTopicInsightLineHe,
  findForbiddenParentWords,
  guardParentFacingText,
  LEGACY_TOPIC_ATTENTION_INSIGHT_DISABLED,
} from "../../utils/learning-pattern-decision/index.js";
import { topicAttentionInsightHe } from "../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { subjectLabelHe, topicLabelHe } from "../../lib/teacher-portal/teacher-ui.he.js";

const START = Date.UTC(2026, 3, 1);

function hedgedPayload({ subject = "math", topic = "fractions", q, acc, mistakes = [] }) {
  const c = Math.round((q * acc) / 100);
  return attachParentContextEvidenceQuality({
    summary: { diagnosticAnswers: q, totalSessions: 3, totalAnswers: q },
    subjects: {
      [subject]: {
        diagnosticAnswers: q,
        diagnosticAccuracy: acc,
        topics: {
          [topic]: { diagnosticAnswers: q, diagnosticAccuracy: acc },
        },
      },
    },
    recentMistakes: mistakes,
    dailyActivity: [{ date: "2026-01-10", answers: q, correct: c }],
  });
}

function mkMistakes(subject, topic, n, patternFamily = "pf:same") {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    subject,
    topic,
    patternFamily,
    answeredAt: new Date(START + i * 86_400_000).toISOString(),
  }));
}

/** A — server path does not emit free topicAttentionInsightHe when LPD applies */
{
  const payload = hedgedPayload({ q: 8, acc: 40, mistakes: mkMistakes("math", "fractions", 8) });
  const insights = buildParentInsightsHe(payload);
  const legacy = topicAttentionInsightHe({
    subject: "מתמטיקה",
    subjectId: "math",
    topic: "שברים",
    q: 8,
    acc: 40,
    wrongRatio: 60,
    rootCause: "knowledge_gap",
    diagnosticType: "knowledge_gap",
    patternId: "pf:same",
    engineAction: "כדאי לחזק",
  });
  assert.ok(legacy.includes("מה כדאי לעשות") || legacy.includes("כדאי"));
  for (const line of insights) {
    assert.ok(!line.includes("מה כדאי לעשות"), `legacy action leak: ${line}`);
    assert.equal(findForbiddenParentWords(line).length, 0);
  }
  assert.ok(LEGACY_TOPIC_ATTENTION_INSIGHT_DISABLED.includes("topicAttentionInsightHe"));
}

/** B — q=1–2 server weak-topic helper: no כדאי לחזק */
{
  const payload = hedgedPayload({ q: 2, acc: 0 });
  const line = buildLpdSafeTopicInsightFromWeakTopic(
    payload,
    { subject: "math", topicKey: "fractions", answers: 2, accuracy: 0 },
    () => "שברים",
    () => "מתמטיקה",
  );
  assert.ok(line.length > 0);
  assert.ok(!line.includes("כדאי לחזק"), line);
  assert.ok(!line.includes("כדאי לשים דגש"), line);
}

/** C — q=3–4 server weak-topic helper: no דפוס חוזר */
{
  const payload = hedgedPayload({
    q: 4,
    acc: 25,
    mistakes: mkMistakes("math", "fractions", 3, "pf:same"),
  });
  const line = buildLpdSafeTopicInsightFromWeakTopic(
    payload,
    { subject: "math", topicKey: "fractions", answers: 4, accuracy: 25 },
    () => "שברים",
    () => "מתמטיקה",
  );
  assert.ok(line.length > 0);
  assert.ok(!line.includes("דפוס חוזר"), line);
}

/** D — forbidden words guarded on server insights */
{
  const payload = hedgedPayload({ q: 10, acc: 35, mistakes: mkMistakes("math", "fractions", 10) });
  const insights = buildParentInsightsHe(payload);
  for (const line of insights) {
    assert.equal(findForbiddenParentWords(line).length, 0, line);
    assert.equal(line, guardParentFacingText(line));
  }
}

/** E — topic insight without attached LPD still builds LPD (no legacy engine text) */
{
  const row = {
    subjectId: "math",
    subjectLabelHe: "מתמטיקה",
    label: "חיבור",
    topicKey: "addition",
    questions: 2,
    correct: 0,
    wrong: 2,
    accuracy: 0,
    topicEngineRowSignals: {
      diagnosticType: "knowledge_gap",
      doNowHe: "כדאי לחזק את הנושא בדחיפות",
    },
  };
  const line = buildLpdSafeTopicInsightLineHe(row);
  assert.ok(line.length > 0);
  assert.ok(!line.includes("בדחיפות"));
  assert.ok(!line.includes("כדאי לחזק"));
  const lpd = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "addition",
    row: {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 2,
      correct: 0,
      wrong: 2,
      accuracy: 0,
    },
    rawMistakes: [],
    startMs: START,
    endMs: START + 1,
  });
  assert.equal(lpd.findingType, "initial_topic_data");
}

/**
 * F — single-word Hebrew topic labels via the REAL topicLabelHe (not a mock) must never
 * regress to the raw English topicKey (regression guard for the "fractions" leak bug).
 */
{
  const singleWordTopics = [
    { topicKey: "fractions", hebrew: "שברים" },
    { topicKey: "addition", hebrew: "חיבור" },
    { topicKey: "subtraction", hebrew: "חיסור" },
    { topicKey: "multiplication", hebrew: "כפל" },
    { topicKey: "percentages", hebrew: "אחוזים" },
  ];
  for (const { topicKey, hebrew } of singleWordTopics) {
    const payload = hedgedPayload({ subject: "math", topic: topicKey, q: 8, acc: 40 });
    const line = buildLpdSafeTopicInsightFromWeakTopic(
      payload,
      { subject: "math", topicKey, answers: 8, accuracy: 40 },
      topicLabelHe,
      subjectLabelHe,
    );
    assert.ok(line.length > 0, `expected a non-empty insight line for topic "${topicKey}"`);
    assert.ok(
      line.includes(hebrew),
      `expected Hebrew label "${hebrew}" in line for topic "${topicKey}", got: ${line}`,
    );
    assert.ok(
      !line.includes(topicKey),
      `raw English topic key "${topicKey}" leaked into parent-facing line: ${line}`,
    );
  }
}

console.log("server-parent-facing-lpd.test.mjs - all passed");
