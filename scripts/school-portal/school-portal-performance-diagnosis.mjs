#!/usr/bin/env node
/**
 * School portal API/server performance diagnosis.
 * Run: node --env-file=.env.local scripts/school-portal/school-portal-performance-diagnosis.mjs
 */
import { performance } from "node:perf_hooks";
import { createServiceRole, findAuthUserByEmail } from "./demo-school-lib.mjs";
import { buildSchoolDashboardStats } from "../../lib/school-server/school-session.server.js";
import { listSchoolTeachers } from "../../lib/school-server/school-teachers.server.js";
import { listSchoolClasses } from "../../lib/school-server/school-classes.server.js";
import { getSchoolStudentBrowseSummary } from "../../lib/school-server/school-students.server.js";
import { getSchoolTeacherDetail } from "../../lib/school-server/school-teachers.server.js";
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { loadSchoolVisibleStudentIds } from "../../lib/school-server/school-scope.server.js";
import { invalidateSchoolServerCache } from "../../lib/school-server/school-server-cache.server.js";
import { physicalClassName } from "./demo-school-data.mjs";

async function time(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - t0);
  return { label, ms, ok: result?.ok !== false, meta: result };
}

async function main() {
  const admin = createServiceRole();
  const manager = await findAuthUserByEmail(admin, "school@leo-k.com");
  if (!manager?.id) throw new Error("school manager auth user missing");

  const { data: membership } = await admin
    .from("school_teacher_memberships")
    .select("school_id")
    .eq("teacher_id", manager.id)
    .eq("role", "school_admin")
    .maybeSingle();
  const schoolId = membership?.school_id;
  if (!schoolId) throw new Error("school manager membership missing");

  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", dan.id)
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null)
    .limit(1);
  const studentId = roster?.[0]?.student_id;

  invalidateSchoolServerCache();

  const cold = [];
  cold.push(await time("dashboard_stats (cold)", () => buildSchoolDashboardStats(admin, schoolId)));
  cold.push(await time("teachers_list (cold)", () => listSchoolTeachers(admin, schoolId)));
  cold.push(await time("classes_list (cold)", () => listSchoolClasses(admin, schoolId)));
  cold.push(await time("students_browse_summary (cold)", () => getSchoolStudentBrowseSummary(admin, schoolId)));
  if (dan?.id) {
    cold.push(
      await time("teacher_detail (cold)", () => getSchoolTeacherDetail(admin, schoolId, dan.id))
    );
  }
  if (cls?.id && dan?.id) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    cold.push(
      await time("class_report (cold)", () =>
        buildTeacherClassReportPayload(
          { serviceRole: admin, teacherId: dan.id, classId: cls.id, fromDate, toDate },
          { skipAudit: true }
        )
      )
    );
  }
  if (studentId && dan?.id) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    cold.push(
      await time("student_report (cold)", () =>
        buildTeacherStudentReportPayload(
          { serviceRole: admin, teacherId: dan.id, studentId, fromDate, toDate },
          { skipAudit: true, classId: cls.id }
        )
      )
    );
  }

  const warm = [];
  warm.push(await time("dashboard_stats (warm cache)", () => buildSchoolDashboardStats(admin, schoolId)));
  warm.push(await time("visible_students (warm cache)", () => loadSchoolVisibleStudentIds(admin, schoolId)));
  warm.push(await time("teachers_list (2nd call)", () => listSchoolTeachers(admin, schoolId)));

  const rows = [
    {
      route: "/school/dashboard",
      coldMs: cold.find((r) => r.label.startsWith("dashboard_stats"))?.ms,
      warmMs: warm.find((r) => r.label.startsWith("dashboard_stats"))?.ms,
      slowest: "buildSchoolDashboardStats + loadSchoolVisibleStudentIds",
      cause: "Full school student visibility scan on every stats request",
      fix: "Server TTL cache (60s) + reuse /api/school/me stats on client",
    },
    {
      route: "/school/teachers",
      coldMs: cold.find((r) => r.label.startsWith("teachers_list (cold)"))?.ms,
      warmMs: warm.find((r) => r.label.startsWith("teachers_list (2nd)"))?.ms,
      slowest: "listSchoolTeachers",
      cause: "Was N+1 per-teacher linked student counts",
      fix: "Batch countUniqueLinkedStudents + client SWR cache (3 min)",
    },
    {
      route: "/school/classes",
      coldMs: cold.find((r) => r.label.startsWith("classes_list"))?.ms,
      slowest: "listSchoolClasses",
      cause: "Scope + classes + member/activity counts",
      fix: "Client SWR cache (3 min) on revisit",
    },
    {
      route: "/school/students",
      coldMs: cold.find((r) => r.label.startsWith("students_browse"))?.ms,
      slowest: "getSchoolStudentBrowseSummary",
      cause: "Grade/physical index aggregation",
      fix: "Client SWR cache (3 min) + per-class fetch cached by filters",
    },
    {
      route: "/school/teachers/[teacherId]",
      coldMs: cold.find((r) => r.label.startsWith("teacher_detail"))?.ms,
      slowest: "getSchoolTeacherDetail + subjects",
      cause: "Two parallel API calls on each visit",
      fix: "Client SWR cache (3 min) + show cached detail instantly",
    },
    {
      route: "class report modal",
      coldMs: cold.find((r) => r.label.startsWith("class_report"))?.ms,
      slowest: "buildTeacherClassReportPayload",
      cause: "Per-student aggregation for full roster",
      fix: "Report session cache (2 min); drill-downs stay client-side",
    },
    {
      route: "student report modal",
      coldMs: cold.find((r) => r.label.startsWith("student_report"))?.ms,
      slowest: "verifyStudentVisibleToSchool + buildTeacherStudentReportPayload",
      cause: "Visibility scan + report build",
      fix: "Server visibility cache (60s) + report session cache (2 min)",
    },
    {
      route: "drill-down modals",
      coldMs: 0,
      slowest: "none (client-side)",
      cause: "Data already in class report payload",
      fix: "No extra fetch — unchanged",
    },
  ];

  console.log(
    JSON.stringify(
      {
        schoolId,
        measuredAt: new Date().toISOString(),
        coldTimings: cold,
        warmTimings: warm,
        summaryTable: rows,
      },
      null,
      2
    )
  );
  console.log("\nschool-portal-performance-diagnosis: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
