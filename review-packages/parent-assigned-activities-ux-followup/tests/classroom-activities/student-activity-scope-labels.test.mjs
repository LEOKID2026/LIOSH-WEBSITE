import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  normalizeStudentActivityScope,
  studentActivityScopeBadgeHe,
} from "../../lib/classroom-activities/student-activity-scope-labels.client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("studentActivityScopeBadgeHe: parent renders פעילות אישית", () => {
  assert.equal(studentActivityScopeBadgeHe("parent"), "פעילות אישית");
});

test("studentActivityScopeBadgeHe: class has no badge", () => {
  assert.equal(studentActivityScopeBadgeHe("class"), null);
  assert.equal(studentActivityScopeBadgeHe(undefined), null);
});

test("studentActivityScopeBadgeHe: student keeps existing individual badge", () => {
  assert.equal(studentActivityScopeBadgeHe("student"), "אישי");
});

test("normalizeStudentActivityScope maps scopes safely", () => {
  assert.equal(normalizeStudentActivityScope("class"), "class");
  assert.equal(normalizeStudentActivityScope("student"), "student");
  assert.equal(normalizeStudentActivityScope("parent"), "parent");
  assert.equal(normalizeStudentActivityScope(undefined), "class");
});

test("StudentClassroomActivitiesPanel: parent scope not grouped as classroom", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentClassroomActivitiesPanel.jsx"),
    "utf8"
  );
  assert.match(src, /normalizeStudentActivityScope\(a\.scope\) === "class"/);
  assert.match(src, /normalizeStudentActivityScope\(a\.scope\) === "parent"/);
  assert.match(src, /studentActivityScopeBadgeHe\("parent"\)/);
  assert.match(src, /פעילויות כיתה/);
  assert.doesNotMatch(src, /a\.scope !== "student"/);
});

test("StudentClassroomActivitiesPanel: class section keeps classroom title", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentClassroomActivitiesPanel.jsx"),
    "utf8"
  );
  assert.match(src, /פעילויות כיתה/);
  assert.match(src, /studentActivityScopeBadgeHe\("student"\)/);
});
