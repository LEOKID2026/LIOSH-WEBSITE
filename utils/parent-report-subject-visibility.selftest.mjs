#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  filterSubjectOverviewRowsWithEvidence,
  subjectHasParentReportPracticeEvidence,
} from "./parent-report-subject-visibility.js";

assert.equal(subjectHasParentReportPracticeEvidence(0, 15), false, "time-only is not practice evidence");
assert.equal(subjectHasParentReportPracticeEvidence(3, 0), true, "questions count as evidence");
assert.equal(subjectHasParentReportPracticeEvidence(0, 0), false, "zero is not evidence");

const rows = [
  { name: "מתמטיקה", questions: 10, minutes: 5 },
  { name: "אנגלית", questions: 0, minutes: 20 },
];
const visible = filterSubjectOverviewRowsWithEvidence(rows);
assert.equal(visible.length, 1, "time-only subject hidden from overview");
assert.equal(visible[0].name, "מתמטיקה");

console.log("parent-report-subject-visibility.selftest: PASS");
