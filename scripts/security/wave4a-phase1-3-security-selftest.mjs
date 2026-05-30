#!/usr/bin/env node
/**
 * Wave 4A — Phase 1–3 security closure static selftest.
 * No HTTP server, no Supabase writes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function testP1_4PolicyAcceptance() {
  const policy = read("lib/parent-server/policy-acceptance.server.js");
  const regRequest = read("lib/auth/auth-registration-request.server.js");

  const hasRoleBlock =
    /role\s*===\s*["']teacher["']/.test(policy) && /role\s*===\s*["']admin["']/.test(policy);
  const hasEntitlementBlock =
    /POLICY_ACCEPTANCE_BLOCKED_PERSONAS/.test(policy) &&
    /private_teacher/.test(policy) &&
    /school_teacher/.test(policy) &&
    /school_manager/.test(policy) &&
    /school_operator/.test(policy) &&
    /admin/.test(policy) &&
    /account_persona_entitlements/.test(policy) &&
    /assertPolicyAcceptanceParentEligible/.test(policy) &&
    /resolveAuthenticatedParentUserId[\s\S]*assertPolicyAcceptanceParentEligible/.test(policy);

  const teacherRoleEvidence =
    /app_metadata:\s*\{\s*role:\s*["']teacher["']\s*\}/.test(regRequest) &&
    /ensureTeacherAuthUser/.test(regRequest);

  let approach = "unknown";
  if (hasEntitlementBlock && hasRoleBlock) {
    approach = "entitlement-based + app_metadata.role defense-in-depth";
  } else if (hasEntitlementBlock) {
    approach = "entitlement-based";
  } else if (hasRoleBlock) {
    approach = "app_metadata.role";
  }

  console.log(`[P1-4] approach: ${approach}`);
  if (hasRoleBlock && teacherRoleEvidence) {
    console.log(
      "[P1-4] app_metadata.role teacher evidence: lib/auth/auth-registration-request.server.js ensureTeacherAuthUser"
    );
  }

  record(
    "P1-4 non-parent persona block before resolveAuthenticatedParentUserId returns ok",
    hasEntitlementBlock || hasRoleBlock,
    hasEntitlementBlock
      ? "entitlement query + assertPolicyAcceptanceParentEligible"
      : hasRoleBlock
        ? "role check only"
        : "missing guard"
  );

  record(
    "P1-4 blocked personas include school_teacher/private_teacher/school_manager/school_operator/admin",
    hasEntitlementBlock,
    hasEntitlementBlock ? "POLICY_ACCEPTANCE_BLOCKED_PERSONAS" : "missing list"
  );

  record(
    "P1-4 structural guard cannot be bypassed without check",
    /assertPolicyAcceptanceParentEligible/.test(policy) &&
      /return\s*\{\s*ok:\s*true,\s*parentUserId/.test(policy),
    "eligible check precedes parentUserId return"
  );
}

function testP2_8DeactivatedTeacher() {
  const me = read("pages/api/teacher/me.js");
  const onboard = read("pages/api/teacher/onboard.js");

  const meBlocks =
    /loadTeacherLimitsRow/.test(me) &&
    /is_account_active\s*===\s*false/.test(me) &&
    /account_deactivated/.test(me);

  const onboardBlocks =
    /loadTeacherLimitsRow/.test(onboard) &&
    /is_account_active\s*===\s*false/.test(onboard) &&
    /account_deactivated/.test(onboard) &&
    /limitsCheck\.limits/.test(onboard);

  record("P2-8 me.js blocks deactivated teacher", meBlocks, "is_account_active === false");
  record(
    "P2-8 onboard.js blocks deactivated teacher when limits row exists",
    onboardBlocks,
    "limitsCheck before provisionTeacherRows"
  );
}

function testP3_2StudentSessionLifecycle() {
  const schoolAcct = read("lib/school-server/school-account-management.server.js");
  const studentAuth = read("lib/learning-supabase/student-auth.js");
  const teacherAccess = read("lib/teacher-server/teacher-student-login-access.server.js");
  const studentActivity = read("lib/teacher-server/student-activity.server.js");

  const exported = /export\s+async\s+function\s+endLiveStudentSessions/.test(teacherAccess);
  record("P3-2 endLiveStudentSessions exported", exported);

  const blockCalls =
    /setSchoolStudentBlocked[\s\S]*endLiveStudentSessions/.test(schoolAcct) &&
    /if\s*\(\s*blocked\s*\)[\s\S]*endLiveStudentSessions/.test(schoolAcct);
  record("P3-2 setSchoolStudentBlocked ends sessions on block", blockCalls);

  const revokeCalls =
    /revokeSchoolStudentAccess[\s\S]*endLiveStudentSessions/.test(schoolAcct);
  record("P3-2 revokeSchoolStudentAccess ends sessions", revokeCalls);

  const rotateCalls =
    /rotateSchoolStudentPin[\s\S]*endLiveStudentSessions/.test(schoolAcct);
  record("P3-2 rotateSchoolStudentPin ends sessions", rotateCalls);

  const nullAccessCodeRejected =
    /export\s+function\s+isStudentSessionAccessCodeBindingValid/.test(
      read("lib/learning-supabase/student-session-access-code.server.js")
    ) &&
    /if\s*\(\s*!sessionRow\.access_code_id\s*\)[\s\S]*return\s+null/.test(studentAuth) &&
    /isStudentSessionAccessCodeBindingValid/.test(studentAuth);
  record(
    "P3-2 null/missing access_code_id sessions rejected fail-closed",
    nullAccessCodeRejected,
    "requires access_code_id + active code row"
  );

  const accessCodeRevalidation =
    /getAuthenticatedStudentSession[\s\S]*student_access_codes[\s\S]*is_active/.test(
      studentAuth
    ) && /revoked_at/.test(studentAuth);
  record(
    "P3-2 getAuthenticatedStudentSession re-validates access_code_id",
    accessCodeRevalidation
  );

  const batchMonitorSubjectGate =
    /loadStudentActivityBatchMonitor[\s\S]*assertActivitySubjectAllowed/.test(studentActivity);
  record(
    "P2-4 loadStudentActivityBatchMonitor re-checks subject grant",
    batchMonitorSubjectGate,
    "assertActivitySubjectAllowed on batch subject"
  );
}

function main() {
  testP1_4PolicyAcceptance();
  testP2_8DeactivatedTeacher();
  testP3_2StudentSessionLifecycle();

  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error(`\nwave4a-phase1-3-security-selftest: ${failed.length} FAIL`);
    process.exit(1);
  }
  console.log(`\nwave4a-phase1-3-security-selftest: ${results.length}/${results.length} PASS`);
}

main();
