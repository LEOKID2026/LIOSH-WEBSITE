#!/usr/bin/env node
/**
 * Regression: school manager student report without classId merges school-scoped classroom activity.
 */
import assert from "node:assert/strict";
import { loadSchoolScopedClassroomActivityRollupForStudentReport } from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(authUser?.id, "Dan Cohen auth user");

  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus, grade_level")
    .eq("teacher_id", authUser.id)
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(cls?.id, `geometry class ${targetName} not found`);

  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null)
    .limit(1);
  const studentId = roster?.[0]?.student_id;
  assert.ok(studentId, "no roster student");

  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);

  const schoolRollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
    serviceRole: admin,
    schoolId: DEMO_SCHOOL_ID,
    studentId,
    fromDate,
    toDate,
  });
  assert.ok(schoolRollup.ok, schoolRollup.code || "school rollup failed");
  assert.ok(schoolRollup.classIds?.length, "rollupClassIds must be non-empty");
  assert.ok(Number(schoolRollup.rollup?.answers || 0) > 0, "school rollup answers must be > 0");

  const report = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: authUser.id,
      studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true }
  );
  assert.ok(report.ok, report.code || "base report failed");

  const summary = report.payload.summary || {};
  assert.ok(summary.totalAnswers > 0, "merged totalAnswers must be > 0");
  assert.ok(summary.totalSessions > 0, "merged totalSessions must be > 0");
  assert.equal(summary.totalAnswers, Number(schoolRollup.rollup?.answers || 0), "answers must match school rollup");

  console.log(
    JSON.stringify(
      {
        studentId,
        schoolId: DEMO_SCHOOL_ID,
        classId: null,
        rollupClassIds: schoolRollup.classIds,
        classroomAnswers: schoolRollup.rollup?.answers,
        classroomActivityCount: schoolRollup.activityCount,
        summary: {
          totalAnswers: summary.totalAnswers,
          totalSessions: summary.totalSessions,
          accuracy: summary.accuracy,
        },
      },
      null,
      2
    )
  );
  console.log("\nschool-student-report-school-scope-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
