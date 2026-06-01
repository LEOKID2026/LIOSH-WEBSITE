import assert from "node:assert/strict";
import {
  formatStudentAccessDisplayLabel,
  isInternalDemoStudentAccessUsername,
  shouldDisplayStudentAccessCode,
} from "../../lib/teacher-portal/student-access-display.js";

assert.equal(isInternalDemoStudentAccessUsername("demo-g1s1-01"), true);
assert.equal(isInternalDemoStudentAccessUsername("leok-s42"), true);
assert.equal(isInternalDemoStudentAccessUsername("leo-s01"), true);
assert.equal(isInternalDemoStudentAccessUsername("leo-p01"), true);
assert.equal(isInternalDemoStudentAccessUsername("dan-s01"), false);
assert.equal(isInternalDemoStudentAccessUsername("noam123"), false);

assert.equal(shouldDisplayStudentAccessCode("demo-g1s1-01"), false);
assert.equal(shouldDisplayStudentAccessCode("dan-s01"), true);
assert.equal(shouldDisplayStudentAccessCode(""), false);
assert.equal(shouldDisplayStudentAccessCode(null), false);

assert.equal(formatStudentAccessDisplayLabel("demo-g1s1-01"), null);
assert.equal(formatStudentAccessDisplayLabel("dan-s01"), "dan-s01");

console.log("student-access-display-unit: ok");
