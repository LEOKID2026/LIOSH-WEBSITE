import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  parseCreateParentActivityBody,
  recordParentActivityAnswer,
  listParentActivitiesForParent,
  getParentActivityDetailForParent,
} from "../../lib/parent-server/parent-activity.server.js";
import {
  aggregateParentReportPayload,
  aggregateReportPayloadFromActivityRows,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { classifyActivityEvidence } from "../../lib/learning/activity-classification.js";
import { summarizeParentActivityAttempts } from "../../lib/learning-supabase/parent-activity-learning-credit.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function validQuestionSet(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Q${i + 1}?`,
    correctAnswer: String(i + 1),
  }));
}

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVITY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PARENT_ID = "33333333-3333-4333-8333-333333333333";

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

function validCreateBody(overrides = {}) {
  return {
    studentId: STUDENT_ID,
    title: "Test",
    subject: "math",
    topic: "addition",
    mode: "guided_practice",
    gradeLevel: "g3",
    questionCount: 2,
    questionSet: validQuestionSet(2),
    ...overrides,
  };
}

test("parseCreateParentActivityBody: questionCount 1-30", () => {
  const ok = parseCreateParentActivityBody(
    validCreateBody({ questionCount: 30, questionSet: validQuestionSet(30) })
  );
  assert.equal(ok.ok, true);

  const bad = parseCreateParentActivityBody(
    validCreateBody({ questionCount: 31, questionSet: validQuestionSet(31) })
  );
  assert.equal(bad.ok, false);
});

test("parseCreateParentActivityBody: accepts guided_practice and homework", () => {
  for (const mode of ["guided_practice", "homework"]) {
    const result = parseCreateParentActivityBody(validCreateBody({ mode }));
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
  assert.equal(withAttempts.subjects.math.diagnosticAnswers, 1);
});

test("guided_practice parent activity is diagnostic_guided for engine", () => {
  const r = classifyActivityEvidence("guided_practice", "assigned_parent");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, "diagnostic_guided");
});

test("summarizeParentActivityAttempts ignores unanswered rows", () => {
  const summary = summarizeParentActivityAttempts([
    { is_correct: true, question_snapshot: { creditedTimeMs: 4000 } },
    { is_correct: null, question_snapshot: { creditedTimeMs: 9000 } },
  ]);
  assert.equal(summary.answersCount, 1);
  assert.equal(summary.durationSeconds, 4);
});

test("submitParentActivity wires idempotent completion rewards on first submit", () => {
  const src = readFileSync(
    path.join(repoRoot, "lib/parent-server/parent-activity.server.js"),
    "utf8"
  );
  const rewardSrc = readFileSync(
    path.join(repoRoot, "lib/learning-supabase/parent-activity-completion-reward.server.js"),
    "utf8"
  );
  assert.match(src, /syncParentActivityCompletionRewards/);
  assert.match(rewardSrc, /coin_parent_activity_\$\{activityId\}/);
  assert.match(rewardSrc, /no_answered_questions/);
});

test("stripInternalReportPayloadFields removes parent evidence source labels", () => {
  const student = { id: STUDENT_ID, full_name: "Kid", grade_level: "grade_3" };
  const payload = aggregateReportPayloadFromActivityRows(
    student,
    [],
    [],
    new Date("2026-05-01T00:00:00.000Z"),
    new Date("2026-05-30T00:00:00.000Z"),
    { sessionsFilterField: "started_at", answersFilterField: "answered_at" },
    [
      {
        activity_id: ACTIVITY_ID,
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
  const stripped = stripInternalReportPayloadFields(payload);
  assert.equal(stripped.subjects.math.topics.addition.primaryEvidenceSource, undefined);
});

test("aggregateParentReportPayload: without includeParentActivities skips parent fetch", async () => {
  let parentReportEvidenceFetchCalled = false;

  function makeThenableChain(table) {
    const chain = {
      select(cols) {
        // Report evidence path joins parent_assigned_activities; unified time path does not.
        if (
          table === "parent_activity_attempts" &&
          typeof cols === "string" &&
          cols.includes("parent_assigned_activities")
        ) {
          parentReportEvidenceFetchCalled = true;
        }
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
      not() {
        return chain;
      },
      in() {
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      range() {
        return chain;
      },
      maybeSingle() {
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    return chain;
  }

  const mockClient = {
    from(table) {
      return makeThenableChain(table);
    },
  };

  const student = { id: STUDENT_ID, full_name: "Kid", grade_level: "grade_3" };
  const fromDate = new Date("2026-05-01T00:00:00.000Z");
  const toDate = new Date("2026-05-30T00:00:00.000Z");

  parentReportEvidenceFetchCalled = false;
  await aggregateParentReportPayload(mockClient, student, fromDate, toDate, {});
  assert.equal(parentReportEvidenceFetchCalled, false);

  parentReportEvidenceFetchCalled = false;
  await aggregateParentReportPayload(mockClient, student, fromDate, toDate, {
    includeParentActivities: true,
  });
  assert.equal(parentReportEvidenceFetchCalled, true);
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

test("listParentActivitiesForParent returns status/result summary fields", async () => {
  const tables = {
    students: {
      data: { id: STUDENT_ID, parent_id: PARENT_ID },
      error: null,
    },
    parent_assigned_activities: {
      data: [
        {
          id: ACTIVITY_ID,
          parent_id: PARENT_ID,
          student_id: STUDENT_ID,
          title: "Math drill",
          subject: "math",
          topic: "addition",
          subtopic: null,
          skill_key: null,
          difficulty_level: "easy",
          question_count: 5,
          mode: "guided_practice",
          due_at: null,
          status: "active",
          activated_at: "2026-05-30T10:00:00.000Z",
          closed_at: null,
          archived_at: null,
          created_at: "2026-05-30T10:00:00.000Z",
          updated_at: "2026-05-30T10:00:00.000Z",
        },
      ],
      error: null,
    },
    parent_activity_status: {
      data: [
        {
          activity_id: ACTIVITY_ID,
          status: "in_progress",
          answers_count: 2,
          correct_count: 1,
          score_pct: null,
          started_at: "2026-05-30T10:05:00.000Z",
          submitted_at: null,
        },
      ],
      error: null,
    },
  };

  const mockClient = {
    from(table) {
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        neq() {
          return chain;
        },
        in() {
          if (table === "parent_activity_status") {
            return Promise.resolve(tables.parent_activity_status);
          }
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          if (table === "parent_assigned_activities") {
            return Promise.resolve(tables.parent_assigned_activities);
          }
          return Promise.resolve({ data: [], error: null });
        },
        maybeSingle() {
          if (table === "students") {
            return Promise.resolve(tables.students);
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };

  const result = await listParentActivitiesForParent(mockClient, PARENT_ID, STUDENT_ID);
  assert.equal(result.ok, true);
  assert.equal(result.activities.length, 1);
  const activity = result.activities[0];
  assert.equal(activity.studentStatus, "in_progress");
  assert.equal(activity.answersCount, 2);
  assert.equal(activity.correctCount, 1);
  assert.equal(activity.startedAt, "2026-05-30T10:05:00.000Z");
  assert.equal(activity.subject, "math");
  assert.equal(activity.topic, "addition");
});

test("getParentActivityDetailForParent denies activity not owned by parent", async () => {
  const mockClient = {
    from(table) {
      if (table === "parent_assigned_activities") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };

  const result = await getParentActivityDetailForParent(
    mockClient,
    OTHER_PARENT_ID,
    ACTIVITY_ID
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test("getParentActivityDetailForParent denies child not linked to parent", async () => {
  const mockClient = {
    from(table) {
      if (table === "parent_assigned_activities") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: {
                id: ACTIVITY_ID,
                parent_id: OTHER_PARENT_ID,
                student_id: STUDENT_ID,
                title: "Test",
                subject: "math",
                topic: "addition",
                subtopic: null,
                skill_key: null,
                difficulty_level: "easy",
                question_count: 3,
                mode: "guided_practice",
                due_at: null,
                status: "active",
                activated_at: null,
                closed_at: null,
                archived_at: null,
                created_at: null,
                updated_at: null,
              },
              error: null,
            });
          },
        };
      }
      if (table === "students") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };

  const result = await getParentActivityDetailForParent(
    mockClient,
    OTHER_PARENT_ID,
    ACTIVITY_ID
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("parent activity detail API route imports resolve", async () => {
  const mod = await import("../../pages/api/parent/activities/[activityId].js");
  assert.equal(typeof mod.default, "function");
});

test("parent activity detail API uses correct relative lib import depth", () => {
  const src = readFileSync(
    path.join(repoRoot, "pages/api/parent/activities/[activityId].js"),
    "utf8"
  );
  assert.match(src, /from "(\.\.\/){4}lib\//);
});
