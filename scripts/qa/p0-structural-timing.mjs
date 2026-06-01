#!/usr/bin/env node
/**
 * P0 structural performance — phased direct-build timings on demo-school data.
 * node --env-file=.env.local scripts/qa/p0-structural-timing.mjs
 */
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import {
  buildTeacherDashboardShellPayload,
  buildTeacherDashboardActivityPayload,
  buildTeacherDashboardPayload,
} from "../../lib/teacher-server/teacher-dashboard.server.js";
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { buildSchoolPhysicalClassReportPayload } from "../../lib/school-server/school-physical-class-report.server.js";
import { buildSchoolBrowseStatusMaps } from "../../lib/school-server/school-browse-status.server.js";
import { listSchoolStudentsInPhysicalClass } from "../../lib/school-server/school-students.server.js";
import { listAdminTeachers } from "../../lib/admin-server/admin-teachers.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const SCHOOL_ID = process.env.DEMO_SCHOOL_ID || "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const GRADE = "1";
const PHYSICAL = physicalClassName(1, 1);
const CLASS_PHYSICAL = physicalClassName(1, 2);
const CLASS_SUBJECT = "geometry";

async function timed(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  return { label, ms: Math.round(performance.now() - t0), result };
}

async function main() {
  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(dan?.id, "dan@leo-k.com");

  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus")
    .eq("teacher_id", dan.id)
    .eq("name", CLASS_PHYSICAL)
    .eq("subject_focus", CLASS_SUBJECT)
    .maybeSingle();
  assert.ok(cls?.id, "geometry class");

  const { data: rosterRows } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null);
  const studentId = rosterRows?.[0]?.student_id;
  assert.ok(studentId, "roster student");

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  const rows = [];

  rows.push(
    await timed("teacher_dashboard_shell", () =>
      buildTeacherDashboardShellPayload({ serviceRole: admin, teacherId: dan.id })
    )
  );

  rows.push(
    await timed("teacher_dashboard_activity", () =>
      buildTeacherDashboardActivityPayload({ serviceRole: admin, teacherId: dan.id })
    )
  );

  rows.push(
    await timed("teacher_dashboard_full", () =>
      buildTeacherDashboardPayload({ serviceRole: admin, teacherId: dan.id })
    )
  );

  rows.push(
    await timed("teacher_class_report", () =>
      buildTeacherClassReportPayload({
        serviceRole: admin,
        teacherId: dan.id,
        classId: cls.id,
        fromDate,
        toDate,
        skipAudit: true,
      })
    )
  );

  rows.push(
    await timed("teacher_student_report", () =>
      buildTeacherStudentReportPayload({
        serviceRole: admin,
        teacherId: dan.id,
        studentId,
        fromDate,
        toDate,
        skipAudit: true,
        classId: cls.id,
      })
    )
  );

  rows.push(
    await timed("school_physical_report_summary", () =>
      buildSchoolPhysicalClassReportPayload({
        serviceRole: admin,
        schoolId: SCHOOL_ID,
        gradeLevel: GRADE,
        physicalClassName: PHYSICAL,
        fromDate,
        toDate,
        loadPhase: "summary",
      })
    )
  );

  rows.push(
    await timed("school_physical_report_full", () =>
      buildSchoolPhysicalClassReportPayload({
        serviceRole: admin,
        schoolId: SCHOOL_ID,
        gradeLevel: GRADE,
        physicalClassName: PHYSICAL,
        fromDate,
        toDate,
        loadPhase: "full",
      })
    )
  );

  rows.push(
    await timed("school_browse_status", () =>
      buildSchoolBrowseStatusMaps(admin, SCHOOL_ID, { gradeLevel: GRADE })
    )
  );

  rows.push(
    await timed("school_students_physical_cold", () =>
      listSchoolStudentsInPhysicalClass(admin, SCHOOL_ID, {
        gradeLevel: GRADE,
        physicalClassName: PHYSICAL,
      })
    )
  );

  rows.push(
    await timed("school_students_physical_warm", () =>
      listSchoolStudentsInPhysicalClass(admin, SCHOOL_ID, {
        gradeLevel: GRADE,
        physicalClassName: PHYSICAL,
      })
    )
  );

  rows.push(
    await timed("admin_teachers_list", () => listAdminTeachers(admin))
  );

  const report = {
    measuredAt: new Date().toISOString(),
    demoSchoolId: SCHOOL_ID,
    classId: cls.id,
    rosterSize: rosterRows?.length ?? 0,
    rows: rows.map((r) => ({
      label: r.label,
      ms: r.ms,
      ok: r.result?.ok !== false,
      payloadBytes:
        r.result?.payload != null
          ? JSON.stringify(r.result.payload).length
          : r.result?.teachers
            ? JSON.stringify(r.result.teachers).length
            : r.result?.students
              ? JSON.stringify(r.result.students).length
              : null,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
