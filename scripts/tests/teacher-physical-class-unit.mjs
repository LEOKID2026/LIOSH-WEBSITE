import assert from "node:assert/strict";
import {
  effectivePhysicalClassStudentCount,
  groupTeacherClassesForDashboard,
  teacherPhysicalClassGroupKey,
  uniqueStudentIdsForClassIds,
} from "../../lib/teacher-portal/teacher-physical-class.js";
import {
  buildRosterFilterOptions,
  filterStudentsByRosterKey,
} from "../../lib/teacher-portal/teacher-dashboard-roster.js";

const mathId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const geoId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const engId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const membershipRows = [
  { student_id: "s1", class_id: mathId },
  { student_id: "s2", class_id: mathId },
  { student_id: "s1", class_id: geoId },
  { student_id: "s2", class_id: geoId },
];

assert.equal(
  teacherPhysicalClassGroupKey({ gradeLevel: "g3", name: "כיתה ג׳ 1" }),
  teacherPhysicalClassGroupKey({ gradeLevel: "3", name: "כיתה ג׳ 1" }),
  "g3 and 3 normalize to same bucket"
);

const grouped = groupTeacherClassesForDashboard(
  [
    { classId: mathId, name: "כיתה ג׳ 1", gradeLevel: "g3", subjectFocus: "math" },
    { classId: geoId, name: "כיתה ג׳ 1", gradeLevel: "g3", subjectFocus: "geometry" },
    { classId: engId, name: "כיתה ד׳ 2", gradeLevel: "g4", subjectFocus: "english" },
  ],
  membershipRows
);

assert.equal(grouped.length, 2, "two physical classes");
const g31 = grouped.find((g) => g.name === "כיתה ג׳ 1");
assert.ok(g31);
assert.equal(g31.studentCount, 2, "unique students not doubled");
assert.equal(g31.subjectClassIds.length, 2);
assert.ok(g31.subjectsLabel.includes("מתמטיקה"));
assert.ok(g31.subjectsLabel.includes("גאומטריה"));
assert.equal(g31.isGrouped, true);

const unique = uniqueStudentIdsForClassIds(membershipRows, [mathId, geoId]);
assert.equal(unique.size, 2);

const students = [
  { studentId: "s1", isInAnyClass: true, classIds: [mathId, geoId] },
  { studentId: "s2", isInAnyClass: true, classIds: [mathId] },
  { studentId: "s3", isInAnyClass: true, classIds: [engId] },
];

const options = buildRosterFilterOptions({
  students,
  classes: grouped.map((g) => ({
    physicalGroupKey: g.physicalGroupKey,
    classId: g.primaryClassId,
    name: g.name,
    subjectClassIds: g.subjectClassIds,
  })),
});

const physicalOpt = options.find((o) => o.type === "physical_class");
assert.ok(physicalOpt);
assert.equal(physicalOpt.studentCount, 2);

const filtered = filterStudentsByRosterKey(students, physicalOpt.key, options);
assert.equal(filtered.length, 2);

assert.equal(
  effectivePhysicalClassStudentCount({ studentCount: 22, rosterStudentCount: 0 }),
  22,
  "membership count wins over zero rosterStudentCount"
);
assert.equal(
  effectivePhysicalClassStudentCount({ studentCount: 0, rosterStudentCount: 3 }),
  3,
  "non-zero roster count preserved for private teachers"
);

console.log("teacher-physical-class-unit: ok");
