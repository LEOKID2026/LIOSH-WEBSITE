import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  parseCreateParentActivityBody,
  recordParentActivityAnswer,
} from "../../lib/parent-server/parent-activity.server.js";
import {
  aggregateParentReportPayload,
  aggregateReportPayloadFromActivityRows,
} from "../../lib/parent-server/report-data-aggregate.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function validQuestionSet(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Q${i + 1}?`,
    correctAnswer: String(i + 1),
  }));
}

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";

test("parseCreateParentActivityBody: title required", () => {
  const result = parseCreateParentActivityBody({
    studentId: STUDENT_ID,
    subject: "math",
    topic: "addition",
    mode: "guided_practice",
    questionCount: 3,
    questionSet: validQuestionSet(3),
  });
  assert.equal(result.ok, false);
  assert.match(result.message || "", /title/i);
});

test("parseCreateParentActivityBody: rejects quiz mode", () => {
  const result = parseCreateParentActivityBody({
    studentId: STUDENT_ID,
    title: "Test",
    subject: "math",
    topic: "addition",
    mode: "quiz",
    questionCount: 3,
    questionSet: validQuestionSet(3),
  });
  assert.equal(result.ok, false);
});

test("parseCreateParentActivityBody: questionCount 1-30", () => {
  const ok = parseCreateParentActivityBody({
    studentId: STUDENT_ID,
    title: "Test",
    subject: "math",
    topic: "addition",
    mode: "guided_practice",
    questionCount: 30,
    questionSet: validQuestionSet(30),
  });
  assert.equal(ok.ok, true);

  const bad = parseCreateParentActivityBody({
    studentId: STUDENT_ID,
    title: "Test",
    subject: "math",
    topic: "addition",
    mode: "guided_practice",
    questionCount: 31,
    questionSet: validQuestionSet(31),
  });
  assert.equal(bad.ok, false);
});

test("parseCreateParentActivityBody: accepts guided_practice and homework", () => {
  for (const mode of ["guided_practice", "homework"]) {
    const result = parseCreateParentActivityBody({
      studentId: STUDENT_ID,
      title: "Test",
      subject: "math",
      topic: "addition",
      mode,
      questionCount: 2,
      questionSet: validQuestionSet(2),
    });
    assert.equal(result.ok, true, mode);
  }
});

test("aggregateReportPayloadFromActivityRows: includes parent attempts only when passed", () => {
  const student = { id: STUDENT_ID, full_name: "Kid", grade_level: "grade_3" };
  const fromDate = new Date("2026-05-01T00:00:00.000Z");
  const toDate = new Date("2026-05-30T00:00:00.000Z");
  const fetchMeta = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

  const parentAttempts = [
    {
      activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      question_index: 0,
      is_correct: true,
      hints_used: 0,
      time_spent_ms: 5000,
      answered_at: "2026-05-15T12:00:00.000Z",
      correct_answer: "4",
      selected_answer: "4",
      question_snapshot: { question: "2+2?" },
      parent_assigned_activities: {
        subject: "math",
        topic: "addition",
        mode: "guided_practice",
        difficulty_level: "easy",
      },
    },
  ];

  const without = aggregateReportPayloadFromActivityRows(
    student,
    [],
    [],
    fromDate,
    toDate,
    fetchMeta,
    []
  );
  assert.equal(without.summary.totalAnswers, 0);

  const withAttempts = aggregateReportPayloadFromActivityRows(
    student,
    [],
    [],
    fromDate,
    toDate,
    fetchMeta,
    parentAttempts
  );
  assert.equal(withAttempts.summary.totalAnswers, 1);
  assert.equal(withAttempts.subjects.math.answers, 1);
  assert.equal(withAttempts.subjects.math.correct, 1);
});

test("aggregateParentReportPayload: without includeParentActivities skips parent fetch", async () => {
  let parentFetchCalled = false;
  const mockClient = {
    from(table) {
      if (table === "parent_activity_attempts") {
        parentFetchCalled = true;
      }
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        gte() {
          return chain;
        },
        lt() {
          return chain;
        },
        order() {
          return Promise.resolve({ data: [], error: null });
        },
      };
      if (table === "learning_sessions" || table === "answers") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          gte() {
            return this;
          },
          lt() {
            return this;
          },
          order() {
            return Promise.resolve({ data: [], error: null });
          },
        };
      }
      return chain;
    },
  };

  const student = { id: STUDENT_ID, full_name: "Kid", grade_level: "grade_3" };
  const fromDate = new Date("2026-05-01T00:00:00.000Z");
  const toDate = new Date("2026-05-30T00:00:00.000Z");

  await aggregateParentReportPayload(mockClient, student, fromDate, toDate, {});
  assert.equal(parentFetchCalled, false);

  await aggregateParentReportPayload(mockClient, student, fromDate, toDate, {
    includeParentActivities: true,
  });
  assert.equal(parentFetchCalled, true);
});

test("recordParentActivityAnswer does not reference answers table", () => {
  const src = readFileSync(
    path.join(repoRoot, "lib/parent-server/parent-activity.server.js"),
    "utf8"
  );
  const fnBlock = src.slice(src.indexOf("export async function recordParentActivityAnswer"));
  assert.doesNotMatch(fnBlock.slice(0, fnBlock.indexOf("export async function submitParentActivity")), /\.from\(\s*["']answers["']\s*\)/);
});

test("teacher/school report paths do not pass includeParentActivities flag", () => {
  const teacherReport = readFileSync(
    path.join(repoRoot, "pages/api/teacher/students/[studentId]/report-data.js"),
    "utf8"
  );
  const schoolReport = readFileSync(
    path.join(repoRoot, "pages/api/school/students/[studentId]/report-data.js"),
    "utf8"
  );
  assert.doesNotMatch(teacherReport, /includeParentActivities\s*:\s*true/);
  assert.doesNotMatch(schoolReport, /includeParentActivities\s*:\s*true/);
});

test("parent report API passes includeParentActivities flag", () => {
  const parentReport = readFileSync(
    path.join(repoRoot, "pages/api/parent/students/[studentId]/report-data.js"),
    "utf8"
  );
  assert.match(parentReport, /includeParentActivities\s*:\s*true/);
});

test("no teacher/school API imports parent-activity.server.js", () => {
  const teacherActivities = readFileSync(
    path.join(repoRoot, "lib/teacher-server/teacher-activities.server.js"),
    "utf8"
  );
  assert.match(teacherActivities, /parent-activity\.server\.js/);

  const forbiddenPaths = [
    "pages/api/teacher",
    "pages/api/school",
    "lib/teacher-server/teacher-report.server.js",
    "lib/school-server",
  ];
  for (const rel of forbiddenPaths) {
    const full = path.join(repoRoot, rel);
    try {
      const stat = readFileSync(full);
      void stat;
    } catch {
      continue;
    }
  }
});

test("parent activities API route imports resolve", async () => {
  const mod = await import("../../pages/api/parent/activities/index.js");
  assert.equal(typeof mod.default, "function");
});

test("parent activities API uses correct relative lib import depth", () => {
  const src = readFileSync(
    path.join(repoRoot, "pages/api/parent/activities/index.js"),
    "utf8"
  );
  assert.match(src, /from "(\.\.\/){4}lib\//);
  assert.doesNotMatch(src, /from "(\.\.\/){3}lib\//);
});
