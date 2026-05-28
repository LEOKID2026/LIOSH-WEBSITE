import test from "node:test";
import assert from "node:assert/strict";
import {
  classGradeKeysMatch,
  loadClassActivityContextFromApiClass,
  resolveCanonicalGradeKey,
  schoolSubjectGradeKeysMatch,
} from "../lib/teacher-portal/teacher-class-grade.js";
import {
  defaultTopicForSubject,
  topicOptionsForSubject,
} from "../lib/teacher-portal/teacher-class-topic-options.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";

const GRADE_CASES = [
  ["1", "g1"],
  ["2", "g2"],
  ["3", "g3"],
  ["4", "g4"],
  ["5", "g5"],
  ["6", "g6"],
  ["g3", "g3"],
  ["grade_3", "g3"],
  [3, "g3"],
  ["invalid", ""],
  ["", ""],
  [null, ""],
];

for (const [input, expected] of GRADE_CASES) {
  test(`resolveCanonicalGradeKey(${JSON.stringify(input)}) → ${expected || '""'}`, () => {
    assert.equal(resolveCanonicalGradeKey(input), expected);
  });
}

test("classGradeKeysMatch allows DB 3 with body g3", () => {
  assert.equal(classGradeKeysMatch("g3", "3"), true);
});

test("classGradeKeysMatch allows DB grade_3 with body g3", () => {
  assert.equal(classGradeKeysMatch("g3", "grade_3"), true);
});

test("classGradeKeysMatch allows DB g3 with body g3", () => {
  assert.equal(classGradeKeysMatch("g3", "g3"), true);
});

test("classGradeKeysMatch rejects DB 4 with body g3", () => {
  assert.equal(classGradeKeysMatch("g3", "4"), false);
});

test("classGradeKeysMatch rejects missing body grade", () => {
  assert.equal(classGradeKeysMatch(undefined, "3"), false);
});

test("schoolSubjectGradeKeysMatch allows permission 3 with request g3", () => {
  assert.equal(schoolSubjectGradeKeysMatch("3", "g3"), true);
});

test("schoolSubjectGradeKeysMatch rejects permission 4 with request g3", () => {
  assert.equal(schoolSubjectGradeKeysMatch("4", "g3"), false);
});

test("loadClassActivityContextFromApiClass normalizes bare digit grade and subject", () => {
  const ctx = loadClassActivityContextFromApiClass({
    gradeLevel: "3",
    subjectFocus: "math",
    name: "כיתה ג׳ 1",
  });
  assert.equal(ctx.gradeKey, "g3");
  assert.equal(ctx.subjectFocus, "math");
  assert.equal(ctx.gradeLocked, true);
  assert.equal(ctx.subjectLocked, true);
});

test("topic options are non-empty for g3 across core subjects", () => {
  for (const subject of ["math", "geometry", "hebrew", "english", "science", "moledet_geography"]) {
    const opts = topicOptionsForSubject(subject, "g3");
    assert.ok(opts.length > 0, `${subject} should have topics for g3`);
    assert.ok(defaultTopicForSubject(subject, "g3"), `${subject} default topic for g3`);
  }
});

test("geometry shapes_basic preview works for canonical g3", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "shapes_basic",
    difficulty: "medium",
    count: 3,
  });
  assert.equal(qs.length, 3);
});

test("math addition preview works when class DB grade is bare 3", async () => {
  const canonical = resolveCanonicalGradeKey("3");
  const qs = await generateActivityQuestionSetClient({
    subject: "math",
    gradeLevel: canonical,
    topic: "addition",
    difficulty: "easy",
    count: 3,
  });
  assert.equal(qs.length, 3);
});
