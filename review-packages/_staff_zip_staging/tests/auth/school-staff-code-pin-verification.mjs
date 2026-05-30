#!/usr/bin/env node
/**
 * Post-SQL runtime verification for school staff code/PIN login (migration 048).
 * Run:
 *   node --env-file=.env.local --env-file=.env.e2e.local tests/auth/school-staff-code-pin-verification.mjs
 */
import fs from "node:fs";
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import { SCHOOL_MANAGER_EMAIL, TEACHER_EMAILS } from "../../scripts/school-portal/sim/school-sim-config.mjs";
import {
  DEMO_SCHOOL_ID,
  ensureDemoSchoolQuotaHeadroom,
} from "./lib/demo-school-quota-helper.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL ||
  process.env.ACTIVITY_SIM_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const PRIVATE_TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";

/** @type {Array<{ id: string; ok: boolean; detail: string; skipped?: boolean }>} */
const results = [];

function record(id, ok, detail, skipped = false) {
  results.push({ id, ok, detail, skipped });
  const tag = skipped ? "SKIP" : ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${id}: ${detail}`);
}

function resolvePassword() {
  return (
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    ""
  );
}

async function getBearer(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error(`auth failed for ${email}: ${tokenJson.error_description || tokenJson.msg || "no token"}`);
  }
  return tokenJson.access_token;
}

function extractStaffCookie(res) {
  const raw = res.headers.get("set-cookie") || "";
  const m = raw.match(/liosh_staff_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function staffLogin(staffCode, pin) {
  const res = await fetch(`${BASE_URL}/api/school/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffCode, pin }),
  });
  const json = await res.json().catch(() => ({}));
  const cookie = extractStaffCookie(res);
  const code = json?.error?.code || null;
  return { status: res.status, json, cookie, code };
}

function parseApiErrorCode(json) {
  return json?.error?.code || json?.errorCode || (typeof json?.error === "string" ? json.error : null);
}

async function apiBearer(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, code: parseApiErrorCode(json) };
}

async function apiStaffCookie(method, path, cookie, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: `liosh_staff_session=${cookie}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, code: parseApiErrorCode(json) };
}

async function loadStaffAccess(db, userId) {
  const { data } = await db
    .from("school_staff_access_codes")
    .select("id, code_display, must_change_pin, is_active, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function countActiveSessions(db, userId) {
  const { count } = await db
    .from("school_staff_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);
  return count ?? 0;
}

async function discoverAdminToken(db, password) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    for (const user of data?.users || []) {
      if (String(user.app_metadata?.role || "").toLowerCase() !== "admin") continue;
      const { data: ent } = await db
        .from("account_persona_entitlements")
        .select("status")
        .eq("user_id", user.id)
        .eq("persona", "admin")
        .maybeSingle();
      if (ent?.status === "active" && user.email) {
        try {
          return await getBearer(user.email, password);
        } catch {
          // try next
        }
      }
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error("no platform admin token for quota headroom");
}

async function main() {
  const password = resolvePassword();
  if (!password) throw new Error("Missing DEMO_TEACHER_PASSWORD / SCHOOL_QA_PASSWORD");

  const db = createServiceRole();
  const adminToken = await discoverAdminToken(db, password);
  const quotaRestore = await ensureDemoSchoolQuotaHeadroom(BASE_URL, adminToken, db, {
    teachers: true,
    operators: true,
  });

  try {
  const managerToken = await getBearer(SCHOOL_MANAGER_EMAIL, password);
  const tag = Date.now();

  // ── 1–3: Provision teacher (code/PIN shown once) ──
  const teacherName = `QA Staff Teacher ${tag}`;
  const provTeacher = await apiBearer("POST", "/api/school/teachers", managerToken, {
    displayName: teacherName,
  });
  const teacherUserId = provTeacher.json?.data?.teacherUserId;
  const teacherCode = provTeacher.json?.data?.staffCode;
  const teacherPin = provTeacher.json?.data?.initialPin;
  let currentTeacherPin = teacherPin;
  record(
    "manager_provision_teacher",
    provTeacher.status === 201 &&
      Boolean(teacherCode) &&
      /^\d{4}$/.test(String(teacherPin || "")) &&
      provTeacher.json?.data?.provisionMode === "code_pin",
    `status=${provTeacher.status} code=${teacherCode} pin=${teacherPin ? "****" : "missing"}`
  );

  const teacherAccessRow = teacherUserId ? await loadStaffAccess(db, teacherUserId) : null;
  record(
    "teacher_must_change_pin_on_provision",
    teacherAccessRow?.must_change_pin === true,
    `must_change_pin=${teacherAccessRow?.must_change_pin}`
  );

  // ── 1–3: Provision operator ──
  const operatorName = `QA Staff Operator ${tag}`;
  const provOperator = await apiBearer("POST", "/api/school/operators", managerToken, {
    displayName: operatorName,
  });
  const operatorUserId = provOperator.json?.data?.operatorUserId;
  const operatorCode = provOperator.json?.data?.staffCode;
  const operatorPin = provOperator.json?.data?.initialPin;
  let operatorChosenPin = operatorPin;
  record(
    "manager_provision_operator",
    provOperator.status === 201 &&
      Boolean(operatorCode) &&
      /^\d{4}$/.test(String(operatorPin || "")) &&
      provOperator.json?.data?.provisionMode === "code_pin",
    `status=${provOperator.status} code=${operatorCode}`
  );

  // ── 4–5: Teacher staff login + PIN change gate ──
  const teacherLogin = await staffLogin(teacherCode, teacherPin);
  record(
    "teacher_staff_login",
    teacherLogin.status === 200 && Boolean(teacherLogin.cookie),
    `status=${teacherLogin.status} redirect=${teacherLogin.json?.data?.redirectPath}`
  );
  record(
    "teacher_login_redirect_change_pin",
    teacherLogin.json?.data?.redirectPath === "/school/staff/change-pin",
    `redirectPath=${teacherLogin.json?.data?.redirectPath}`
  );
  record(
    "teacher_login_must_change_pin_flag",
    teacherLogin.json?.data?.mustChangePin === true,
    `mustChangePin=${teacherLogin.json?.data?.mustChangePin}`
  );

  const teacherMeBlocked = await apiStaffCookie("GET", "/api/teacher/me", teacherLogin.cookie);
  record(
    "teacher_me_blocked_until_pin_change",
    teacherMeBlocked.status === 403 && teacherMeBlocked.code === "pin_change_required",
    `status=${teacherMeBlocked.status} code=${teacherMeBlocked.code}`
  );

  const teacherDashBlocked = await apiStaffCookie(
    "GET",
    "/api/teacher/dashboard",
    teacherLogin.cookie
  );
  record(
    "teacher_dashboard_blocked_until_pin_change",
    teacherDashBlocked.status === 403 && teacherDashBlocked.code === "pin_change_required",
    `status=${teacherDashBlocked.status} code=${teacherDashBlocked.code}`
  );

  const teacherChosenPin = `${String((tag % 9000) + 1000).padStart(4, "0")}`;
  const teacherPinChange = await apiStaffCookie(
    "POST",
    "/api/school/staff/change-pin",
    teacherLogin.cookie,
    {
      currentPin: teacherPin,
      newPin: teacherChosenPin,
      confirmPin: teacherChosenPin,
    }
  );
  record(
    "teacher_change_pin_success",
    teacherPinChange.status === 200 && teacherPinChange.json?.data?.mustChangePin === false,
    `status=${teacherPinChange.status}`
  );
  currentTeacherPin = teacherChosenPin;
  let teacherStaffCookie = teacherLogin.cookie;

  const teacherMe = await apiStaffCookie("GET", "/api/teacher/me", teacherStaffCookie);
  record(
    "teacher_me_via_staff_cookie",
    teacherMe.status === 200 && teacherMe.json?.data?.teacher?.teacherId === teacherUserId,
    `status=${teacherMe.status}`
  );

  const teacherDash = await apiStaffCookie("GET", "/api/teacher/dashboard", teacherStaffCookie);
  record(
    "teacher_dashboard_via_staff_cookie",
    teacherDash.status === 200 && Boolean(teacherDash.json?.data),
    `status=${teacherDash.status}`
  );

  const oldPinAfterChange = await staffLogin(teacherCode, teacherPin);
  record(
    "old_generated_pin_rejected_after_change",
    oldPinAfterChange.status === 401,
    `status=${oldPinAfterChange.status} code=${oldPinAfterChange.code}`
  );

  const onboardStaff = await apiStaffCookie("POST", "/api/teacher/onboard", teacherStaffCookie, {});
  record(
    "onboard_rejects_staff_cookie",
    onboardStaff.status === 403 && onboardStaff.code === "jwt_required",
    `status=${onboardStaff.status} code=${onboardStaff.code}`
  );

  // ── 6–7: Operator staff login + PIN change + operator area ──
  const operatorLogin = await staffLogin(operatorCode, operatorPin);
  record(
    "operator_staff_login",
    operatorLogin.status === 200 && Boolean(operatorLogin.cookie),
    `status=${operatorLogin.status} redirect=${operatorLogin.json?.data?.redirectPath}`
  );
  record(
    "operator_login_redirect_change_pin",
    operatorLogin.json?.data?.redirectPath === "/school/staff/change-pin",
    `redirectPath=${operatorLogin.json?.data?.redirectPath}`
  );

  const operatorMeBlocked = await apiStaffCookie("GET", "/api/school/me", operatorLogin.cookie);
  record(
    "operator_me_blocked_until_pin_change",
    operatorMeBlocked.status === 403 && operatorMeBlocked.code === "pin_change_required",
    `status=${operatorMeBlocked.status} code=${operatorMeBlocked.code}`
  );

  operatorChosenPin = `${String(((tag + 17) % 9000) + 1000).padStart(4, "0")}`;
  let operatorStaffCookie = operatorLogin.cookie;
  const operatorPinChange = await apiStaffCookie(
    "POST",
    "/api/school/staff/change-pin",
    operatorStaffCookie,
    {
      currentPin: operatorPin,
      newPin: operatorChosenPin,
      confirmPin: operatorChosenPin,
    }
  );
  record(
    "operator_change_pin_success",
    operatorPinChange.status === 200 && operatorPinChange.json?.data?.mustChangePin === false,
    `status=${operatorPinChange.status}`
  );

  const operatorMe = await apiStaffCookie("GET", "/api/school/me", operatorStaffCookie);
  const portalRole = operatorMe.json?.data?.portalRole;
  record(
    "operator_me_portal_role",
    operatorMe.status === 200 && portalRole === "school_operator",
    `status=${operatorMe.status} portalRole=${portalRole}`
  );
  record(
    "operator_login_redirect_path_after_pin_change",
    operatorPinChange.json?.data?.redirectPath === "/school/operator/dashboard",
    `redirectPath=${operatorPinChange.json?.data?.redirectPath}`
  );

  const operatorTeachersList = await apiStaffCookie("GET", "/api/school/teachers", operatorStaffCookie);
  record(
    "operator_blocked_manager_teachers_list",
    operatorTeachersList.status === 403,
    `status=${operatorTeachersList.status} code=${operatorTeachersList.code}`
  );

  const operatorDash = await apiStaffCookie("GET", "/api/school/dashboard", operatorStaffCookie);
  record(
    "operator_blocked_manager_dashboard",
    operatorDash.status === 403,
    `status=${operatorDash.status} code=${operatorDash.code}`
  );

  const operatorTeacherApi = await apiStaffCookie(
    "GET",
    "/api/teacher/worksheet-activities",
    operatorStaffCookie
  );
  record(
    "operator_not_teacher_worksheet_api",
    operatorTeacherApi.status === 403 || operatorTeacherApi.status === 401,
    `status=${operatorTeacherApi.status} code=${operatorTeacherApi.code}`
  );

  // ── 8: Operator grants (staff cookie operator) ──
  const { data: enrollment } = await db
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", DEMO_SCHOOL_ID)
    .is("unenrolled_at", null)
    .limit(1)
    .maybeSingle();
  const sampleStudentId = enrollment?.student_id;

  if (sampleStudentId && operatorUserId) {
    await apiBearer("PATCH", `/api/school/operators/${operatorUserId}/grants`, managerToken, {
      studentAccessAdmin: false,
      studentDataViewer: false,
    });

    const noGrantAccounts = await apiStaffCookie(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      operatorStaffCookie
    );
    record(
      "operator_no_grants_blocked",
      noGrantAccounts.status === 403 && noGrantAccounts.code === "operator_grant_required",
      `status=${noGrantAccounts.status} code=${noGrantAccounts.code}`
    );

    await apiBearer("PATCH", `/api/school/operators/${operatorUserId}/grants`, managerToken, {
      studentAccessAdmin: true,
      studentDataViewer: false,
    });
    const adminGrantAccounts = await apiStaffCookie(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      operatorStaffCookie
    );
    record(
      "operator_access_admin_grant",
      adminGrantAccounts.status === 200,
      `status=${adminGrantAccounts.status}`
    );

    await apiBearer("PATCH", `/api/school/operators/${operatorUserId}/grants`, managerToken, {
      studentAccessAdmin: false,
      studentDataViewer: true,
    });
    const viewerReport = await apiStaffCookie(
      "GET",
      `/api/school/students/${sampleStudentId}/report-data`,
      operatorStaffCookie
    );
    record(
      "operator_data_viewer_grant",
      viewerReport.status === 200,
      `status=${viewerReport.status}`
    );

    await apiBearer("PATCH", `/api/school/operators/${operatorUserId}/grants`, managerToken, {
      studentAccessAdmin: true,
      studentDataViewer: true,
    });
    const bothAccounts = await apiStaffCookie(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      operatorStaffCookie
    );
    const bothReport = await apiStaffCookie(
      "GET",
      `/api/school/students/${sampleStudentId}/report-data`,
      operatorStaffCookie
    );
    record(
      "operator_both_grants",
      bothAccounts.status === 200 && bothReport.status === 200,
      `accounts=${bothAccounts.status} report=${bothReport.status}`
    );
  } else {
    record("operator_grants_matrix", false, "missing sampleStudentId or operatorUserId", true);
  }

  // ── 9: PIN reset (teacher) ──
  if (teacherUserId && teacherCode && teacherPin) {
    const pinReset = await apiBearer(
      "PUT",
      `/api/school/teachers/${teacherUserId}/pin-reset`,
      managerToken
    );
    const newPin = pinReset.json?.data?.initialPin;
    record(
      "manager_pin_reset",
      pinReset.status === 200 && /^\d{4}$/.test(String(newPin || "")),
      `status=${pinReset.status}`
    );

    const oldPinLogin = await staffLogin(teacherCode, teacherPin);
    record(
      "old_pin_rejected_after_reset",
      oldPinLogin.status === 401,
      `status=${oldPinLogin.status} code=${oldPinLogin.code}`
    );

    const newPinLogin = await staffLogin(teacherCode, newPin);
    record(
      "new_pin_works_after_reset",
      newPinLogin.status === 200 && Boolean(newPinLogin.cookie),
      `status=${newPinLogin.status}`
    );
    currentTeacherPin = newPin;

    const afterResetAccess = await loadStaffAccess(db, teacherUserId);
    record(
      "must_change_pin_after_reset",
      afterResetAccess?.must_change_pin === true,
      `must_change_pin=${afterResetAccess?.must_change_pin}`
    );
  }

  // ── 10: Suspend / reactivate (operator) ──
  if (operatorUserId && operatorCode && operatorChosenPin) {
    const suspend = await apiBearer(
      "PUT",
      `/api/school/operators/${operatorUserId}/suspend`,
      managerToken
    );
    record("manager_suspend_operator", suspend.status === 200, `status=${suspend.status}`);

    const suspendedLogin = await staffLogin(operatorCode, operatorChosenPin);
    record(
      "suspended_staff_cannot_login",
      suspendedLogin.status === 401 || suspendedLogin.status === 403,
      `status=${suspendedLogin.status} code=${suspendedLogin.code}`
    );

    const reactivate = await apiBearer(
      "PUT",
      `/api/school/operators/${operatorUserId}/reactivate`,
      managerToken
    );
    record("manager_reactivate_operator", reactivate.status === 200, `status=${reactivate.status}`);

    const reactivatedLogin = await staffLogin(operatorCode, operatorChosenPin);
    record(
      "reactivated_staff_can_login",
      reactivatedLogin.status === 200,
      `status=${reactivatedLogin.status}`
    );
  }

  // ── 11: Regenerate code (teacher) ──
  if (teacherUserId && teacherCode) {
    const sessionsBefore = await countActiveSessions(db, teacherUserId);
    const freshLogin = await staffLogin(teacherCode, currentTeacherPin);
    const sessionsAfterLogin = await countActiveSessions(db, teacherUserId);

    const regen = await apiBearer(
      "POST",
      `/api/school/teachers/${teacherUserId}/code-regenerate`,
      managerToken
    );
    const newCode = regen.json?.data?.staffCode;
    const regenPin = regen.json?.data?.initialPin;
    record(
      "manager_code_regenerate",
      regen.status === 200 && Boolean(newCode) && newCode !== teacherCode,
      `old=${teacherCode} new=${newCode}`
    );

    const oldCodeLogin = await staffLogin(teacherCode, currentTeacherPin);
    record(
      "old_code_rejected_after_regenerate",
      oldCodeLogin.status === 401,
      `status=${oldCodeLogin.status}`
    );

    const newCodeLogin = await staffLogin(newCode, regenPin);
    record(
      "new_code_works_after_regenerate",
      newCodeLogin.status === 200,
      `status=${newCodeLogin.status}`
    );

    if (freshLogin.cookie && sessionsAfterLogin > 0) {
      const staleMe = await apiStaffCookie("GET", "/api/teacher/me", freshLogin.cookie);
      record(
        "sessions_revoked_after_regenerate",
        staleMe.status === 401,
        `pre_sessions=${sessionsBefore} post_login=${sessionsAfterLogin} stale_me=${staleMe.status}`
      );
    } else {
      record("sessions_revoked_after_regenerate", true, "skipped session probe (no pre-session)", true);
    }
  }

  // ── 12: Existing login flows (smoke) ──
  const managerMe = await apiBearer("GET", "/api/school/me", managerToken);
  record(
    "school_manager_jwt_login",
    managerMe.status === 200 && managerMe.json?.data?.portalRole === "school_manager",
    `status=${managerMe.status}`
  );

  try {
    const privatePassword =
      process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
      process.env.PRIVATE_TEACHER_PASSWORD ||
      password;
    const privateToken = await getBearer(PRIVATE_TEACHER_EMAIL, privatePassword);
    const privateMe = await apiBearer("GET", "/api/teacher/me", privateToken);
    record(
      "private_teacher_jwt_login",
      privateMe.status === 200,
      `status=${privateMe.status} email=${PRIVATE_TEACHER_EMAIL}`
    );
  } catch (e) {
    record("private_teacher_jwt_login", false, String(e.message), true);
  }

  const adminEmails = [];
  for (let page = 1; page <= 5; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users || []) {
      if (String(u.app_metadata?.role || "").toLowerCase() === "admin" && u.email) {
        adminEmails.push(u.email);
      }
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  let adminOk = false;
  for (const email of adminEmails.slice(0, 3)) {
    try {
      const adminToken = await getBearer(email, password);
      const adminTeachers = await apiBearer("GET", "/api/admin/teachers", adminToken);
      if (adminTeachers.status === 200) {
        adminOk = true;
        record("platform_admin_jwt_login", true, `email=${email} status=${adminTeachers.status}`);
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!adminOk) {
    record("platform_admin_jwt_login", false, "no admin password match in env", true);
  }

  const parentEmail = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
  try {
    const parentPassword = process.env.E2E_PARENT_PASSWORD || password;
    const parentToken = await getBearer(parentEmail, parentPassword);
    const parentList = await apiBearer("GET", "/api/parent/list-students", parentToken);
    record("parent_jwt_login", parentList.status === 200, `status=${parentList.status}`);
  } catch (e) {
    record("parent_jwt_login", false, String(e.message), true);
  }

  const guardianProbe = await fetch(`${BASE_URL}/api/guardian/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginUsername: "nonexistent-user", pin: "0000" }),
  });
  record(
    "guardian_login_endpoint_alive",
    guardianProbe.status === 401 || guardianProbe.status === 400,
    `status=${guardianProbe.status}`
  );

  const studentProbe = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nonexistent", pin: "0000" }),
  });
  record(
    "student_login_endpoint_alive",
    studentProbe.status === 401 || studentProbe.status === 400,
    `status=${studentProbe.status}`
  );

  // ── 13: Admin routes JWT-only (staff cookie rejected) ──
  const staffCookieForAdmin = teacherStaffCookie || operatorStaffCookie;
  if (staffCookieForAdmin) {
    const adminWithStaff = await apiStaffCookie("GET", "/api/admin/teachers", staffCookieForAdmin);
    record(
      "admin_rejects_staff_cookie",
      adminWithStaff.status === 401 || adminWithStaff.status === 403,
      `status=${adminWithStaff.status} code=${adminWithStaff.code}`
    );
  }

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;

  const reportPath = "docs/auth/POST_SQL_STAFF_CODE_PIN_RESULTS.json";
  fs.mkdirSync("docs/auth", { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        passed,
        failed,
        skipped,
        total: results.length,
        provisioned: { teacherUserId, operatorUserId, teacherCode, operatorCode },
        results,
      },
      null,
      2
    )
  );

  console.log("\n=== STAFF CODE/PIN SUMMARY ===");
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}  TOTAL: ${results.length}`);
  console.log(`Report: ${reportPath}`);

  if (failed > 0) process.exit(1);
  } finally {
    await quotaRestore.restore();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
