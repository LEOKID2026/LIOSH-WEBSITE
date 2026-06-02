import assert from "node:assert/strict";
import {
  groupPhysicalClassesForTeacher,
  physicalClassSubjectLabelsHe,
  physicalClassStudentCount,
} from "../../lib/school-portal/school-drilldown.js";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

/** Dan Cohen demo: math + geometry in grades 1–2, 3 sections each → 12 subject classes, 6 physical groups. */
function buildDanCohenSubjectClasses() {
  const out = [];
  let id = 0;
  for (const grade of [1, 2]) {
    for (const section of [1, 2, 3]) {
      const name = physicalClassName(grade, section);
      const memberCount = section === 1 ? 24 : 22;
      for (const subjectFocus of ["math", "geometry"]) {
        out.push({
          classId: `dan-${++id}`,
          gradeLevel: String(grade),
          name,
          subjectFocus,
          memberCount,
          activityCount: 5,
          isArchived: false,
        });
      }
    }
  }
  return out;
}

const danClasses = buildDanCohenSubjectClasses();
assert.equal(danClasses.length, 12, "Dan Cohen fixture has 12 subject classes");

const groups = groupPhysicalClassesForTeacher(danClasses);
assert.equal(groups.length, 6, "12 subject classes → 6 physical class cards");

const a1 = groups.find((g) => g.name === physicalClassName(1, 1));
assert.ok(a1, "כיתה א׳ 1 group exists");
assert.equal(a1.subjectClasses.length, 2);
assert.equal(physicalClassStudentCount(a1.subjectClasses), 24);

const labels = physicalClassSubjectLabelsHe(a1.subjectClasses);
assert.deepEqual(labels, ["מתמטיקה", "גאומטריה"], "Hebrew subjects only, demo order");
assert.ok(!labels.some((l) => /math|geometry/i.test(l)), "no raw English keys");

const sortedNames = groups.map((g) => g.name);
assert.deepEqual(
  sortedNames.slice(0, 3),
  [physicalClassName(1, 1), physicalClassName(1, 2), physicalClassName(1, 3)],
  "grade 1 sections first"
);
assert.deepEqual(
  sortedNames.slice(3),
  [physicalClassName(2, 1), physicalClassName(2, 2), physicalClassName(2, 3)],
  "grade 2 sections next"
);

const archived = groupPhysicalClassesForTeacher([
  ...danClasses,
  {
    classId: "archived",
    gradeLevel: "1",
    name: physicalClassName(1, 1),
    subjectFocus: "math",
    isArchived: true,
  },
]);
assert.equal(archived.length, 6, "archived subject classes excluded");

console.log("school-drilldown-teacher-groups-unit: ok");
