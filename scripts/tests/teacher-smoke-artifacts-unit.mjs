import assert from "node:assert/strict";
import {
  CANONICAL_LEO_QA_CLASS_ID,
  LEO_QA_CLASS_DISPLAY_NAME,
  isSimulationBootstrapClassName,
  isSmokeClassName,
  isSmokeStudentName,
  isTeacherDashboardHiddenClass,
  partitionSmokeDashboardRows,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import { rosterFilterLabelHe, personalActivitiesSectionTitleHe } from "../../lib/teacher-portal/teacher-ui.he.js";

assert.equal(isSmokeClassName("Phase7B Smoke Class"), true);
assert.equal(isSmokeClassName("My Real Class"), false);
assert.equal(isSmokeClassName("כיתה א׳"), false);
assert.equal(isSmokeClassName("Math Class 3"), false);
assert.equal(isSmokeClassName("Extra 2"), true);
assert.equal(isSimulationBootstrapClassName("כיתת סימולציה - כיתה ג׳"), true);
assert.equal(isSimulationBootstrapClassName("כיתה ג׳ - LEO"), false);
assert.equal(isSmokeStudentName("Individual Smoke 123"), true);
assert.equal(isSmokeStudentName("דני כהן"), false);
assert.equal(isSmokeStudentName("נועה כהן"), false);

assert.equal(
  isTeacherDashboardHiddenClass({
    classId: CANONICAL_LEO_QA_CLASS_ID,
    name: LEO_QA_CLASS_DISPLAY_NAME,
  }),
  false
);
assert.equal(
  isTeacherDashboardHiddenClass({
    classId: "871a78b9-373a-47c5-9f3c-44d31284427b",
    name: LEO_QA_CLASS_DISPLAY_NAME,
  }),
  true
);

const { visibleClasses, visibleStudents } = partitionSmokeDashboardRows(
  [
    { classId: "a", name: "Phase7B Smoke Class" },
    { classId: "b", name: "כיתה א׳" },
    { classId: "sim", name: "כיתת סימולציה - כיתה ג׳" },
    { classId: CANONICAL_LEO_QA_CLASS_ID, name: LEO_QA_CLASS_DISPLAY_NAME },
    { classId: "dup", name: LEO_QA_CLASS_DISPLAY_NAME },
  ],
  [
    { studentId: "1", studentFullName: "Quota Smoke 1" },
    { studentId: "2", studentFullName: "יעל" },
    { studentId: "3", studentFullName: "נועה", classIds: ["sim", CANONICAL_LEO_QA_CLASS_ID, "dup"] },
  ]
);
assert.equal(visibleClasses.length, 2);
assert.ok(visibleClasses.some((c) => c.name === "כיתה א׳"));
assert.ok(visibleClasses.some((c) => c.classId === CANONICAL_LEO_QA_CLASS_ID));
assert.equal(visibleStudents.length, 2);
assert.deepEqual(visibleStudents.find((s) => s.studentId === "3").classIds, [
  CANONICAL_LEO_QA_CLASS_ID,
]);

assert.equal(rosterFilterLabelHe({ type: "all", studentCount: 3 }), "כל התלמידים (3)");
assert.equal(rosterFilterLabelHe({ type: "class", className: "כיתה א", studentCount: 2 }), "כיתה א (2)");
assert.equal(rosterFilterLabelHe({ type: "direct", studentCount: 1 }), "תלמידים פרטיים (1)");
assert.equal(personalActivitiesSectionTitleHe(), "פעילויות אישיות");

console.log("teacher-smoke-artifacts-unit: ok");
