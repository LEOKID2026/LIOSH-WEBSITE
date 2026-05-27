/**
 * Smoke checks for school messaging audience classification (no DB).
 * Run: node scripts/school-portal/test-school-messaging.mjs
 */
import assert from "node:assert/strict";

const PARENT_TYPES = new Set([
  "all_parents",
  "grade_parents",
  "class_parents",
  "specific_parent",
  "homeroom_class_parents",
  "homeroom_student_parent",
]);

const TEACHER_TYPES = new Set([
  "all_teachers",
  "grade_teachers",
  "subject_teachers",
  "class_teachers",
  "specific_teacher",
]);

function recipientTypeForAudience(audienceType) {
  return PARENT_TYPES.has(audienceType) ? "parent" : "teacher";
}

assert.equal(recipientTypeForAudience("all_parents"), "parent");
assert.equal(recipientTypeForAudience("all_teachers"), "teacher");
assert.equal(recipientTypeForAudience("grade_parents"), "parent");
assert.equal(recipientTypeForAudience("class_teachers"), "teacher");
assert.equal(recipientTypeForAudience("homeroom_class_parents"), "parent");

for (const t of PARENT_TYPES) {
  assert.equal(recipientTypeForAudience(t), "parent", t);
}
for (const t of TEACHER_TYPES) {
  assert.equal(recipientTypeForAudience(t), "teacher", t);
}

console.log("school-messaging audience smoke: OK");
