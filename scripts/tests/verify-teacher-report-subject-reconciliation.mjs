#!/usr/bin/env node
/**
 * Verify teacher student report summary reconciles with subject breakdown after scope filter.
 */
import assert from "node:assert/strict";
import {
  analyzeReportSubjectReconciliation,
  filterReportByPermittedSubjects,
  loadTeacherPermittedSubjects,
  sumMetricsFromSubjectRollups,
} from "../../lib/school-server/school-subjects.server.js";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";

const STUDENT_ID = process.argv[2] || "0794e3ef-2fad-4a52-8c9a-28ba16a15d71";

async function main() {
  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(dan?.id, "Dan Cohen auth user");

  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);

  const perm = await loadTeacherPermittedSubjects(admin, dan.id);
  assert.ok(perm.ok, perm.code || "perm load failed");

  const built = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: dan.id,
      studentId: STUDENT_ID,
      fromDate,
      toDate,
    },
    { skipAudit: true }
  );
  assert.ok(built.ok, built.code || "report build failed");

  const beforeFilter = analyzeReportSubjectReconciliation(built.payload, perm.permittedSubjects);
  const filtered = filterReportByPermittedSubjects(built.payload, perm.permittedSubjects);
  const afterFilter = analyzeReportSubjectReconciliation(filtered, perm.permittedSubjects);

  const subjectCardMetrics = sumMetricsFromSubjectRollups(filtered.subjects);
  assert.equal(
    Number(filtered.summary?.totalSessions || 0),
    subjectCardMetrics.totalSessions,
    "summary sessions must match subject rollup"
  );
  assert.equal(
    Number(filtered.summary?.totalAnswers || 0),
    subjectCardMetrics.totalAnswers,
    "summary answers must match subject rollup"
  );

  const dash = await buildTeacherDashboardPayload({
    serviceRole: admin,
    teacherId: dan.id,
    rangeDays: 30,
  });
  const card = (dash.payload?.students || []).find((s) => s.studentId === STUDENT_ID);
  assert.ok(card, "dashboard student card");
  assert.equal(
    Number(card.totalSessions),
    Number(filtered.summary?.totalSessions || 0),
    "dashboard sessions must match filtered report summary"
  );
  assert.equal(
    Number(card.totalAnswers),
    Number(filtered.summary?.totalAnswers || 0),
    "dashboard answers must match filtered report summary"
  );

  console.log(
    JSON.stringify(
      {
        studentId: STUDENT_ID,
        teacherEmail: "dan@leo-k.com",
        permittedSubjects: perm.permittedSubjects ? [...perm.permittedSubjects] : null,
        beforeFilter: {
          summary: beforeFilter.summary,
          allSubjectsTotal: beforeFilter.allSubjectsTotal,
          visibleSubjectsTotal: beforeFilter.visibleSubjectsTotal,
          droppedSubjects: beforeFilter.droppedSubjects,
          gap: beforeFilter.gap,
        },
        afterFilter: {
          summary: afterFilter.summary,
          visibleSubjects: afterFilter.visibleSubjects,
          reconciled: afterFilter.reconciled,
        },
        dashboardCard: {
          totalSessions: card.totalSessions,
          totalAnswers: card.totalAnswers,
          accuracy: card.accuracy,
          statusBadge: card.statusBadge,
        },
      },
      null,
      2
    )
  );
  console.log("\nverify-teacher-report-subject-reconciliation: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
