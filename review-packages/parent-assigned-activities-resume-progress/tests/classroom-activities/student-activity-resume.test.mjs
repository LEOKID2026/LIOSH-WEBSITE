import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildStudentActivityResumePayload,
  computeResumeQuestionIndex,
  mapAttemptRowsForStudentResume,
} from "../../lib/classroom-activities/student-activity-resume.shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("computeResumeQuestionIndex: first unanswered after saved attempts", () => {
  const attempts = [
    { questionIndex: 0, isCorrect: false },
    { questionIndex: 2, isCorrect: true },
  ];
  assert.equal(computeResumeQuestionIndex(attempts, 5), 1);
});

test("computeResumeQuestionIndex: all answered returns last question", () => {
  const attempts = [
    { questionIndex: 0, isCorrect: true },
    { questionIndex: 1, isCorrect: false },
  ];
  assert.equal(computeResumeQuestionIndex(attempts, 2), 1);
});

test("mapAttemptRowsForStudentResume maps DB rows", () => {
  const attempts = mapAttemptRowsForStudentResume([
    { question_index: 1, selected_answer: "4", is_correct: true },
    { question_index: 0, selected_answer: "2", is_correct: false },
  ]);
  assert.deepEqual(attempts, [
    { questionIndex: 0, selectedAnswer: "2", isCorrect: false },
    { questionIndex: 1, selectedAnswer: "4", isCorrect: true },
  ]);
});

test("buildStudentActivityResumePayload returns attempts and resume index", () => {
  const payload = buildStudentActivityResumePayload(
    [{ question_index: 0, selected_answer: "7", is_correct: true }],
    3
  );
  assert.equal(payload.resumeQuestionIndex, 1);
  assert.equal(payload.attempts.length, 1);
});

test("start handlers return resume payload fields", () => {
  for (const file of [
    "lib/parent-server/parent-activity.server.js",
    "lib/teacher-server/student-activity-play.server.js",
    "lib/teacher-server/teacher-activities.server.js",
  ]) {
    const src = readFileSync(path.join(repoRoot, file), "utf8");
    assert.match(src, /loadStudentActivityResumePayload/);
    assert.match(src, /resumeQuestionIndex/);
    assert.match(src, /attempts:/);
  }
});

test("student activity page restores saved attempts on start", () => {
  const src = readFileSync(
    path.join(repoRoot, "pages/student/activity/[activityId].js"),
    "utf8"
  );
  assert.match(src, /resumeQuestionIndex/);
  assert.match(src, /savedAttempts/);
  assert.match(src, /buildSavedAttemptsMap/);
  assert.match(src, /savedAnswerDisplayText/);
  assert.match(src, /selectedAnswer != null/);
  assert.match(src, /readOnly=\{isCurrentQuestionAnswered\}/);
});

test("answer handlers reject duplicate question answers", () => {
  for (const file of [
    "lib/parent-server/parent-activity.server.js",
    "lib/teacher-server/student-activity-play.server.js",
    "lib/teacher-server/teacher-activities.server.js",
  ]) {
    const src = readFileSync(path.join(repoRoot, file), "utf8");
    assert.match(src, /assertStudentActivityQuestionNotAlreadyAnswered/);
  }
});
