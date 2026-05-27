#!/usr/bin/env node
/**
 * Regression: student report from school class context includes classroom activity data.
 */
import assert from "node:assert/strict";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(authUser?.id, "Dan Cohen auth user");

  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus")
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

  const { data: studentRow } = await admin
    .from("students")
    .select("full_name")
    .eq("id", studentId)
    .maybeSingle();

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  const report = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: authUser.id,
      studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true, classId: cls.id }
  );
  assert.ok(report.ok, report.code || "student report build failed");

  const summary = report.payload.summary || {};
  assert.ok(summary.totalAnswers > 0, "student totalAnswers must be > 0");
  assert.ok(String(report.payload.student?.full_name || "").trim(), "student full_name must be set");

  console.log(
    JSON.stringify(
      {
        class: { id: cls.id, name: cls.name },
        student: { id: studentId, full_name: report.payload.student?.full_name || studentRow?.full_name },
        summary,
      },
      null,
      2
    )
  );
  console.log("\ndemo-school-student-report-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
