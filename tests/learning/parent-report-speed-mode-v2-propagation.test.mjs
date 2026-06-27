/**
 * aggregate modeCounts → adapter → V2 row.modeKey = speed
 * Run: node --test tests/learning/parent-report-speed-mode-v2-propagation.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildParentReportV2FromAggregate } from "../../scripts/qa/lib/mass-virtual-students/report-v2-bridge.mjs";
import { collectTopicEngineRowsFromReport } from "../../utils/parent-report-engine-insights-he.js";

const FROM = new Date("2026-06-01");
const TO = new Date("2026-06-30");
const META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function student() {
  return { id: "stu-v2-speed", full_name: "Speed V2", grade_level: "g1", is_active: true };
}

describe("aggregate speed modeCounts → V2 row.modeKey", () => {
  test("two grade slices: g1 speed-dominant row keeps modeKey=speed after collapse", async () => {
    const practiceSessionId = "sess-practice";
    const sessions = [
      {
        id: practiceSessionId,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-06-15T09:00:00.000Z",
        created_at: "2026-06-15T09:00:00.000Z",
        ended_at: "2026-06-15T09:30:00.000Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice", gameMode: "practice", gradeLevel: 1, contentGradeLevel: "g1" },
      },
      ...Array.from({ length: 49 }, (_, i) => ({
        id: `sess-speed-${i}`,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        created_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        ended_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:45.000Z`,
        duration_seconds: 45,
        status: "completed",
        metadata: { mode: "speed", gameMode: "speed", gradeLevel: 1, contentGradeLevel: "g1" },
      })),
      {
        id: "sess-old",
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-06-01T09:00:00.000Z",
        created_at: "2026-06-01T09:00:00.000Z",
        ended_at: "2026-06-01T09:30:00.000Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice", gameMode: "practice", gradeLevel: 1 },
      },
    ];

    const answers = [
      ...Array.from({ length: 22 }, (_, i) => ({
        id: `ans-g1-${i}`,
        student_id: "stu-v2-speed",
        learning_session_id: practiceSessionId,
        question_id: `q-g1-${i}`,
        is_correct: i < 15,
        answered_at: "2026-06-15T10:00:00.000Z",
        created_at: "2026-06-15T10:00:00.000Z",
        answer_payload: {
          subject: "math",
          topic: "addition",
          mode: "practice",
          gameMode: "practice",
          gradeLevel: 1,
          contentGradeLevel: "g1",
          isDiagnosticEligible: true,
          evidenceCategory: "diagnostic_independent",
          timeSpentMs: 800,
        },
      })),
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `ans-unk-${i}`,
        student_id: "stu-v2-speed",
        learning_session_id: "sess-old",
        question_id: `q-unk-${i}`,
        is_correct: i < 9,
        answered_at: "2026-06-02T10:00:00.000Z",
        created_at: "2026-06-02T10:00:00.000Z",
        answer_payload: {
          subject: "math",
          topic: "addition",
          mode: "practice",
          gameMode: "practice",
          gradeLevel: 1,
          isDiagnosticEligible: true,
          evidenceCategory: "diagnostic_independent",
          timeSpentMs: 5000,
        },
      })),
    ];

    const raw = aggregateReportPayloadFromActivityRows(student(), sessions, answers, FROM, TO, META);
    const g1Slice = raw.subjects.math.topics.addition.byContentGrade?.g1;
    assert.ok(g1Slice, "g1 grade slice exists");
    assert.ok((g1Slice.modeCounts.speed || 0) > (g1Slice.modeCounts.practice || 0), "g1 slice speed dominates");

    const v2 = await buildParentReportV2FromAggregate(raw, {
      studentName: "Speed V2",
      fromDate: FROM,
      toDate: TO,
    });

    const row = v2.mathOperations["addition::grade:g1"];
    assert.ok(row, "V2 row for addition::grade:g1");
    assert.equal(row.modeKey, "speed", `expected modeKey=speed, got ${row.modeKey}`);

    const engineRows = collectTopicEngineRowsFromReport(v2);
    const engineRow = engineRows.find((r) => r.topicKey === "addition::grade:g1");
    assert.ok(engineRow, "engine row exists");
    assert.equal(engineRow.modeKey, "speed", "collectTopicEngineRowsFromReport exposes modeKey");
  });

  test("in-range practice row inherits speed modeCounts from out-of-range speed session on same grade", async () => {
    const practiceSessionId = "sess-practice-in-range";
    const sessions = [
      {
        id: practiceSessionId,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-06-15T09:00:00.000Z",
        created_at: "2026-06-15T09:00:00.000Z",
        ended_at: "2026-06-15T09:30:00.000Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice", gameMode: "practice", gradeLevel: 1, contentGradeLevel: "g1" },
      },
      ...Array.from({ length: 49 }, (_, i) => ({
        id: `sess-speed-future-${i}`,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-07-15T14:00:00.000Z",
        created_at: "2026-07-15T14:00:00.000Z",
        ended_at: "2026-07-15T14:00:45.000Z",
        duration_seconds: 45,
        status: "completed",
        metadata: { mode: "speed", gameMode: "speed", gradeLevel: 1, contentGradeLevel: "g1" },
      })),
    ];

    const answers = Array.from({ length: 18 }, (_, i) => ({
      id: `ans-g1-${i}`,
      student_id: "stu-v2-speed",
      learning_session_id: practiceSessionId,
      question_id: `q-g1-${i}`,
      is_correct: i < 12,
      answered_at: "2026-06-15T10:00:00.000Z",
      created_at: "2026-06-15T10:00:00.000Z",
      answer_payload: {
        subject: "math",
        topic: "addition",
        mode: "practice",
        gameMode: "practice",
        gradeLevel: 1,
        contentGradeLevel: "g1",
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        timeSpentMs: 800,
      },
    }));

    const raw = aggregateReportPayloadFromActivityRows(student(), sessions, answers, FROM, TO, META);
    const g1Slice = raw.subjects.math.topics.addition.byContentGrade?.g1;
    assert.ok(g1Slice, "g1 grade slice exists");
    assert.ok((g1Slice.modeCounts.speed || 0) > (g1Slice.modeCounts.practice || 0), "g1 slice speed dominates");

    const v2 = await buildParentReportV2FromAggregate(raw, {
      studentName: "Speed V2",
      fromDate: FROM,
      toDate: TO,
    });

    const row = v2.mathOperations["addition::grade:g1"];
    assert.ok(row, "V2 row for addition::grade:g1");
    assert.equal(row.modeKey, "speed", `expected modeKey=speed, got ${row.modeKey}`);
  });

  test("cohort timestamps after now on end day clamp into V2 session range", async () => {
    const runNow = new Date("2026-06-27T03:54:00.000Z");
    const practiceSessionId = "sess-future-same-day";
    const sessions = [
      {
        id: practiceSessionId,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: "2026-06-27T13:00:00.000Z",
        created_at: "2026-06-27T13:00:00.000Z",
        ended_at: "2026-06-27T13:30:00.000Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice", gameMode: "practice", gradeLevel: 1, contentGradeLevel: "g1" },
      },
      ...Array.from({ length: 49 }, (_, i) => ({
        id: `sess-speed-future-${i}`,
        student_id: "stu-v2-speed",
        subject: "math",
        topic: "addition",
        started_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        created_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:00.000Z`,
        ended_at: `2026-06-27T14:${String(i % 50).padStart(2, "0")}:45.000Z`,
        duration_seconds: 45,
        status: "completed",
        metadata: { mode: "speed", gameMode: "speed", gradeLevel: 1, contentGradeLevel: "g1" },
      })),
    ];

    const answers = Array.from({ length: 22 }, (_, i) => ({
      id: `ans-future-${i}`,
      student_id: "stu-v2-speed",
      learning_session_id: practiceSessionId,
      question_id: `q-future-${i}`,
      is_correct: i < 15,
      answered_at: "2026-06-27T13:57:00.000Z",
      created_at: "2026-06-27T13:57:00.000Z",
      answer_payload: {
        subject: "math",
        topic: "addition",
        mode: "practice",
        gameMode: "practice",
        gradeLevel: 1,
        contentGradeLevel: "g1",
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        timeSpentMs: 800,
      },
    }));

    const raw = aggregateReportPayloadFromActivityRows(student(), sessions, answers, FROM, TO, META);
    const { buildReportInputFromDbData } = await import("../../lib/learning-supabase/report-data-adapter.js");
    const { seedLocalStorageFromDbReportInput } = await import("../../lib/learning-supabase/seed-db-report-local-storage.js");
    const { generateParentReportV2 } = await import("../../utils/parent-report-v2.js");
    const { runWithParentReportRebuildLock } = await import("../../lib/parent-server/db-input-to-detailed-report.server.js");

    const dbInput = buildReportInputFromDbData(raw, { period: "custom", timezone: "UTC" });
    const from = FROM.toISOString().slice(0, 10);
    const to = TO.toISOString().slice(0, 10);

    const v2 = await runWithParentReportRebuildLock(async () => {
      const store = new Map();
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      };
      globalThis.window = globalThis;
      store.set("mleo_player_name", "Speed V2");
      seedLocalStorageFromDbReportInput(store, dbInput, { nowMs: runNow.getTime() });
      return generateParentReportV2("Speed V2", "custom", from, to, runNow);
    });

    const row = v2.mathOperations["addition::grade:g1"];
    assert.ok(row, "g1 row survives now-capped V2 filter");
    assert.equal(row.modeKey, "speed", `expected modeKey=speed after now clamp, got ${row.modeKey}`);
  });
});
