/**
 * Private Teacher Worksheet PDF — structural regression checks (no DB required).
 * Run: node scripts/tests/private-teacher-worksheet-pdf-regression.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseCreateWorksheetBody } from "../../lib/worksheet-activities/worksheet-teacher.server.js";
import { parseStudentIdsArray } from "../../lib/worksheet-activities/worksheet-assignments.server.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const full = path.join(root, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  return full;
}

console.log("private-teacher-worksheet-pdf-regression: start");

// Files exist
[
  "supabase/migrations/035_private_worksheet_assignments.sql",
  "lib/worksheet-activities/worksheet-assignments.server.js",
  "pages/api/teacher/worksheet-activities/[worksheetId]/assignments.js",
  "pages/teacher/worksheets/index.js",
  "pages/teacher/worksheets/new.js",
  "pages/teacher/worksheets/[worksheetId]/index.js",
  "pages/teacher/worksheets/[worksheetId]/report.js",
  "pages/teacher/worksheets/[worksheetId]/grade/[studentId].js",
  "components/worksheet-activities/TeacherStudentSelector.jsx",
].forEach(mustExist);

const migrationSql = readFileSync(
  mustExist("supabase/migrations/035_private_worksheet_assignments.sql"),
  "utf8"
);
assert.match(migrationSql, /assignment_scope/);
assert.match(migrationSql, /worksheet_student_assignments/);
assert.match(migrationSql, /ALTER COLUMN class_id DROP NOT NULL/);

const validUuid = "11111111-1111-4111-8111-111111111111";
const validUuid2 = "22222222-2222-4222-8222-222222222222";

const classOnly = parseCreateWorksheetBody({
  classId: validUuid,
  title: "Class WS",
  subject: "math",
  worksheetMode: "pdf_only",
});
assert.equal(classOnly.ok, true);
assert.equal(classOnly.scope, "class");

const studentsOnly = parseCreateWorksheetBody({
  studentIds: [validUuid, validUuid2],
  title: "Direct WS",
  subject: "math",
  worksheetMode: "pdf_only",
});
assert.equal(studentsOnly.ok, true);
assert.equal(studentsOnly.scope, "selected_students");
assert.deepEqual(studentsOnly.payload.studentIds, [validUuid, validUuid2]);

const both = parseCreateWorksheetBody({
  classId: validUuid,
  studentIds: [validUuid2],
  title: "Bad",
  subject: "math",
  worksheetMode: "pdf_only",
});
assert.equal(both.ok, false);
assert.equal(both.status, 400);

const neither = parseCreateWorksheetBody({
  title: "Bad",
  subject: "math",
  worksheetMode: "pdf_only",
});
assert.equal(neither.ok, false);

assert.equal(parseStudentIdsArray(["not-a-uuid"]), null);
assert.deepEqual(parseStudentIdsArray([validUuid]), [validUuid]);

console.log("private-teacher-worksheet-pdf-regression: PASS");
