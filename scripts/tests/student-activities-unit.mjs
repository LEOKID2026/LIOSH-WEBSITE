import assert from "node:assert/strict";
import {
  mapStudentActivityRow,
  parseCreateStudentActivityBody,
} from "../../lib/teacher-server/student-activity.server.js";

function testMapStudentActivityRow() {
  const row = {
    id: "a0000000-0000-4000-8000-000000000001",
    teacher_id: "t0000000-0000-4000-8000-000000000002",
    student_id: "s0000000-0000-4000-8000-000000000003",
    title: "Fractions",
    subject: "math",
    topic: "fractions",
    subtopic: null,
    skill_key: null,
    difficulty_level: "medium",
    question_count: 5,
    mode: "homework",
    question_selection: "same_exact",
    time_limit_seconds: null,
    due_at: null,
    status: "draft",
    activated_at: null,
    closed_at: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const mapped = mapStudentActivityRow(row);
  assert.equal(mapped.scope, "student");
  assert.equal(mapped.activityId, row.id);
  assert.equal(mapped.studentId, row.student_id);
  assert.equal(mapped.questionCount, 5);
}

function testParseCreateRejectsLiveLesson() {
  const body = {
    studentId: "a0000000-0000-4000-8000-000000000001",
    title: "Test",
    subject: "math",
    topic: "add",
    mode: "live_lesson",
    questionCount: 3,
    questionSet: [
      { question: "1+1", correct_answer: "2" },
      { question: "2+2", correct_answer: "4" },
      { question: "3+3", correct_answer: "6" },
    ],
  };
  const parsed = parseCreateStudentActivityBody(body);
  assert.equal(parsed.ok, false);
}

function testParseCreateValidHomework() {
  const body = {
    studentId: "a0000000-0000-4000-8000-000000000001",
    title: "Test activity",
    subject: "math",
    topic: "addition",
    mode: "homework",
    questionCount: 2,
    questionSet: [
      { question: "1+1", correct_answer: "2" },
      { question: "2+2", correct_answer: "4" },
    ],
  };
  const parsed = parseCreateStudentActivityBody(body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.mode, "homework");
  assert.equal(parsed.payload.questionCount, 2);
}

function testParseCreateRejectsBadStudentId() {
  const parsed = parseCreateStudentActivityBody({
    studentId: "not-a-uuid",
    title: "T",
    subject: "math",
    topic: "x",
    mode: "homework",
    questionCount: 1,
    questionSet: [{ question: "q", correct_answer: "a" }],
  });
  assert.equal(parsed.ok, false);
}

testMapStudentActivityRow();
testParseCreateRejectsLiveLesson();
testParseCreateValidHomework();
testParseCreateRejectsBadStudentId();

console.log("student-activities-unit: ok");
