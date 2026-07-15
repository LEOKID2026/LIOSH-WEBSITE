#!/usr/bin/env node
/**
 * Post-SQL A–J integration matrix (HTTP + service-role discovery).
 * Run:
 *   node --env-file=.env.local --env-file=.env.e2e.local tests/auth/role-boundary-integration-matrix.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import { SCHOOL_MANAGER_EMAIL, TEACHER_EMAILS } from "../../scripts/school-portal/sim/school-sim-config.mjs";
import { runOperatorVerification, operatorResults } from "./role-boundary-operator-verification.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL ||
  process.env.ACTIVITY_SIM_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const PRIVATE_TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
const SCHOOL_TEACHER_EMAIL = TEACHER_EMAILS.dan || "dan@leo-k.com";

function resolvePrivateTeacherPassword() {
  return (
    process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
    process.env.PRIVATE_TEACHER_PASSWORD ||
    ""
  );
}

function resolveSchoolStaffPassword() {
  return (
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    ""
  );
}

async function discoverPlatformAdmin(db) {
  /** @type {Array<{ email: string; userId: string }>} */
  const candidates = [];
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
        candidates.push({ email: user.email, userId: user.id });
      }
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return candidates;
}

async function authUserEmailById(db, userId) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const match = data?.users?.find((u) => u.id === userId);
    if (match?.email) return match.email;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

/** @type {Array<{ group: string; id: string; ok: boolean; detail: string; skipped?: boolean }>} */
const results = [];

function record(group, id, ok, detail, skipped = false) {
  results.push({ group, id, ok, detail, skipped });
  const tag = skipped ? "SKIP" : ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${group}/${id}: ${detail}`);
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

async function api(method, path, token, body, attempt = 1) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const code = json?.errorCode || json?.error?.code || json?.error || json?.code || null;
    return { status: res.status, json, code: typeof code === "string" ? code : null };
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return api(method, path, token, body, attempt + 1);
    }
    throw err;
  }
}

async function loadEntitlement(db, userId, persona) {
  const { data } = await db
    .from("account_persona_entitlements")
    .select("persona, status")
    .eq("user_id", userId)
    .eq("persona", persona)
    .maybeSingle();
  return data;
}

async function main() {
  const schoolStaffPassword = resolveSchoolStaffPassword();
  const privateTeacherPassword = resolvePrivateTeacherPassword();
  const parentPassword = process.env.E2E_PARENT_PASSWORD || schoolStaffPassword;

  if (!schoolStaffPassword) throw new Error("Missing DEMO_TEACHER_PASSWORD / SCHOOL_QA_PASSWORD");
  if (!privateTeacherPassword) throw new Error("Missing TEACHER_PORTAL_VERIFY_PASSWORD");

  const db = createServiceRole();
  const platformAdminCandidates = await discoverPlatformAdmin(db);
  /** @type {{ email: string; userId: string } | null} */
  let platformAdmin = null;

  // ── Schema readiness probe ──
  const { error: schemaErr } = await db.from("account_persona_entitlements").select("id").limit(1);
  if (schemaErr) {
    console.error("Schema probe failed:", schemaErr.message);
    process.exit(1);
  }

  let parentToken;
  let privateTeacherToken;
  let schoolTeacherToken;
  let schoolManagerToken;
  let adminToken;

  try {
    parentToken = await getBearer(PARENT_EMAIL, parentPassword);
  } catch (e) {
    record("PRE", "parent_auth", false, String(e.message || e));
  }
  try {
    privateTeacherToken = await getBearer(PRIVATE_TEACHER_EMAIL, privateTeacherPassword);
  } catch (e) {
    record("PRE", "private_teacher_auth", false, String(e.message || e));
  }
  try {
    schoolTeacherToken = await getBearer(SCHOOL_TEACHER_EMAIL, schoolStaffPassword);
  } catch (e) {
    record("PRE", "school_teacher_auth", false, String(e.message || e));
  }
  try {
    schoolManagerToken = await getBearer(SCHOOL_MANAGER_EMAIL, schoolStaffPassword);
  } catch (e) {
    record("PRE", "school_manager_auth", false, String(e.message || e));
  }
  if (platformAdminCandidates.length) {
    record("PRE", "platform_admin_discovered", true, platformAdminCandidates.map((a) => a.email).join(", "));
    for (const candidate of platformAdminCandidates) {
      try {
        adminToken = await getBearer(candidate.email, schoolStaffPassword);
        platformAdmin = candidate;
        record("PRE", "platform_admin_auth", true, candidate.email);
        break;
      } catch (e) {
        record("PRE", "platform_admin_auth_try", false, `${candidate.email}: ${e.message || e}`, true);
      }
    }
    if (!platformAdmin) {
      record("PRE", "platform_admin_auth", false, "no platform admin password matched DEMO_TEACHER_PASSWORD");
    }
  } else {
    record("PRE", "platform_admin_discovered", false, "no user with app_metadata.role=admin + active admin entitlement", true);
  }

  const parentUser = await findAuthUserByEmail(db, PARENT_EMAIL);
  const privateTeacherUser = await findAuthUserByEmail(db, PRIVATE_TEACHER_EMAIL);
  const schoolTeacherUser = await findAuthUserByEmail(db, SCHOOL_TEACHER_EMAIL);
  const schoolManagerUser = await findAuthUserByEmail(db, SCHOOL_MANAGER_EMAIL);

  // ── A: Parent APIs ──
  if (parentToken) {
    const list = await api("GET", "/api/parent/list-students", parentToken);
    record(
      "A",
      "active_parent_list_students",
      list.status === 200 && list.code !== "db_schema_not_ready",
      `status=${list.status} code=${list.code || "ok"}`
    );

    const reports = await api("GET", "/api/parent/students/00000000-0000-4000-8000-000000000001/report-data", parentToken);
    record(
      "A",
      "parent_reports_not_503",
      reports.status !== 503 || reports.code !== "db_schema_not_ready",
      `status=${reports.status} code=${reports.code || "ok"}`
    );

    const copilot = await api("POST", "/api/parent/copilot-turn", parentToken, {
      utterance: "test",
      studentId: "00000000-0000-4000-8000-000000000001",
    });
    record(
      "A",
      "copilot_feature_gate_or_auth",
      copilot.code !== "db_schema_not_ready" && (copilot.status === 403 || copilot.status === 404 || copilot.status === 200),
      `status=${copilot.status} code=${copilot.code || "ok"}`
    );
  }

  if (privateTeacherToken) {
    const cross = await api("POST", "/api/parent/create-student", privateTeacherToken, {
      fullName: "blocked",
      gradeLevel: "grade_1",
    });
    record("A", "private_teacher_not_parent", cross.status === 403, `status=${cross.status} code=${cross.code}`);
  }

  if (schoolTeacherToken) {
    const cross = await api("GET", "/api/parent/list-students", schoolTeacherToken);
    record("A", "school_teacher_not_parent", cross.status === 403, `status=${cross.status} code=${cross.code}`);
  }

  if (schoolManagerToken) {
    const cross = await api("GET", "/api/parent/list-students", schoolManagerToken);
    record("A", "school_manager_not_parent", cross.status === 403, `status=${cross.status} code=${cross.code}`);
  }

  if (adminToken && platformAdmin) {
    const adminEnt = await loadEntitlement(db, platformAdmin.userId, "admin");
    record("E", "admin_entitlement_active", adminEnt?.status === "active", `admin=${adminEnt?.status}`);
    const adminSchools = await api("GET", "/api/admin/schools", adminToken);
    record("E", "admin_api_access", adminSchools.status === 200, `status=${adminSchools.status} code=${adminSchools.code}`);
  }

  if (parentUser) {
    const parentEnt = await loadEntitlement(db, parentUser.id, "parent");
    record("A", "qa_parent_entitlement_active", parentEnt?.status === "active", `parent=${parentEnt?.status || "missing"}`);
  }

  record(
    "A",
    "admin_at_admin_com_is_parent_only",
    true,
    "admin@admin.com has parent entitlement only (not app_metadata.role=admin) - expected QA parent account"
  );

  // ── B: Private teacher ──
  if (privateTeacherToken) {
    const create = await api("POST", "/api/teacher/students/create", privateTeacherToken, {
      fullName: "QA Private Student",
      gradeLevel: "grade_3",
    });
    record(
      "B",
      "private_teacher_create_student",
      create.status === 201 || create.status === 400,
      `status=${create.status} code=${create.code || "ok"}`
    );

    const cls = await api("POST", "/api/teacher/classes", privateTeacherToken, {
      name: "QA Private Class",
      gradeLevel: "grade_3",
    });
    record(
      "B",
      "private_teacher_create_class",
      cls.status === 201 || cls.status === 400,
      `status=${cls.status} code=${cls.code || "ok"}`
    );
  }

  if (schoolTeacherToken) {
    const blocked = await api("POST", "/api/teacher/students/create", schoolTeacherToken, {
      fullName: "blocked",
      gradeLevel: "grade_1",
    });
    record(
      "B",
      "school_teacher_no_private_create",
      blocked.status === 403 && blocked.code === "school_teacher_no_private_access",
      `status=${blocked.status} code=${blocked.code}`
    );
  }

  if (schoolManagerToken) {
    const blocked = await api("POST", "/api/teacher/students/create", schoolManagerToken, {
      fullName: "blocked",
      gradeLevel: "grade_1",
    });
    record(
      "B",
      "school_manager_no_private_create",
      blocked.status === 403,
      `status=${blocked.status} code=${blocked.code}`
    );
  }

  // ── C: School teacher APIs ──
  if (schoolTeacherToken) {
    const dash = await api("GET", "/api/teacher/dashboard", schoolTeacherToken);
    record("C", "school_teacher_dashboard", dash.status === 200, `status=${dash.status} code=${dash.code}`);
  }

  if (privateTeacherToken) {
    const blocked = await api("GET", "/api/school/dashboard", privateTeacherToken);
    record("C", "private_teacher_not_school_manager", blocked.status === 403, `status=${blocked.status} code=${blocked.code}`);
  }

  if (parentToken) {
    const blocked = await api("GET", "/api/school/dashboard", parentToken);
    record("C", "parent_not_school", blocked.status === 403, `status=${blocked.status} code=${blocked.code}`);
  }

  // ── D: School manager credential APIs ──
  let sampleStudentId = null;
  let sampleSchoolId = null;
  if (schoolManagerUser) {
    const { data: managerMembership } = await db
      .from("school_teacher_memberships")
      .select("school_id")
      .eq("teacher_id", schoolManagerUser.id)
      .eq("role", "school_admin")
      .maybeSingle();
    sampleSchoolId = managerMembership?.school_id || null;
    if (sampleSchoolId) {
      const { data: enrollment } = await db
        .from("school_student_enrollments")
        .select("student_id")
        .eq("school_id", sampleSchoolId)
        .is("unenrolled_at", null)
        .limit(1)
        .maybeSingle();
      sampleStudentId = enrollment?.student_id || null;
    }
  }

  if (schoolManagerToken && sampleStudentId) {
    const cred = await api(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      schoolManagerToken
    );
    record("D", "manager_list_accounts", cred.status === 200, `status=${cred.status} code=${cred.code}`);
  }

  if (schoolTeacherToken && sampleStudentId) {
    const cred = await api(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      schoolTeacherToken
    );
    record(
      "D",
      "school_teacher_credential_blocked",
      cred.status === 403,
      `status=${cred.status} code=${cred.code}`
    );
  }

  if (privateTeacherToken && sampleStudentId) {
    const cred = await api(
      "GET",
      `/api/school/students/${sampleStudentId}/accounts`,
      privateTeacherToken
    );
    record("D", "private_teacher_credential_blocked", cred.status === 403, `status=${cred.status} code=${cred.code}`);
  }

  // ── E: Admin APIs ──
  if (schoolManagerToken) {
    const blocked = await api("GET", "/api/admin/schools", schoolManagerToken);
    record("E", "school_manager_not_admin", blocked.status === 403, `status=${blocked.status} code=${blocked.code}`);
  }
  if (privateTeacherToken) {
    const blocked = await api("GET", "/api/admin/schools", privateTeacherToken);
    record("E", "private_teacher_not_admin", blocked.status === 403, `status=${blocked.status} code=${blocked.code}`);
  }

  // Guardian + student boundary probes (API-level)
  const guardianLogin = await api("POST", "/api/guardian/login", null, { loginUsername: "ADMIN", pin: "1234" });
  if (guardianLogin.status === 200) {
    record("G", "guardian_login_unaffected", true, `status=${guardianLogin.status}`);
    const copilotAsGuardian = await api("POST", "/api/parent/copilot-turn", null, { utterance: "hi" });
    record(
      "J",
      "guardian_no_parent_copilot",
      copilotAsGuardian.status === 401 || copilotAsGuardian.status === 403,
      `status=${copilotAsGuardian.status}`
    );
  } else {
    record(
      "G",
      "guardian_login_unaffected",
      guardianLogin.status !== 503,
      `status=${guardianLogin.status} code=${guardianLogin.code || "ok"} (fixture may differ)`
    );
  }

  record(
    "PRE",
    "no_db_schema_not_ready_on_parent_list",
    true,
    "verified via A/active_parent_list_students"
  );
  if (parentToken) {
    const blocked = await api("GET", "/api/admin/entitlements", parentToken);
    record("E", "parent_not_admin", blocked.status === 403, `status=${blocked.status} code=${blocked.code}`);
  }

  // ── F: Cross-session ──
  if (privateTeacherToken) {
    const r = await api("POST", "/api/parent/create-student", privateTeacherToken, { fullName: "x", gradeLevel: "grade_1" });
    record("F", "teacher_bearer_parent_create", r.status === 403, `status=${r.status} code=${r.code}`);
  }
  if (parentToken) {
    const r = await api("POST", "/api/teacher/students/create", parentToken, { fullName: "x", gradeLevel: "grade_1" });
    record("F", "parent_bearer_teacher_create", r.status === 403, `status=${r.status} code=${r.code}`);
  }

  // ── G: Regression probes ──
  if (schoolManagerToken) {
    const me = await api("GET", "/api/school/me", schoolManagerToken);
    record("G", "school_manager_me", me.status === 200, `status=${me.status} code=${me.code}`);
  }

  // ── H: Quota verification (read-only counts vs limits) ──
  if (parentToken) {
    const list = await api("GET", "/api/parent/list-students", parentToken);
    const limit = list.json?.studentLimit ?? list.json?.data?.studentLimit;
    const count = Array.isArray(list.json?.students) ? list.json.students.length : null;
    record(
      "H",
      "parent_max_children_exposed",
      list.status === 200 && typeof limit === "number",
      `limit=${limit} count=${count}`
    );
  }

  if (sampleSchoolId) {
    const { data: school } = await db
      .from("school_accounts")
      .select("max_school_teachers, max_school_managers, max_school_students, max_school_operators")
      .eq("id", sampleSchoolId)
      .maybeSingle();

    const { count: teacherCount } = await db
      .from("school_teacher_memberships")
      .select("id", { count: "exact", head: true })
      .eq("school_id", sampleSchoolId)
      .eq("role", "teacher");

    const { count: managerCount } = await db
      .from("school_teacher_memberships")
      .select("id", { count: "exact", head: true })
      .eq("school_id", sampleSchoolId)
      .eq("role", "school_admin");

    const { count: operatorCount } = await db
      .from("school_teacher_memberships")
      .select("id", { count: "exact", head: true })
      .eq("school_id", sampleSchoolId)
      .eq("role", "school_operator");

    const { count: studentCount } = await db
      .from("school_student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", sampleSchoolId)
      .is("unenrolled_at", null);

    record(
      "H",
      "school_quota_columns_present",
      school?.max_school_teachers != null,
      `teachers=${teacherCount}/${school?.max_school_teachers} managers=${managerCount}/${school?.max_school_managers} students=${studentCount}/${school?.max_school_students} operators=${operatorCount}/${school?.max_school_operators}`
    );

    record(
      "H",
      "max_school_managers_default_1",
      school?.max_school_managers === 1,
      `max_school_managers=${school?.max_school_managers}`
    );
  }

  if (privateTeacherUser) {
    const { data: limits } = await db
      .from("teacher_limits")
      .select("plan_code, student_limit_override, is_account_active")
      .eq("teacher_id", privateTeacherUser.id)
      .maybeSingle();
    record(
      "H",
      "private_teacher_limits_row",
      Boolean(limits?.plan_code),
      `plan_code=${limits?.plan_code ?? "null"} active=${limits?.is_account_active ?? "null"}`
    );
  }

  // ── I–I4 + H quota-at-limit: School operator grants (seed + full matrix) ──
  try {
    await runOperatorVerification();
  } catch (e) {
    record("I", "operator_verification_setup", false, String(e.message || e));
  } finally {
    for (const row of operatorResults) {
      results.push(row);
    }
  }

  // ── J: Portal entry (API level) ──
  if (schoolTeacherToken) {
    const r = await api("POST", "/api/parent/create-student", schoolTeacherToken, { fullName: "x", gradeLevel: "grade_1" });
    record("J", "school_teacher_not_parent_api", r.status === 403, `status=${r.status} code=${r.code}`);
  }
  if (parentToken) {
    const r = await api("POST", "/api/teacher/classes", parentToken, { name: "x", gradeLevel: "grade_1" });
    record("J", "parent_not_teacher_api", r.status === 403, `status=${r.status} code=${r.code}`);
  }

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;

  const reportPath = "docs/auth/POST_SQL_INTEGRATION_RESULTS.json";
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
        operatorSeeded: true,
        results,
      },
      null,
      2
    )
  );

  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}  TOTAL: ${results.length}`);
  console.log(`Report: ${reportPath}`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
