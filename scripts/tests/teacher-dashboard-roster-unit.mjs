import assert from "node:assert/strict";
import {
  ROSTER_FILTER_ALL,
  ROSTER_FILTER_DIRECT,
  buildRosterFilterOptions,
  buildStudentClassIdsMap,
  filterStudentsByRosterKey,
} from "../../lib/teacher-portal/teacher-dashboard-roster.js";

const classA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const classB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const s1 = "11111111-1111-4111-8111-111111111111";
const s2 = "22222222-2222-4222-8222-222222222222";
const s3 = "33333333-3333-4333-8333-333333333333";

const map = buildStudentClassIdsMap([
  { student_id: s1, class_id: classA },
  { student_id: s2, class_id: classA },
  { student_id: s2, class_id: classB },
]);

assert.deepEqual(map.get(s1), [classA]);
assert.deepEqual(map.get(s2).sort(), [classA, classB].sort());
assert.equal(map.get(s3), undefined);

const students = [
  { studentId: s1, isInAnyClass: true, classIds: [classA] },
  { studentId: s2, isInAnyClass: true, classIds: [classA, classB] },
  { studentId: s3, isInAnyClass: false, classIds: [] },
];

assert.equal(filterStudentsByRosterKey(students, ROSTER_FILTER_ALL).length, 3);
assert.equal(filterStudentsByRosterKey(students, ROSTER_FILTER_DIRECT).length, 1);
assert.equal(filterStudentsByRosterKey(students, ROSTER_FILTER_DIRECT)[0].studentId, s3);
assert.equal(filterStudentsByRosterKey(students, classA).length, 2);
assert.equal(filterStudentsByRosterKey(students, classB).length, 1);

const physicalKey = "g3::כיתה ג׳ 1";
const options = buildRosterFilterOptions({
  students,
  classes: [
    {
      physicalGroupKey: physicalKey,
      classId: classA,
      name: "כיתה ג׳ 1",
      subjectClassIds: [{ classId: classA }, { classId: classB }],
    },
    { classId: classB, name: "Class B" },
  ],
});

const physicalFiltered = filterStudentsByRosterKey(students, physicalKey, options);
assert.equal(physicalFiltered.length, 2, "physical class filter dedupes");

const optionsLegacy = buildRosterFilterOptions({
  students,
  classes: [
    { classId: classA, name: "Class A" },
    { classId: classB, name: "Class B" },
  ],
});

assert.equal(optionsLegacy.find((o) => o.key === ROSTER_FILTER_ALL)?.studentCount, 3);
assert.equal(optionsLegacy.find((o) => o.key === ROSTER_FILTER_DIRECT)?.studentCount, 1);
assert.equal(optionsLegacy.find((o) => o.key === classA)?.studentCount, 2);
assert.equal(optionsLegacy.find((o) => o.key === classB)?.studentCount, 1);

console.log("teacher-dashboard-roster-unit: ok");
