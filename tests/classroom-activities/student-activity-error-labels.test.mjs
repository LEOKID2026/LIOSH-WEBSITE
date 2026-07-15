import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  formatStudentActivityErrorHe,
  isInternalLookingStudentActivityErrorCode,
  resolveStudentActivityApiErrorHe,
} from "../../lib/classroom-activities/student-activity-error-labels.client.js";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const studentActivitySrc = readFileSync(
  join(repoRoot, "../../pages/student/activity/[activityId].js"),
  "utf8"
);

test("activity_not_available maps to Hebrew", () => {
  assert.equal(
    formatStudentActivityErrorHe("activity_not_available"),
    "הפעילות אינה זמינה כרגע"
  );
  assert.equal(
    resolveStudentActivityApiErrorHe({ error: "activity_not_available" }),
    "הפעילות אינה זמינה כרגע"
  );
});

test("unknown snake_case errors use safe Hebrew fallback", () => {
  assert.equal(
    formatStudentActivityErrorHe("mystery_internal_code"),
    "לא ניתן לפתוח את הפעילות כרגע"
  );
  assert.equal(
    resolveStudentActivityApiErrorHe({ error: "mystery_internal_code" }),
    "לא ניתן לפתוח את הפעילות כרגע"
  );
});

test("English API literals map to Hebrew", () => {
  assert.equal(
    resolveStudentActivityApiErrorHe({ error: "Not authenticated" }),
    "נדרשת התחברות"
  );
  assert.equal(
    resolveStudentActivityApiErrorHe({ error: "Server error" }),
    "שגיאת שרת - נסו שוב"
  );
});

test("student activity page resolves API errors through Hebrew formatter", () => {
  assert.ok(studentActivitySrc.includes("resolveStudentActivityApiErrorHe"));
  assert.ok(!studentActivitySrc.includes("json?.error || json?.message"));
  assert.ok(!studentActivitySrc.includes('message: json?.error || "שמירת תשובה נכשלה"'));
});

test("student activity error UI does not render raw activity_not_available key", () => {
  assert.ok(!studentActivitySrc.includes("activity_not_available"));
});

test("student activity error screen keeps return-home link", () => {
  const errorBlock = studentActivitySrc.slice(
    studentActivitySrc.indexOf('if (phase === "error")'),
    studentActivitySrc.indexOf('if (phase === "done" && finished)')
  );
  assert.ok(errorBlock.includes("חזרה לבית"));
  assert.ok(errorBlock.includes("{error}"));
});

test("internal-looking codes are detected", () => {
  assert.equal(isInternalLookingStudentActivityErrorCode("activity_not_available"), true);
  assert.equal(isInternalLookingStudentActivityErrorCode("Oops!"), false);
});

test("student activity completion still uses count summary without percentages", () => {
  assert.ok(studentActivitySrc.includes("formatStudentActivityCompletionSummaryHe"));
  const doneStart = studentActivitySrc.indexOf('if (phase === "done" && finished)');
  const doneEnd = studentActivitySrc.indexOf(
    "const isDiscussion = activity?.mode === \"discussion\";",
    doneStart
  );
  const doneBlock = studentActivitySrc.slice(doneStart, doneEnd);
  assert.ok(!doneBlock.includes("scorePct}%"));
  assert.ok(doneBlock.includes("formatStudentActivityCompletionSummaryHe"));
});

test("common student activity error codes map to Hebrew", () => {
  assert.equal(formatStudentActivityErrorHe("activity_not_started"), "הפעילות עדיין לא התחילה");
  assert.equal(formatStudentActivityErrorHe("forbidden"), "אין הרשאה לפתוח את הפעילות");
  assert.equal(formatStudentActivityErrorHe("not_assigned"), "הפעילות לא משויכת אליך");
  assert.equal(formatStudentActivityErrorHe("already_submitted"), "כבר הגשת את הפעילות");
});
