#!/usr/bin/env node
/**
 * Phase 4.2 — school report/export hardening selftest.
 * Static source checks + pure unit tests. No Supabase writes.
 *
 * Run: node scripts/security/school-phase4-report-hardening-selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterReportByPermittedSubjects,
  sumMetricsFromSubjectRollups,
} from "../../lib/school-server/school-subjects.server.js";
import { stripInternalReportPayloadFields } from "../../lib/parent-server/report-data-aggregate.server.js";
import { isSchoolClassRowInScope } from "../../lib/school-server/school-class-scope.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const SCHOOL_REPORT_ROUTES = [
  "pages/api/school/students/[studentId]/report-data.js",
  "pages/api/school/classes/[classId]/report-data.js",
  "pages/api/school/classes/physical-report.js",
  "pages/api/school/worksheet-activities/[worksheetId]/report.js",
];

const TEACHER_REPORT_ROUTES = [
  "pages/api/teacher/students/[studentId]/report-data.js",
  "pages/api/teacher/classes/[classId]/report-data.js",
  "pages/api/teacher/students/[studentId]/parent-report-data.js",
];

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testSchoolReportRoutesHaveNoStoreHeaders() {
  for (const rel of SCHOOL_REPORT_ROUTES) {
    const src = read(rel);
    const hasHelper =
      /setSensitiveReportNoStoreHeaders\s*\(\s*res\s*\)/.test(src) ||
      (/Cache-Control/.test(src) && /no-store/.test(src));
    const beforeJson =
      src.indexOf("setSensitiveReportNoStoreHeaders") < src.indexOf(".json(") ||
      (src.indexOf("Cache-Control") < src.indexOf(".json(") && src.indexOf("Cache-Control") >= 0);
    record(`${rel} sets no-store before JSON`, hasHelper && beforeJson, rel);
    assert.equal(hasHelper && beforeJson, true);
  }
}

function testTeacherReportRoutesAlreadyHaveHeaders() {
  for (const rel of TEACHER_REPORT_ROUTES) {
    const src = read(rel);
    const ok =
      /Cache-Control/.test(src) &&
      /no-store/.test(src) &&
      src.indexOf("Cache-Control") < src.lastIndexOf(".json(");
    record(`${rel} already has no-store headers`, ok);
    assert.equal(ok, true);
  }
}

function testSubjectFilterDropsUngrantedSubjects() {
  const payload = {
    summary: { totalSessions: 10, totalAnswers: 100, correctAnswers: 80, wrongAnswers: 20 },
    subjects: {
      math: { sessions: 6, answers: 60, correct: 50, wrong: 10 },
      hebrew: { sessions: 4, answers: 40, correct: 30, wrong: 10 },
    },
    _dailyBySubject: {
      "2026-05-01": {
        math: { sessions: 2, answers: 20, correct: 15, wrong: 5 },
        hebrew: { sessions: 1, answers: 10, correct: 8, wrong: 2 },
      },
    },
  };

  const filtered = filterReportByPermittedSubjects(payload, new Set(["math"]));
  assert.ok(!Object.prototype.hasOwnProperty.call(filtered, "hebrew"));
  assert.equal(filtered.subjects?.hebrew, undefined);
  assert.ok(filtered.subjects?.math);
  assert.equal(Object.prototype.hasOwnProperty.call(filtered, "_dailyBySubject"), false);
  record("filterReportByPermittedSubjects drops ungranted subjects", true);
}

function testSubjectFilterRecomputesSummary() {
  const payload = {
    summary: { totalSessions: 10, totalAnswers: 100, correctAnswers: 80, wrongAnswers: 20 },
    subjects: {
      math: { sessions: 6, answers: 60, correct: 50, wrong: 10 },
      hebrew: { sessions: 4, answers: 40, correct: 30, wrong: 10 },
    },
  };

  const filtered = filterReportByPermittedSubjects(payload, new Set(["math"]));
  const metrics = sumMetricsFromSubjectRollups(filtered.subjects);
  assert.equal(filtered.summary.totalSessions, metrics.totalSessions);
  assert.equal(filtered.summary.totalAnswers, metrics.totalAnswers);
  assert.equal(filtered.summary.totalSessions, 6);
  assert.equal(filtered.summary.totalAnswers, 60);
  record("filterReportByPermittedSubjects recomputes summary from visible subjects", true);
}

function testStripInternalReportPayloadFields() {
  const payload = {
    summary: { totalSessions: 1 },
    _dailyBySubject: { "2026-05-01": { math: { sessions: 1 } } },
  };
  const stripped = stripInternalReportPayloadFields(payload);
  assert.equal(Object.prototype.hasOwnProperty.call(stripped, "_dailyBySubject"), false);
  record("stripInternalReportPayloadFields removes _dailyBySubject", true);
}

function testSchoolStudentReportGuardChain() {
  const src = read("pages/api/school/students/[studentId]/report-data.js");
  const handler = src.slice(src.indexOf("export default"));
  const ok =
    /requireSchoolDataViewerContext/.test(handler) &&
    /verifyStudentVisibleToSchool/.test(handler) &&
    handler.indexOf("verifyStudentVisibleToSchool") <
      handler.indexOf("buildTeacherStudentReportPayload") &&
    /stripInternalReportPayloadFields/.test(handler);
  record("school student report-data guard + strip chain", ok);
  assert.equal(ok, true);
}

function testSchoolClassReportGuardChain() {
  const src = read("pages/api/school/classes/[classId]/report-data.js");
  const handler = src.slice(src.indexOf("export default"));
  const ok =
    /requireSchoolManagerApiContext/.test(handler) &&
    /loadSchoolClassInScope/.test(handler) &&
    handler.indexOf("loadSchoolClassInScope") <
      handler.indexOf("buildTeacherClassReportPayload") &&
    /stripInternalReportPayloadFields/.test(handler);
  record("school class report-data scope before build + strip", ok);
  assert.equal(ok, true);
}

function testPhysicalReportSchoolScoped() {
  const src = read("pages/api/school/classes/physical-report.js");
  const handler = src.slice(src.indexOf("export default"));
  const ok =
    /requireSchoolManagerApiContext/.test(handler) &&
    /buildSchoolPhysicalClassReportPayload/.test(handler) &&
    /schoolId:\s*ctx\.schoolId/.test(handler) &&
    /stripInternalReportPayloadFields/.test(handler);
  record("physical-report uses session schoolId + strip", ok);
  assert.equal(ok, true);
}

function testTeacherStudentReportUsesSubjectFilter() {
  const src = read("pages/api/teacher/students/[studentId]/report-data.js");
  const handler = src.slice(src.indexOf("export default"));
  const ok =
    /applySchoolTeacherReportFilter/.test(handler) &&
    handler.indexOf("buildTeacherStudentReportPayload") <
      handler.indexOf("applySchoolTeacherReportFilter");
  record("teacher student report applies applySchoolTeacherReportFilter after build", ok);
  assert.equal(ok, true);
}

function testTeacherClassReportSubjectGate() {
  const src = read("pages/api/teacher/classes/[classId]/report-data.js");
  const handler = src.slice(src.indexOf("export default"));
  const ok =
    /assertTeacherClassReportSubjectAllowed/.test(handler) &&
    handler.indexOf("assertTeacherClassReportSubjectAllowed") <
      handler.indexOf("buildTeacherClassReportPayload");
  record("teacher class report subject gate before build", ok);
  assert.equal(ok, true);
}

function testGap01CrossSchoolClassStillBlocked() {
  const blocked = !isSchoolClassRowInScope(
    { id: "class-1", teacher_id: "teacher-dual", school_id: "school-a" },
    "school-b",
    ["teacher-dual"]
  );
  assert.equal(blocked, true);
  record("Phase 4.1 cross-school class scope remains blocked (regression)", blocked);
}

function testNoSchoolExportRoutes() {
  const schoolApiDir = path.join(ROOT, "pages/api/school");
  const files = fs.readdirSync(schoolApiDir, { recursive: true });
  const exportRoutes = files.filter(
    (f) => typeof f === "string" && /export/i.test(f) && f.endsWith(".js")
  );
  record(
    "no school report export routes under pages/api/school",
    exportRoutes.length === 0,
    exportRoutes.length ? exportRoutes.join(", ") : "NOT APPLICABLE"
  );
  assert.equal(exportRoutes.length, 0);
}

function testTeacherExportUsesSameGuardAsReport() {
  const reportSrc = read("pages/api/teacher/activities/[activityId]/report.js");
  const exportSrc = read("pages/api/teacher/activities/[activityId]/report-export.js");
  const reportGuard =
    /requireTeacherApiContext/.test(reportSrc) && /buildActivityReportPayload/.test(reportSrc);
  const exportGuard =
    /requireTeacherApiContext/.test(exportSrc) &&
    /buildEnrichedActivityReportPayload/.test(exportSrc);
  const bothNoStore = /no-store/.test(reportSrc) && /no-store/.test(exportSrc);
  record(
    "teacher activity export shares auth + report builder family + no-store",
    reportGuard && exportGuard && bothNoStore
  );
  assert.equal(reportGuard && exportGuard && bothNoStore, true);
}

function main() {
  console.log("school-phase4-report-hardening-selftest\n");

  testSchoolReportRoutesHaveNoStoreHeaders();
  testTeacherReportRoutesAlreadyHaveHeaders();
  testSubjectFilterDropsUngrantedSubjects();
  testSubjectFilterRecomputesSummary();
  testStripInternalReportPayloadFields();
  testSchoolStudentReportGuardChain();
  testSchoolClassReportGuardChain();
  testPhysicalReportSchoolScoped();
  testTeacherStudentReportUsesSubjectFilter();
  testTeacherClassReportSubjectGate();
  testGap01CrossSchoolClassStillBlocked();
  testNoSchoolExportRoutes();
  testTeacherExportUsesSameGuardAsReport();

  const failed = results.filter((r) => !r.pass);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\nschool-phase4-report-hardening-selftest: ${passCount}/${results.length} PASS`);

  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}`);
    process.exit(1);
  }
}

main();
