import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveParentAttemptCreditedTimeMs,
  summarizeParentActivityAttempts,
} from "../../lib/learning-supabase/parent-activity-learning-credit.server.js";
import { LEARNING_UNIT_CREDIT_CAP_MS } from "../../lib/learning/learning-time-credit-policy.js";
import {
  classifyActivityEvidence,
  EVIDENCE_CATEGORIES,
} from "../../lib/learning/activity-classification.js";
import {
  aggregateReportPayloadFromActivityRows,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { evidenceSourcePhraseHe } from "../../utils/parent-report-language/grade-insight-he.js";

test("resolveParentAttemptCreditedTimeMs prefers snapshot creditedTimeMs", () => {
  const ms = resolveParentAttemptCreditedTimeMs({
    time_spent_ms: 400_000,
    question_snapshot: { creditedTimeMs: 12_000, rawTimeSpentMs: 400_000 },
  });
  assert.equal(ms, 12_000);
});

test("resolveParentAttemptCreditedTimeMs caps raw time when credited missing", () => {
  const ms = resolveParentAttemptCreditedTimeMs({ time_spent_ms: 800_000 });
  assert.equal(ms, LEARNING_UNIT_CREDIT_CAP_MS);
});

test("summarizeParentActivityAttempts counts only graded answers", () => {
  const summary = summarizeParentActivityAttempts([
    { is_correct: true, question_snapshot: { creditedTimeMs: 5000 } },
    { is_correct: null, question_snapshot: { creditedTimeMs: 9000 } },
    { is_correct: false, question_snapshot: { creditedTimeMs: 3000 } },
  ]);
  assert.equal(summary.answersCount, 2);
  assert.equal(summary.correctCount, 1);
  assert.equal(summary.totalCreditedMs, 8000);
  assert.equal(summary.durationSeconds, 8);
  assert.equal(summary.accuracy, 50);
});

test("parent guided_practice stored as diagnostic_guided on record path", () => {
  const r = classifyActivityEvidence("guided_practice", "assigned_parent", { hintsUsed: 1 });
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED);
});

test("public parent report strips evidence source provenance from topics", () => {
  const student = { id: "stu", full_name: "Kid", grade_level: "grade_3" };
  const payload = aggregateReportPayloadFromActivityRows(
    student,
    [],
    [],
    new Date("2026-05-01T00:00:00.000Z"),
    new Date("2026-05-30T00:00:00.000Z"),
    { sessionsFilterField: "started_at", answersFilterField: "answered_at" },
    [
      {
        activity_id: "act-1",
        question_index: 0,
        is_correct: true,
        hints_used: 0,
        time_spent_ms: 5000,
        answered_at: "2026-05-15T12:00:00.000Z",
        question_snapshot: { creditedTimeMs: 5000 },
        parent_assigned_activities: {
          subject: "math",
          topic: "addition",
          mode: "homework",
          difficulty_level: "easy",
        },
      },
    ]
  );

  const topic = payload.subjects.math.topics.addition;
  assert.equal(topic.primaryEvidenceSource, "parent_assigned_activity");

  const publicPayload = stripInternalReportPayloadFields(payload);
  const publicTopic = publicPayload.subjects.math.topics.addition;
  assert.equal(publicTopic.primaryEvidenceSource, undefined);
  assert.equal(publicTopic.evidenceSources, undefined);
  assert.equal(evidenceSourcePhraseHe("parent_assigned_activity"), "");
});
