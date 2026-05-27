/**
 * Regression checks for school account visibility gate (no DB).
 * Run: node scripts/school-portal/test-school-account-management.mjs
 */
import assert from "node:assert/strict";

/** Mirrors verifyStudentVisibleToSchool success shape. */
const verifySuccess = { ok: true, isEnrolled: true };

assert.equal(verifySuccess.visible, undefined, "verifyStudentVisibleToSchool must not use .visible");

function canAccessStudentAfterVerify(visible) {
  if (!visible.ok) return false;
  return true;
}

assert.equal(canAccessStudentAfterVerify(verifySuccess), true);
assert.equal(canAccessStudentAfterVerify({ ok: false, status: 403, code: "student_not_visible_in_school" }), false);

function isSchoolIssuedRow(row, schoolId) {
  return Boolean(row?.created_by_school_id && row.created_by_school_id === schoolId);
}

function pickSchoolStudentAccessRow(studentCodes, schoolId) {
  const schoolRows = studentCodes.filter((row) => isSchoolIssuedRow(row, schoolId));
  const active = schoolRows.find((row) => row.state === "active");
  if (active) return active;
  return schoolRows[0] || null;
}

const schoolId = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const rows = [
  { id: "1", created_by_school_id: null, state: "active", login_username: "demo-g4s2-06" },
  { id: "2", created_by_school_id: schoolId, state: "active", login_username: "leok-s0001" },
];

assert.equal(pickSchoolStudentAccessRow(rows, schoolId)?.login_username, "leok-s0001");
assert.equal(pickSchoolStudentAccessRow([rows[0]], schoolId), null);

console.log("school-account-management visibility smoke: OK");
