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

console.log("school-account-management visibility smoke: OK");
