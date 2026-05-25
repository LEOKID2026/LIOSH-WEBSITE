import assert from "node:assert/strict";
import {
  isSmokeClassName,
  isSmokeStudentName,
  partitionSmokeDashboardRows,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import { rosterFilterLabelHe, personalActivitiesSectionTitleHe } from "../../lib/teacher-portal/teacher-ui.he.js";

assert.equal(isSmokeClassName("Phase7B Smoke Class"), true);
assert.equal(isSmokeClassName("My Real Class"), false);
assert.equal(isSmokeStudentName("Individual Smoke 123"), true);
assert.equal(isSmokeStudentName("דני כהן"), false);

const { visibleClasses, visibleStudents } = partitionSmokeDashboardRows(
  [
    { classId: "a", name: "Phase7B Smoke Class" },
    { classId: "b", name: "כיתה א׳" },
  ],
  [
    { studentId: "1", studentFullName: "Quota Smoke 1" },
    { studentId: "2", studentFullName: "יעל" },
  ]
);
assert.equal(visibleClasses.length, 1);
assert.equal(visibleClasses[0].name, "כיתה א׳");
assert.equal(visibleStudents.length, 1);
assert.equal(visibleStudents[0].studentFullName, "יעל");

assert.equal(rosterFilterLabelHe({ type: "all", studentCount: 3 }), "כל התלמידים (3)");
assert.equal(rosterFilterLabelHe({ type: "class", className: "כיתה א", studentCount: 2 }), "כיתה א (2)");
assert.equal(rosterFilterLabelHe({ type: "direct", studentCount: 1 }), "תלמידים פרטיים (1)");
assert.equal(personalActivitiesSectionTitleHe(), "פעילויות אישיות");

console.log("teacher-smoke-artifacts-unit: ok");
