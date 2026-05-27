#!/usr/bin/env node
/**
 * Regression: demo school class report includes classroom activity metrics.
 * node --env-file=.env.local scripts/tests/demo-school-class-report-regression.mjs [schoolId]
 */
import assert from "node:assert/strict";
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const SCHOOL_ID = process.argv[2] || "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(authUser?.id, "Dan Cohen auth user");

  const targetName = physicalClassName(1, 2);
  const { data: cls, error } = await admin
    .from("teacher_classes")
    .select("id, name, grade_level, subject_focus, teacher_id")
    .eq("teacher_id", authUser.id)
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(!error, error?.message);
  assert.ok(cls?.id, `geometry class ${targetName} not found`);

  const { count: rosterCount } = await admin
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", cls.id)
    .is("removed_at", null);
  assert.equal(rosterCount, 22, "expected 22 roster students");

  const { count: activityCount } = await admin
    .from("classroom_activities")
    .select("id", { count: "exact", head: true })
    .eq("class_id", cls.id)
    .neq("status", "archived");
  assert.equal(activityCount, 8, "expected 8 classroom activities");

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  const report = await buildTeacherClassReportPayload({
    serviceRole: admin,
    teacherId: authUser.id,
    classId: cls.id,
    fromDate,
    toDate,
    skipAudit: true,
  });
  assert.ok(report.ok, report.code || "report build failed");

  const cohort = report.payload.cohortSummary;
  assert.equal(report.payload.roster.studentCount, 22);
  assert.ok(cohort.studentsWithActivity > 0, "studentsWithActivity must be > 0");
  assert.ok(cohort.totalAnswers > 0, "totalAnswers must be > 0");
  assert.ok(cohort.accuracy > 0, "accuracy must reflect classroom results");

  console.log(
    JSON.stringify(
      {
        schoolId: SCHOOL_ID,
        class: { id: cls.id, name: cls.name, subject: cls.subject_focus },
        rosterCount,
        activityCount,
        cohortSummary: cohort,
      },
      null,
      2
    )
  );
  console.log("\ndemo-school-class-report-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
