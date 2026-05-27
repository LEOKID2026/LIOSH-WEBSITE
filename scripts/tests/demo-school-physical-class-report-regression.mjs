#!/usr/bin/env node
/**
 * Regression: demo school physical class report.
 * node --env-file=.env.local scripts/tests/demo-school-physical-class-report-regression.mjs [schoolId]
 */
import assert from "node:assert/strict";
import { buildSchoolPhysicalClassReportPayload } from "../../lib/school-server/school-physical-class-report.server.js";
import { createServiceRole } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const SCHOOL_ID = process.argv[2] || "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const GRADE = "1";
const PHYSICAL = physicalClassName(1, 1);

async function main() {
  const admin = createServiceRole();

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  const report = await buildSchoolPhysicalClassReportPayload({
    serviceRole: admin,
    schoolId: SCHOOL_ID,
    gradeLevel: GRADE,
    physicalClassName: PHYSICAL,
    fromDate,
    toDate,
  });

  assert.ok(report.ok, report.code || "physical report build failed");
  const payload = report.payload;

  assert.equal(payload.physicalClass.name, PHYSICAL);
  assert.ok(payload.subjectBreakdown.length >= 1, "expected at least one subject");
  assert.ok(payload.roster.length >= 1, "expected roster students");
  assert.ok(payload.recentActivities != null, "recentActivities must be present");

  for (const row of payload.subjectBreakdown) {
    assert.ok(row.teacherId, "subject row must include teacherId");
    assert.ok(row.subjectLabelHe, "subject row must include Hebrew label");
    assert.ok(!String(row.subjectLabelHe).includes("math"));
  }

  const unknown = await buildSchoolPhysicalClassReportPayload({
    serviceRole: admin,
    schoolId: SCHOOL_ID,
    gradeLevel: GRADE,
    physicalClassName: "כיתה שלא קיימת 999",
    fromDate,
    toDate,
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.status, 404);

  console.log(
    JSON.stringify(
      {
        schoolId: SCHOOL_ID,
        physicalClass: PHYSICAL,
        rosterCount: payload.roster.length,
        subjectCount: payload.subjectBreakdown.length,
        totalAnswers: payload.cohortSummary?.totalAnswers,
        recentActivities: payload.recentActivities.length,
      },
      null,
      2
    )
  );
  console.log("\ndemo-school-physical-class-report-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
