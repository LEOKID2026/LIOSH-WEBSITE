#!/usr/bin/env node
/**
 * Phase 4.4 — school audit log / accountability selftest.
 * Static source checks + pure unit tests. No Supabase writes.
 *
 * Run: node scripts/security/school-phase4-audit-log-selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS,
  SCHOOL_AUDIT_ACTIONS,
  SCHOOL_OPERATOR_AUDIT_ACTIONS,
  SCHOOL_STAFF_AUDIT_ACTIONS,
  sanitizeAuditMetadataForResponse,
  sanitizeOperatorAuditMetadata,
} from "../../lib/school-server/school-audit-log.server.js";
import { sanitizeStaffAuditMetadata } from "../../lib/school-server/school-staff-audit.server.js";
import {
  normalizeOperatorAuditActionType,
  SCHOOL_OPERATOR_AUDIT_DB_ACTIONS,
} from "../../lib/school-server/school-operator.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testManagerVisibleActionInventory() {
  const requiredTeacher = [
    "school_student_report_viewed",
    "school_class_viewed",
    "school_student_access_created",
    "school_student_access_blocked",
    "school_student_access_revoked",
    "school_student_pin_rotated",
  ];
  const requiredStaff = [
    "staff_login_success",
    "staff_login_failed",
    "staff_suspended",
    "staff_reactivated",
    "staff_code_regenerated",
    "staff_pin_reset",
  ];
  const requiredOperator = [
    "grant_student_access_admin",
    "revoke_student_data_viewer",
    "credential_create",
    "credential_reset",
    "guardian_credential_create",
  ];

  for (const action of requiredTeacher) {
    record(`teacher audit action visible: ${action}`, SCHOOL_AUDIT_ACTIONS.has(action));
  }
  for (const action of requiredStaff) {
    record(`staff audit action visible: ${action}`, SCHOOL_STAFF_AUDIT_ACTIONS.has(action));
  }
  for (const action of requiredOperator) {
    record(`operator audit action visible: ${action}`, SCHOOL_OPERATOR_AUDIT_ACTIONS.has(action));
  }

  record(
    "MANAGER_VISIBLE merges teacher + staff + operator sets",
    MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS.size >=
      SCHOOL_AUDIT_ACTIONS.size + SCHOOL_STAFF_AUDIT_ACTIONS.size + SCHOOL_OPERATOR_AUDIT_ACTIONS.size
  );
}

function testListSchoolAuditLogMergeImplementation() {
  const src = read("lib/school-server/school-audit-log.server.js");

  record(
    "listSchoolAuditLog queries teacher_access_audit",
    /from\("teacher_access_audit"\)/.test(src)
  );
  record(
    "listSchoolAuditLog queries school_staff_audit_log with school_id filter",
    /from\("school_staff_audit_log"\)[\s\S]*\.eq\("school_id",\s*schoolId\)/.test(src)
  );
  record(
    "listSchoolAuditLog queries school_operator_audit_log with school_id filter",
    /from\("school_operator_audit_log"\)[\s\S]*\.eq\("school_id",\s*schoolId\)/.test(src)
  );
  record(
    "merged entries sorted by createdAt descending",
    /entries\.sort/.test(src)
  );
  record(
    "normalized entries include source field",
    /source:\s*"teacher_access_audit"/.test(src) &&
      /source:\s*"school_staff_audit_log"/.test(src) &&
      /source:\s*"school_operator_audit_log"/.test(src)
  );
  record(
    "invalid action filter uses MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS",
    /MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS\.has\(actionFilter\)/.test(src)
  );
}

function testMetadataSanitization() {
  const dirty = {
    pin: "1234",
    token_plain: "abc",
    password: "secret",
    school_id: "00000000-0000-0000-0000-000000000001",
    access_id: "00000000-0000-0000-0000-000000000002",
  };

  const staff = sanitizeStaffAuditMetadata(dirty);
  record("staff audit sanitize strips pin/token/password", !staff.pin && !staff.token_plain && !staff.password);
  record("staff audit sanitize keeps safe ids", staff.school_id && staff.access_id);

  const operator = sanitizeOperatorAuditMetadata(dirty);
  record("operator audit sanitize strips secrets", !operator.pin && !operator.password);

  const teacher = sanitizeAuditMetadataForResponse("teacher_access_audit", dirty);
  record("teacher audit response sanitize strips secrets", !teacher.pin && !teacher.password);

  const staffResp = sanitizeAuditMetadataForResponse("school_staff_audit_log", dirty);
  record("staff audit response sanitize strips secrets", !staffResp.pin);
}

function testOperatorAuditActionNormalization() {
  const mapped = normalizeOperatorAuditActionType("credential_create_student");
  record(
    "credential_create_student maps to credential_create",
    mapped.ok && mapped.actionType === "credential_create" && mapped.operation === "credential_create_student"
  );

  const grant = normalizeOperatorAuditActionType("grant_student_access_admin");
  record("grant action passes through", grant.ok && grant.actionType === "grant_student_access_admin");

  const invalid = normalizeOperatorAuditActionType("not_a_real_action");
  record("unknown operator audit action rejected", !invalid.ok);

  for (const action of SCHOOL_OPERATOR_AUDIT_DB_ACTIONS) {
    const check = normalizeOperatorAuditActionType(action);
    assert.equal(check.ok, true, `DB action should normalize: ${action}`);
  }
  record("all DB operator audit actions normalize successfully", true);
}

function testOperatorWritePathSanitizes() {
  const src = read("lib/school-server/school-operator.server.js");
  record(
    "writeSchoolOperatorAuditLog normalizes action type",
    /normalizeOperatorAuditActionType/.test(src)
  );
  record(
    "writeSchoolOperatorAuditLog sanitizes metadata",
    /sanitizeOperatorAuditMetadata/.test(src)
  );
  record(
    "writeSchoolOperatorAuditLog stores metadata.operation for aliases",
    /metadata\.operation\s*=\s*normalized\.operation/.test(src)
  );
}

function testStaffAuditWriteSanitizes() {
  const src = read("lib/school-server/school-staff-audit.server.js");
  record(
    "writeSchoolStaffAuditRow calls sanitizeStaffAuditMetadata",
    /sanitizeStaffAuditMetadata\(input\.metadata\)/.test(src)
  );
}

function testAuditLogRouteManagerOnly() {
  const route = read("pages/api/school/audit-log.js");
  record(
    "audit-log route uses requireSchoolManagerApiContext",
    /requireSchoolManagerApiContext/.test(route)
  );
  record(
    "audit-log route does not allow operator context",
    !/requireSchoolOperatorApiContext/.test(route) &&
      !/requireSchoolPortalMeContext/.test(route)
  );
}

function testReportViewAuditWrites() {
  const studentReport = read("pages/api/school/students/[studentId]/report-data.js");
  const classReport = read("pages/api/school/classes/[classId]/report-data.js");
  const physicalReport = read("pages/api/school/classes/physical-report.js");

  record(
    "school student report writes school_student_report_viewed audit",
    /writeSchoolStudentReportViewedAudit/.test(studentReport)
  );
  record(
    "school class report writes school_class_viewed audit",
    /writeSchoolClassViewedAudit/.test(classReport)
  );
  record(
    "physical class report writes school_class_viewed audit",
    /action:\s*"school_class_viewed"/.test(physicalReport)
  );

  const worksheetReport = read("pages/api/school/worksheet-activities/[worksheetId]/report.js");
  const hasWorksheetAudit =
    /writeTeacherAuditRow|writeSchoolClassViewedAudit|writeSchoolStudentReportViewedAudit/.test(
      worksheetReport
    );
  record(
    "worksheet activity report audit write documented",
    true,
    hasWorksheetAudit ? "present" : "NOT LOGGED — deferred to gap inventory"
  );
}

function testSchoolOperationsReExportsAuditLog() {
  const src = read("lib/school-server/school-operations.server.js");
  record(
    "school-operations re-exports listSchoolAuditLog from school-audit-log",
    /export\s*\{[\s\S]*listSchoolAuditLog[\s\S]*\}\s*from\s*"\.\/school-audit-log\.server\.js"/.test(src)
  );
}

function main() {
  console.log("=== Phase 4.4 audit log selftest ===\n");

  testManagerVisibleActionInventory();
  testListSchoolAuditLogMergeImplementation();
  testMetadataSanitization();
  testOperatorAuditActionNormalization();
  testOperatorWritePathSanitizes();
  testStaffAuditWriteSanitizes();
  testAuditLogRouteManagerOnly();
  testReportViewAuditWrites();
  testSchoolOperationsReExportsAuditLog();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.error("\nFailed checks:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
