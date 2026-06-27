/**
 * Speed session shells must reach gradeSlice.modeCounts → adapter dominantMode=speed.
 * Run: node --test tests/learning/parent-report-speed-mode-aggregate.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../../lib/learning-supabase/seed-db-report-local-storage.js";

const FROM = new Date("2026-06-01");
const TO = new Date("2026-06-30");
const META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function student() {
  return { id: "stu-speed", full_name: "Speed Student", grade_level: "g1", is_active: true };
}

function practiceAnswer(sessionId, i, isCorrect) {
  return {
    id: `ans-${i}`,
    student_id: "stu-speed",
    learning_session_id: sessionId,
    question_id: `q-${i}`,
    is_correct: isCorrect,
    answered_at: "2026-06-15T10:00:00.000Z",
    created_at: "2026-06-15T10:00:00.000Z",
    answer_payload: {
      subject: "math",
      topic: "addition",
      gameMode: "practice",
      mode: "practice",
      gradeLevel: 1,
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      timeSpentMs: isCorrect ? 7000 : 900,
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
    },
  };
}

describe("speed session shells → aggregate → adapter → storage mode", () => {
  test("gradeSlice.modeCounts includes speed; dominantMode=speed when speed > practice", () => {
    const practiceSessionId = "sess-practice";
    const sessions = [
      {
        id: practiceSessionId,
        student_id: "stu-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-06-15T09:00:00.000Z",
        created_at: "2026-06-15T09:00:00.000Z",
        ended_at: "2026-06-15T09:30:00.000Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice", gameMode: "practice", gradeLevel: 1 },
      },
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `sess-speed-${i}`,
        student_id: "stu-speed",
        subject: "math",
        topic: "addition",
        started_at: `2026-06-15T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        created_at: `2026-06-15T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        ended_at: `2026-06-15T14:${String(i % 50).padStart(2, "0")}:45.000Z`,
        duration_seconds: 45,
        status: "completed",
        metadata: { mode: "speed", gameMode: "speed", gradeLevel: 1 },
      })),
    ];

    const answers = Array.from({ length: 22 }, (_, i) =>
      practiceAnswer(practiceSessionId, i, i < 15),
    );

    const raw = aggregateReportPayloadFromActivityRows(
      student(),
      sessions,
      answers,
      FROM,
      TO,
      META,
    );

    const topicAgg = raw.subjects.math.topics.addition;
    assert.ok(topicAgg, "topic aggregate exists");
    assert.ok((topicAgg.modeCounts.speed || 0) >= 40, "parent topic speed shells counted");
    assert.ok((topicAgg.modeCounts.practice || 0) >= 1, "parent topic practice session counted");

    const unknownSlice = topicAgg.byContentGrade?.unknown;
    assert.ok(unknownSlice, "unknown grade slice exists for g1 practice");
    assert.ok(
      (unknownSlice.modeCounts.speed || 0) >= 40,
      `gradeSlice speed expected >=40, got ${unknownSlice.modeCounts.speed || 0}`,
    );
    assert.ok(
      (unknownSlice.modeCounts.practice || 0) >= 22,
      `gradeSlice practice expected >=22, got ${unknownSlice.modeCounts.practice || 0}`,
    );
    assert.ok(
      unknownSlice.modeCounts.speed > unknownSlice.modeCounts.practice,
      "speed must dominate grade slice modeCounts",
    );

    const dbInput = buildReportInputFromDbData(raw, { period: "custom", timezone: "UTC" });
    const topicRecord = Object.values(dbInput.subjects.math.topics).find(
      (t) => t.topicBaseKey === "addition",
    );
    assert.ok(topicRecord, "adapter topic record exists");
    assert.equal(topicRecord.dominantMode, "speed", "adapter dominantMode must be speed");

    const store = new Map();
    seedLocalStorageFromDbReportInput(store, dbInput);
    const tracking = JSON.parse(store.get("mleo_time_tracking"));
    const session = tracking.operations.addition.sessions[0];
    assert.equal(session.mode, "speed", "storage session mode must be speed");
  });
});
