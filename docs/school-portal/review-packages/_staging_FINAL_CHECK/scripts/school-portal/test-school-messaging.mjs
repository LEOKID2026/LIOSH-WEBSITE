/**
 * Smoke checks for school messaging audience classification (no DB).
 * Run: node scripts/school-portal/test-school-messaging.mjs
 */
import assert from "node:assert/strict";
import {
  buildSchoolMessagesListQuery,
  formatSchoolMessageAudienceLabel,
  formatSchoolMessageListReadCount,
  getSchoolMessageId,
  schoolMessageHasParentRecipients,
  schoolMessageHasTeacherRecipients,
} from "../../lib/school-portal/school-messaging-ui.js";

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

assert.equal(getSchoolMessageId({ messageId: "abc" }), "abc");
assert.equal(getSchoolMessageId({ id: "def" }), "def");
assert.equal(getSchoolMessageId({ messageId: undefined }), null);
assert.equal(getSchoolMessageId({ id: "undefined" }), null);

assert.equal(formatSchoolMessageAudienceLabel("all_teachers"), "כל מורי בית הספר");
assert.equal(formatSchoolMessageAudienceLabel("all_parents"), "כל הורי בית הספר");
assert.ok(!formatSchoolMessageAudienceLabel("all_teachers").includes("all_teachers"));

assert.equal(
  formatSchoolMessageListReadCount({
    parentRecipientCount: 0,
    teacherRecipientCount: 5,
    teacherReadCount: 2,
  }),
  "2/5 מורים"
);
assert.equal(
  formatSchoolMessageListReadCount({
    parentRecipientCount: 3,
    teacherRecipientCount: 0,
    parentReadCount: 1,
  }),
  "1/3 הורים"
);
assert.equal(
  formatSchoolMessageListReadCount({
    parentRecipientCount: 2,
    teacherRecipientCount: 4,
    parentReadCount: 1,
    teacherReadCount: 3,
  }),
  "1/2 הורים · 3/4 מורים"
);

assert.equal(schoolMessageHasTeacherRecipients({ teacherRecipientCount: 1 }), true);
assert.equal(schoolMessageHasParentRecipients({ parentRecipientCount: 0 }), false);

assert.match(buildSchoolMessagesListQuery({ dateFilter: "7" }), /days=7/);
assert.match(buildSchoolMessagesListQuery({ dateFilter: "30" }), /days=30/);
assert.match(
  buildSchoolMessagesListQuery({ dateFilter: "custom", customFrom: "2026-01-01", customTo: "2026-01-31" }),
  /sentAfter=/
);

console.log("school-messaging audience smoke: OK");
