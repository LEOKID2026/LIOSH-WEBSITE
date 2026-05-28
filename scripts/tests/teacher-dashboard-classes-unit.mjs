import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CANONICAL_LEO_QA_CLASS_ID,
  LEO_QA_CLASS_DISPLAY_NAME,
  isSmokeClassName,
  partitionSmokeDashboardRows,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const dashboardClientSrc = readFileSync(
  join(repoRoot, "components/teacher-portal/TeacherDashboardClient.jsx"),
  "utf8"
);

const realClassA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const smokeClass = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const simClass = "62428ac2-cb64-4291-a35f-7f032b9ec63e";
const dupLeo = "871a78b9-373a-47c5-9f3c-44d31284427b";

const classRows = [
  { classId: smokeClass, name: "Phase5A Smoke Class" },
  { classId: realClassA, name: "כיתה א׳" },
  { classId: simClass, name: "כיתת סימולציה - כיתה ג׳" },
  { classId: dupLeo, name: LEO_QA_CLASS_DISPLAY_NAME },
  { classId: CANONICAL_LEO_QA_CLASS_ID, name: LEO_QA_CLASS_DISPLAY_NAME },
  { classId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Extra 2" },
];

const studentRows = [
  {
    studentId: "11111111-1111-4111-8111-111111111111",
    studentFullName: "יעל כהן",
    classIds: [realClassA, CANONICAL_LEO_QA_CLASS_ID, simClass, smokeClass],
    isInAnyClass: true,
  },
  {
    studentId: "22222222-2222-4222-8222-222222222222",
    studentFullName: "Quota Smoke 9",
    classIds: [smokeClass],
    isInAnyClass: true,
  },
];

const { visibleClasses, visibleStudents, smokeClassIds } = partitionSmokeDashboardRows(
  classRows,
  studentRows
);

assert.equal(visibleClasses.length, 2, "only real + canonical LEO QA class");
assert.ok(visibleClasses.some((c) => c.name === "כיתה א׳"));
assert.ok(visibleClasses.some((c) => c.classId === CANONICAL_LEO_QA_CLASS_ID));
assert.equal(smokeClassIds.size, 4, "smoke + sim + dup LEO + Extra hidden");

assert.equal(visibleStudents.length, 1, "smoke-named students hidden");
assert.deepEqual(visibleStudents[0].classIds.sort(), [realClassA, CANONICAL_LEO_QA_CLASS_ID].sort());
assert.equal(visibleStudents[0].isInAnyClass, true);

assert.equal(isSmokeClassName("כיתה ד׳ 2026"), false);
assert.equal(isSmokeClassName("Math Class 3"), false);
assert.equal(isSmokeClassName("My Class"), false);

assert.ok(
  dashboardClientSrc.includes('data-testid="teacher-class-cards-section"'),
  "class cards section must be present in dashboard UI"
);
assert.ok(dashboardClientSrc.includes("כיתות שלי"), "class section title");
assert.ok(dashboardClientSrc.includes("דוח כיתה"), "class report link required");
assert.ok(
  dashboardClientSrc.includes("מקצועות:"),
  "physical class subjects line required"
);
assert.ok(
  dashboardClientSrc.includes("teacher-physical-class-card"),
  "physical class card test id required"
);
assert.ok(dashboardClientSrc.includes("ניהול כיתה"), "class manage action required");
assert.ok(
  dashboardClientSrc.includes("teacher-class-activities-"),
  "class activities action required"
);
assert.ok(
  dashboardClientSrc.includes("/activities/new"),
  "multi-subject activity links must route to subject-class create page"
);
assert.ok(
  dashboardClientSrc.includes("פעילות ${subjectLinkLabel(s)}"),
  "multi-subject activity button label required"
);
assert.ok(dashboardClientSrc.includes("פעילויות"), "single-subject activities label preserved");
assert.ok(
  dashboardClientSrc.includes('data-testid="teacher-classes-empty-state"'),
  "empty state section required when no classes"
);
assert.ok(
  dashboardClientSrc.includes("effectivePhysicalClassStudentCount"),
  "class card student count must not prefer zero rosterStudentCount"
);

console.log("teacher-dashboard-classes-unit: ok");
