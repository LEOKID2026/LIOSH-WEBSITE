#!/usr/bin/env node
/**
 * Phase 4.3 — school credential / staff session hardening selftest.
 * Static source checks + pure unit tests. No Supabase writes.
 *
 * Run: node scripts/security/school-phase4-credential-session-selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isStaffAccessRowActiveForSession,
  isStaffSessionRowActive,
  staffPersonaForStaffRole,
} from "../../lib/school-server/school-staff-session-validation.server.js";

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

function testStaffSessionRowActivePure() {
  const now = Date.parse("2026-05-31T12:00:00.000Z");
  const base = {
    id: "sess-1",
    expires_at: "2026-05-31T13:00:00.000Z",
    revoked_at: null,
  };

  record("staff session active when not revoked and not expired", isStaffSessionRowActive(base, now));
  record(
    "staff session inactive when revoked",
    !isStaffSessionRowActive({ ...base, revoked_at: "2026-05-31T11:00:00.000Z" }, now)
  );
  record(
    "staff session inactive when expired",
    !isStaffSessionRowActive({ ...base, expires_at: "2026-05-31T11:00:00.000Z" }, now)
  );
  record("staff session inactive when missing id", !isStaffSessionRowActive({ expires_at: base.expires_at }, now));
}

function testStaffAccessRowActivePure() {
  record(
    "staff access active when is_active and not revoked",
    isStaffAccessRowActiveForSession({ id: "a1", is_active: true, revoked_at: null })
  );
  record(
    "staff access inactive when is_active false",
    !isStaffAccessRowActiveForSession({ id: "a1", is_active: false, revoked_at: null })
  );
  record(
    "staff access inactive when revoked",
    !isStaffAccessRowActiveForSession({ id: "a1", is_active: true, revoked_at: "2026-05-31T10:00:00.000Z" })
  );
}

function testStaffPersonaMapping() {
  record(
    "school_operator maps to school_operator persona",
    staffPersonaForStaffRole("school_operator") === "school_operator"
  );
  record(
    "school_teacher maps to school_teacher persona",
    staffPersonaForStaffRole("school_teacher") === "school_teacher"
  );
  record(
    "unknown role defaults to school_teacher persona",
    staffPersonaForStaffRole("other") === "school_teacher"
  );
}

function testStaffSessionServerWiring() {
  const src = read("lib/school-server/school-staff-session.server.js");

  record(
    "resolveStaffSession uses isStaffSessionRowActive",
    /isStaffSessionRowActive\s*\(\s*sessionRow/.test(src)
  );
  record(
    "resolveStaffSession uses isStaffAccessRowActiveForSession",
    /isStaffAccessRowActiveForSession\s*\(\s*accessRow\s*\)/.test(src)
  );
  record(
    "resolveStaffSession re-checks assertActivePersonaEntitlement",
    /assertActivePersonaEntitlement[\s\S]*staffPersonaForStaffRole/.test(src)
  );
  record(
    "invalid staff session returns 401 not_authenticated",
    /return\s*\{\s*ok:\s*false,\s*status:\s*401,\s*code:\s*["']not_authenticated["']/.test(src)
  );
  record(
    "STAFF_SESSION_COOKIE is liosh_staff_session",
    /STAFF_SESSION_COOKIE\s*=\s*["']liosh_staff_session["']/.test(src)
  );
  record(
    "staff cookie is HttpOnly + SameSite=Strict",
    /HttpOnly/.test(src) && /SameSite=Strict/.test(src)
  );
  record(
    "issueStaffSession revokes prior access sessions first",
    /issueStaffSession[\s\S]*revokeLiveStaffSessionsForAccess/.test(src)
  );
  record(
    "staffLogout sets revoked_at on matching token hash",
    /staffLogout[\s\S]*revoked_at:\s*now[\s\S]*session_token_hash/.test(src)
  );
  record(
    "clearStaffSessionCookie sets Max-Age=0",
    /clearStaffSessionCookie[\s\S]*Max-Age=0/.test(src)
  );

  assert.match(src, /export async function revokeLiveStaffSessionsForAccess/);
  assert.match(src, /export async function revokeLiveStaffSessionsForUser/);
}

function testStaffManagementSessionInvalidation() {
  const src = read("lib/school-server/school-staff-management.server.js");

  record(
    "PIN reset revokes live staff sessions for access",
    /resetSchoolStaffPin[\s\S]*revokeLiveStaffSessionsForAccess/.test(src)
  );
  record(
    "suspend revokes live staff sessions for user",
    /suspendSchoolStaffAccess[\s\S]*revokeLiveStaffSessionsForUser/.test(src)
  );
  record(
    "suspend deactivates access code and suspends entitlement",
    /suspendSchoolStaffAccess[\s\S]*is_active:\s*false/.test(src) &&
      /suspendSchoolStaffAccess[\s\S]*status:\s*["']suspended["']/.test(src)
  );
  record(
    "code regenerate revokes sessions for old access",
    /regenerateSchoolStaffCode[\s\S]*revokeLiveStaffSessionsForAccess/.test(src)
  );
  record(
    "code regenerate revokes old access row",
    /regenerateSchoolStaffCode[\s\S]*revoked_at:\s*now/.test(src)
  );
}

function testStaffLoginAndChangePin() {
  const login = read("lib/school-server/school-staff-login.server.js");
  const changePinRoute = read("pages/api/school/staff/change-pin.js");
  const changePin = read("lib/school-server/school-staff-change-pin.server.js");

  record(
    "failed staff login writes staff_login_failed audit",
    /staff_login_failed/.test(login)
  );
  record(
    "failed staff login records access attempt",
    /invalid_credentials[\s\S]*recordStaffAccessAttempt/.test(login)
  );
  record(
    "successful login issues staff session",
    /staffLogin[\s\S]*issueStaffSession/.test(login)
  );
  record(
    "change-pin route requires staff session cookie",
    /getStaffSessionCookie[\s\S]*resolveStaffSession/.test(changePinRoute)
  );
  record(
    "change-pin uses session userId not request body userId",
    /userId:\s*session\.userId/.test(changePinRoute) &&
      !/body\.userId/.test(changePinRoute)
  );
  record(
    "change-pin binds access row to session user and school",
    /\.eq\(\s*["']user_id["'],\s*input\.userId\s*\)[\s\S]*\.eq\(\s*["']school_id["'],\s*input\.schoolId\s*\)/.test(
        changePin
      )
  );
}

function testStaffSessionSensitiveRoutesNoStore() {
  for (const rel of ["pages/api/school/me.js", "pages/api/school/staff/logout.js"]) {
    const src = read(rel);
    const ok =
      /setSensitiveReportNoStoreHeaders\s*\(\s*res\s*\)/.test(src) &&
      src.indexOf("setSensitiveReportNoStoreHeaders") < src.lastIndexOf(".json(");
    record(`${rel} sets no-store before JSON`, ok);
    assert.equal(ok, true);
  }
}

function testOperatorGrantMatrixGuards() {
  const request = read("lib/school-server/school-request.server.js");
  const persona = read("lib/auth/persona-guard.server.js");

  record(
    "credential admin requires student_access_admin grant for operators",
    /requireSchoolCredentialAdminContext[\s\S]*requireGrant:\s*["']student_access_admin["']/.test(request)
  );
  record(
    "data viewer requires student_data_viewer grant for operators",
    /requireSchoolDataViewerContext[\s\S]*requireGrant:\s*["']student_data_viewer["']/.test(request)
  );
  record(
    "operator grant required returns 403 operator_grant_required",
    /operator_grant_required/.test(persona)
  );
  const portalMeFn = request.match(
    /export async function requireSchoolPortalMeContext[\s\S]*?(?=export async function|$)/
  )?.[0] || "";
  record(
    "portal me allows operator without requireGrant",
    /portalRole:\s*["']school_operator["']/.test(portalMeFn) &&
      !/requireGrant/.test(portalMeFn)
  );
  const grantsRoute = read("pages/api/school/operators/[operatorId]/grants.js");
  record(
    "operator grants PATCH is manager-only",
    /requireSchoolManagerApiContext/.test(grantsRoute) &&
      !/requireSchoolOperatorApiContext/.test(grantsRoute)
  );

  const credentialRoutes = [
    "pages/api/school/students/[studentId]/accounts/student/block.js",
    "pages/api/school/students/[studentId]/accounts/student/reset-pin.js",
  ];
  for (const rel of credentialRoutes) {
    const src = read(rel);
    record(`${rel} uses requireSchoolCredentialAdminApiContext`, /requireSchoolCredentialAdminApiContext/.test(src));
  }

  const reportRoute = read("pages/api/school/students/[studentId]/report-data.js");
  record(
    "student report uses requireSchoolDataViewerContext",
    /requireSchoolDataViewerContext/.test(reportRoute)
  );

  const managerRoute = read("pages/api/school/dashboard.js");
  record(
    "dashboard is manager-only",
    /requireSchoolManagerApiContext/.test(managerRoute) &&
      !/requireSchoolOperatorApiContext/.test(managerRoute)
  );
}

function testStudentCredentialSessionRegression() {
  const acct = read("lib/school-server/school-account-management.server.js");
  const studentAuth = read("lib/learning-supabase/student-auth.js");
  const login = read("pages/api/student/login.js");

  record(
    "block ends live student sessions when blocked",
    /setSchoolStudentBlocked[\s\S]*if\s*\(\s*blocked\s*\)[\s\S]*endLiveStudentSessions/.test(acct)
  );
  record(
    "revoke ends live student sessions",
    /revokeSchoolStudentAccess[\s\S]*endLiveStudentSessions/.test(acct)
  );
  record(
    "rotate PIN ends live student sessions",
    /rotateSchoolStudentPin[\s\S]*endLiveStudentSessions/.test(acct)
  );
  record(
    "student login inserts access_code_id on new session",
    /student_sessions[\s\S]*access_code_id:\s*accessCode\.id/.test(login)
  );
  record(
    "null access_code_id fails closed in getAuthenticatedStudentSession",
    /if\s*\(\s*!sessionRow\.access_code_id\s*\)[\s\S]*return null/.test(studentAuth)
  );
}

function testStaffCookieUsedByTeacherAuthPath() {
  const teacherSession = read("lib/teacher-server/teacher-session.server.js");
  record(
    "resolveAuthenticatedTeacherUserId accepts staff cookie via resolveAuthenticatedStaffFromRequest",
    /resolveAuthenticatedStaffFromRequest/.test(teacherSession) && /authMethod:\s*["']staff_cookie["']/.test(teacherSession)
  );
  record(
    "must-change-pin gate blocks staff cookie routes except exempt",
    /mustChangePin[\s\S]*isStaffPinChangeExemptRequest/.test(teacherSession)
  );
}

function testSharedDeviceCacheReview() {
  const staffSession = read("lib/school-server/school-staff-session.server.js");
  const studentAuth = read("lib/learning-supabase/student-auth.js");

  record(
    "staff session cookie is not accessible to JS (HttpOnly)",
    /setStaffSessionCookie[\s\S]*HttpOnly/.test(staffSession)
  );
  record(
    "school/me response is no-store (shared device cache risk mitigated)",
    /setSensitiveReportNoStoreHeaders/.test(read("pages/api/school/me.js"))
  );
  record(
    "staff logout response is no-store",
    /setSensitiveReportNoStoreHeaders/.test(read("pages/api/school/staff/logout.js"))
  );
  record(
    "student session validation module exists for access_code binding",
    fs.existsSync(path.join(ROOT, "lib/learning-supabase/student-session-access-code.server.js"))
  );
}

function main() {
  console.log("=== Phase 4.3 credential/session selftest ===\n");

  testStaffSessionRowActivePure();
  testStaffAccessRowActivePure();
  testStaffPersonaMapping();
  testStaffSessionServerWiring();
  testStaffManagementSessionInvalidation();
  testStaffLoginAndChangePin();
  testStaffSessionSensitiveRoutesNoStore();
  testOperatorGrantMatrixGuards();
  testStudentCredentialSessionRegression();
  testStaffCookieUsedByTeacherAuthPath();
  testSharedDeviceCacheReview();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.error("\nFailed checks:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
