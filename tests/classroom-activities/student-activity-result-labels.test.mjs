import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  formatStudentActivityCompletionSummaryHe,
  formatStudentActivityCompletionSummaryShortHe,
} from "../../lib/classroom-activities/student-activity-result-labels.client.js";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const studentActivitySrc = readFileSync(
  join(repoRoot, "../../pages/student/activity/[activityId].js"),
  "utf8"
);
const reportPageSrc = readFileSync(
  join(repoRoot, "../../pages/teacher/class/[classId]/activities/[activityId]/report.js"),
  "utf8"
);

test("formatStudentActivityCompletionSummaryHe uses preferred Hebrew wording", () => {
  assert.equal(formatStudentActivityCompletionSummaryHe(1, 5), "ענית נכון על 1 מתוך 5 שאלות");
  assert.equal(formatStudentActivityCompletionSummaryHe(4, 5), "ענית נכון על 4 מתוך 5 שאלות");
  assert.equal(formatStudentActivityCompletionSummaryHe(0, 5), "ענית נכון על 0 מתוך 5 שאלות");
});

test("formatStudentActivityCompletionSummaryShortHe uses compact count wording", () => {
  assert.equal(formatStudentActivityCompletionSummaryShortHe(1, 5), "1/5 שאלות");
});

test("student activity completion screen does not render percentage grades", () => {
  const doneStart = studentActivitySrc.indexOf('if (phase === "done" && finished)');
  const doneEnd = studentActivitySrc.indexOf(
    "const isDiscussion = activity?.mode === \"discussion\";",
    doneStart
  );
  const doneBlock = studentActivitySrc.slice(doneStart, doneEnd);
  assert.ok(!doneBlock.includes("scorePct}%"));
  assert.ok(!doneBlock.includes("{finished.scorePct}"));
  assert.ok(doneBlock.includes("formatStudentActivityCompletionSummaryHe"));
});

test("student activity completion screen shows correct-answer count wording", () => {
  assert.ok(studentActivitySrc.includes("formatStudentActivityCompletionSummaryHe("));
  assert.ok(studentActivitySrc.includes("finished.correctCount"));
  assert.ok(studentActivitySrc.includes("finished.questionCount"));
});

test("teacher activity report still includes percentage analytics", () => {
  assert.ok(reportPageSrc.includes("scorePct"));
  assert.ok(reportPageSrc.includes("%"));
});

test("student completion UI does not expose raw internal keys", () => {
  const doneStart = studentActivitySrc.indexOf('if (phase === "done" && finished)');
  const doneEnd = studentActivitySrc.indexOf(
    "const isDiscussion = activity?.mode === \"discussion\";",
    doneStart
  );
  const doneBlock = studentActivitySrc.slice(doneStart, doneEnd);
  assert.ok(!doneBlock.includes("score_pct"));
  assert.ok(!doneBlock.includes("correct_count"));
  assert.ok(!doneBlock.includes("question_count"));
});
