import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const api = readFileSync(path.join(root, "pages/api/analytics/events.js"), "utf8");

assert.match(
  api,
  /resolveAuthorizedStudentIdForEvent/,
  "analytics events API must resolve student_id via ownership helper"
);
assert.match(
  api,
  /if \(studentAuth\?\.studentId\)/,
  "student session must supply student_id from session only"
);
assert.doesNotMatch(
  api,
  /student_id:\s*studentAuth\s*\?\s*studentAuth\.studentId\s*:\s*safeUuid\(body\.studentId\)/,
  "must not trust body.studentId without ownership"
);
assert.match(
  api,
  /assertTeacherCanManageStudentAccess/,
  "teacher analytics must verify student link before saving student_id"
);
assert.match(
  api,
  /\.eq\("parent_id", bearerActor\.parentId\)/,
  "parent analytics must verify student belongs to parent"
);
assert.match(
  api,
  /student_id:\s*authorizedStudentId/,
  "insert row must use authorized student_id"
);

console.log("analytics-events-ownership-selftest: PASS");
