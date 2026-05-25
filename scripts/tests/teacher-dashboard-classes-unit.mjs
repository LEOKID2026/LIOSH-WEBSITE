import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
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
const realClassB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const smokeClass = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const classRows = [
  { classId: smokeClass, name: "Phase5A Smoke Class" },
  { classId: realClassA, name: "כיתה א׳" },
  { classId: realClassB, name: "כיתת סימולציה - כיתה ב׳" },
  { classId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Extra 2" },
];

const studentRows = [
  {
    studentId: "11111111-1111-4111-8111-111111111111",
    studentFullName: "יעל כהן",
    classIds: [realClassA, smokeClass],
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

assert.equal(visibleClasses.length, 2, "real classes must remain visible");
assert.ok(
  visibleClasses.some((c) => c.name === "כיתה א׳"),
  "Hebrew class name must not be filtered"
);
assert.ok(
  visibleClasses.some((c) => c.name === "כיתת סימולציה - כיתה ב׳"),
  "simulation-style class name must not be filtered"
);
assert.equal(smokeClassIds.size, 2, "smoke classes Extra + Phase5A");

assert.equal(visibleStudents.length, 1, "smoke-named students hidden");
assert.deepEqual(visibleStudents[0].classIds, [realClassA], "smoke class ids stripped from students");
assert.equal(visibleStudents[0].isInAnyClass, true);

assert.equal(isSmokeClassName("כיתה ד׳ 2026"), false);
assert.equal(isSmokeClassName("Math Class 3"), false);
assert.equal(isSmokeClassName("My Class"), false);

assert.ok(
  dashboardClientSrc.includes('data-testid="teacher-class-cards-section"'),
  "class cards section must be present in dashboard UI"
);
assert.ok(dashboardClientSrc.includes("דוח כיתה"), "class report link required");
assert.ok(dashboardClientSrc.includes("ניהול כיתה"), "class manage action required");
assert.ok(
  dashboardClientSrc.includes("/activities"),
  "class activities link required"
);
assert.ok(
  dashboardClientSrc.includes('data-testid="teacher-classes-empty-state"'),
  "empty state section required when no classes"
);

console.log("teacher-dashboard-classes-unit: ok");
