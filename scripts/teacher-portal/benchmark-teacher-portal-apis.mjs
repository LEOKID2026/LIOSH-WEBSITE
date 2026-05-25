#!/usr/bin/env node
/**
 * Benchmark teacher portal API build times (server-side).
 * node --env-file=.env.local scripts/teacher-portal/benchmark-teacher-portal-apis.mjs
 */
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { parseConfig } from "./teacher-classroom-sim/config.mjs";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";

const config = parseConfig([]);
const manifest = loadManifest(config.stateDir);
if (!manifest?.teacherId || !manifest?.classId) {
  console.error("Missing manifest — run bootstrap first");
  process.exit(1);
}

const admin = createAdminClient();
const teacherId = manifest.teacherId;
const classId = manifest.classId;
const studentIds = [
  manifest.students[0]?.id,
  manifest.students[9]?.id,
  manifest.students[17]?.id,
].filter(Boolean);

const toDate = new Date();
const fromDate = new Date(toDate.getTime() - 30 * 86_400_000);

async function time(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - t0);
  return { label, ms, result };
}

console.log("\n=== Teacher Portal API Benchmark (server build) ===\n");

const rows = [];

rows.push(
  await time("dashboard_lightweight", () =>
    buildTeacherDashboardPayload({ serviceRole: admin, teacherId })
  )
);

rows.push(
  await time("class_report_20_students", () =>
    buildTeacherClassReportPayload({
      serviceRole: admin,
      teacherId,
      classId,
      fromDate,
      toDate,
    })
  )
);

for (const sid of studentIds) {
  rows.push(
    await time(`student_report_${sid.slice(0, 8)}`, () =>
      buildTeacherStudentReportPayload({
        serviceRole: admin,
        teacherId,
        studentId: sid,
        fromDate,
        toDate,
        skipAudit: true,
      })
    )
  );
}

console.log("| Endpoint | ms | ok |");
console.log("|----------|-----|-----|");
for (const row of rows) {
  const ok = row.result?.ok ? "yes" : "no";
  console.log(`| ${row.label} | ${row.ms} | ${ok} |`);
}

const dash = rows.find((r) => r.label === "dashboard_lightweight");
if (dash?.result?.ok) {
  console.log(`\nDashboard students: ${dash.result.payload?.students?.length ?? 0}`);
  console.log(`Latest subject: ${dash.result.payload?.summary?.latestSubjectLabel ?? "—"}`);
}

const classRow = rows.find((r) => r.label === "class_report_20_students");
if (classRow?.result?.ok) {
  console.log(`Class cohort answers: ${classRow.result.payload?.cohortSummary?.totalAnswers ?? 0}`);
}

console.log("\nDone.\n");
