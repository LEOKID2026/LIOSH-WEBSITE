/**
 * Parent activity truth contract — aggregation inclusion, no separate report label.
 * Run: node --test tests/truth-gates/parent-activity-truth-contract.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateReportPayloadFromActivityRows,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

test("parent activity answers roll into general subject/topic totals", () => {
  const student = { id: "stu-pa", full_name: "Kid", grade_level: "grade_3" };
  const payload = aggregateReportPayloadFromActivityRows(
    student,
    [],
    [],
    new Date("2026-05-01T00:00:00.000Z"),
    new Date("2026-05-30T00:00:00.000Z"),
    { sessionsFilterField: "started_at", answersFilterField: "answered_at" },
    [
      {
        activity_id: "act-truth",
        question_index: 0,
        is_correct: true,
        hints_used: 0,
        time_spent_ms: 8000,
        answered_at: "2026-05-15T12:00:00.000Z",
        question_snapshot: { creditedTimeMs: 8000 },
        parent_assigned_activities: {
          subject: "math",
          topic: "addition",
          mode: "guided_practice",
          difficulty_level: "easy",
        },
      },
    ]
  );

  assert.equal(payload.subjects.math.answers, 1);
  assert.equal(payload.subjects.math.topics.addition.answers, 1);
  assert.equal(payload.summary.totalAnswers, 1);

  const pub = stripInternalReportPayloadFields(payload);
  assert.equal(pub.subjects.math.answers, 1);
  assert.equal(pub.subjects.math.topics.addition.answers, 1);
  assert.equal(pub.subjects.math.topics.addition.primaryEvidenceSource, undefined);
});

test("report pages must not expose separate parent-activity section labels in source", () => {
  for (const rel of ["pages/learning/parent-report.js", "pages/learning/parent-report-detailed.js"]) {
    const src = readFileSync(join(ROOT, rel), "utf8");
    assert.doesNotMatch(src, /פעילות\s*מהורה/u, `${rel} must not render separate parent-activity heading`);
    assert.doesNotMatch(src, /פעילות\s*אישית\s*מהורה/u, `${rel} must not render personal parent-activity heading`);
  }
});

test("parent activity API routes exist server-side", () => {
  const idx = readFileSync(join(ROOT, "pages/api/parent/activities/index.js"), "utf8");
  assert.match(idx, /createParentActivity/);
  assert.match(idx, /requireParentApiContext/);
  assert.doesNotMatch(idx, /localStorage/u);
});
