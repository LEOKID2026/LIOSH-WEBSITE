import test from "node:test";
import assert from "node:assert/strict";
import {
  maskStudentFullName,
  teacherStudentDisplayName,
} from "../lib/teacher-server/teacher-students.server.js";

test("teacherStudentDisplayName returns full first and last name", () => {
  assert.equal(teacherStudentDisplayName("  איתי   ביטון  "), "איתי ביטון");
});

test("maskStudentFullName still abbreviates for guardian-style surfaces", () => {
  assert.equal(maskStudentFullName("איתי ביטון"), "איתי ב.");
});

test("teacherStudentDisplayName preserves multi-part names", () => {
  assert.equal(teacherStudentDisplayName("דנה לוי כהן"), "דנה לוי כהן");
});
