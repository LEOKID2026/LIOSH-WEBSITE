#!/usr/bin/env node
/**
 * Regression: explicit May 2026 calendar ranges must include classroom activity in R2/R3/R4 builds.
 * Run: node --env-file=.env.local scripts/tests/report-explicit-may-range-regression.mjs
 */
import assert from "node:assert/strict";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import {
  buildTeacherStudentReportPayload,
  buildTeacherParentReportPreviewPayload,
  resolveTeacherReportDateRange,
} from "../../lib/teacher-server/teacher-report.server.js";
import { loadSchoolScopedClassroomActivityRollupForStudentReport } from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { applySchoolTeacherReportFilter } from "../../lib/school-server/school-subjects.server.js";
import { loadTeacherSchoolMembership } from "../../lib/school-server/school-membership.server.js";
import { resolveSchoolReportTeacherForStudent } from "../../lib/school-server/school-scope.server.js";

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const STUDENT_ID = "f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea";

const RANGES = [
  { label: "current_month", from: "2026-05-01", to: "2026-05-14", minTotal: 160 },
  { label: "current_week", from: "2026-05-10", to: "2026-05-14", minTotal: 1 },
  { label: "full_range", from: "2025-09-01", to: "2026-05-14", minTotal: 2400 },
];

function totalAnswers(payload) {
  return Number(payload?.summary?.totalAnswers ?? 0) || 0;
}

async function main() {
  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(dan?.id, "dan teacher auth user");

  const schoolMem = await loadTeacherSchoolMembership(admin, dan.id);
  assert.ok(schoolMem.ok && schoolMem.membership?.schoolId, "dan school membership");

  for (const rangeSpec of RANGES) {
    const resolved = resolveTeacherReportDateRange({ from: rangeSpec.from, to: rangeSpec.to });
    assert.ok(resolved.ok, `invalid range ${rangeSpec.label}`);
    const { fromDate, toDate } = resolved;

    const schoolRollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
      serviceRole: admin,
      schoolId: DEMO_SCHOOL_ID,
      studentId: STUDENT_ID,
      fromDate,
      toDate,
      gradeLevel: "1",
      physicalClassName: null,
    });
    assert.ok(schoolRollup.ok, `${rangeSpec.label} school rollup: ${schoolRollup.code || "failed"}`);
    assert.ok(
      Number(schoolRollup.rollup?.answers || 0) > 0,
      `${rangeSpec.label} school rollup answers must be > 0`
    );

    const r2Built = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: dan.id,
        studentId: STUDENT_ID,
        fromDate,
        toDate,
      },
      { skipAudit: true }
    );
    assert.ok(r2Built.ok, `${rangeSpec.label} R2 build: ${r2Built.code || "failed"}`);
    const r2Filtered = await applySchoolTeacherReportFilter(admin, dan.id, r2Built.payload);
    assert.ok(r2Filtered.ok, `${rangeSpec.label} R2 filter: ${r2Filtered.code || "failed"}`);
    assert.ok(
      totalAnswers(r2Filtered.payload) >= rangeSpec.minTotal,
      `${rangeSpec.label} R2 total ${totalAnswers(r2Filtered.payload)} expected >= ${rangeSpec.minTotal}`
    );

    const r3Built = await buildTeacherParentReportPreviewPayload({
      serviceRole: admin,
      teacherId: dan.id,
      studentId: STUDENT_ID,
      fromDate,
      toDate,
    });
    assert.ok(r3Built.ok, `${rangeSpec.label} R3 build: ${r3Built.code || "failed"}`);
    const r3Filtered = await applySchoolTeacherReportFilter(admin, dan.id, r3Built.payload);
    assert.ok(r3Filtered.ok, `${rangeSpec.label} R3 filter: ${r3Filtered.code || "failed"}`);
    assert.ok(
      totalAnswers(r3Filtered.payload) >= rangeSpec.minTotal,
      `${rangeSpec.label} R3 total ${totalAnswers(r3Filtered.payload)} expected >= ${rangeSpec.minTotal}`
    );

    const reportTeacher = await resolveSchoolReportTeacherForStudent(
      admin,
      DEMO_SCHOOL_ID,
      STUDENT_ID,
      {}
    );
    assert.ok(reportTeacher.ok, `${rangeSpec.label} R4 teacher resolve`);

    const r4Built = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: reportTeacher.teacherId,
        studentId: STUDENT_ID,
        fromDate,
        toDate,
      },
      { skipAudit: true, gradeLevel: "1" }
    );
    assert.ok(r4Built.ok, `${rangeSpec.label} R4 build: ${r4Built.code || "failed"}`);
    assert.ok(
      totalAnswers(r4Built.payload) >= rangeSpec.minTotal,
      `${rangeSpec.label} R4 total ${totalAnswers(r4Built.payload)} expected >= ${rangeSpec.minTotal}`
    );

    assert.equal(
      totalAnswers(r2Filtered.payload),
      totalAnswers(r3Filtered.payload),
      `${rangeSpec.label} R2 and R3 totals must match after subject filter`
    );
  }

  console.log(
    JSON.stringify(
      {
        studentId: STUDENT_ID,
        ranges: RANGES.map((r) => r.label),
        status: "PASS",
      },
      null,
      2
    )
  );
  console.log("\nreport-explicit-may-range-regression: PASS");
}

main().catch((e) => {
  console.error("report-explicit-may-range-regression: FAIL", e?.message || e);
  process.exit(1);
});
