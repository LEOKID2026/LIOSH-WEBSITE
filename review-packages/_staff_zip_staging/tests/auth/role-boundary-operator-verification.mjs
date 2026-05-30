#!/usr/bin/env node
/**
 * School operator grant matrix (Groups I–I4) + safe quota-at-limit probes.
 * Run after base integration matrix:
 *   node --env-file=.env.local --env-file=.env.e2e.local tests/auth/role-boundary-operator-verification.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
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

const QA_OPERATOR_EMAIL = process.env.QA_SCHOOL_OPERATOR_EMAIL || "qa-school-operator@leo-k.com";
const PRIVATE_TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const SCHOOL_TEACHER_EMAIL = TEACHER_EMAILS.dan || "dan@leo-k.com";

/** @type {Array<{ group: string; id: string; ok: boolean; detail: string; skipped?: boolean }>} */
export const operatorResults = [];

function record(group, id, ok, detail, skipped = false) {
  operatorResults.push({ group, id, ok, detail, skipped });
  const tag = skipped ? "SKIP" : ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${group}/${id}: ${detail}`);
}

function resolveSchoolStaffPassword() {
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

async function discoverPlatformAdminEmail(db) {
  /** @type {string[]} */
  const emails = [];
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
      if (ent?.status === "active" && user.email) emails.push(user.email);
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  const preferred = emails.find((e) => e.toLowerCase() === "office@leo.com");
  return preferred || emails[0] || null;
}

async function authPlatformAdmin(db, password) {
  const emails = [];
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
      if (ent?.status === "active" && user.email) emails.push(user.email);
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  emails.sort((a, b) => {
    if (a.toLowerCase() === "office@leo.com") return -1;
    if (b.toLowerCase() === "office@leo.com") return 1;
    return a.localeCompare(b);
  });
  for (const email of emails) {
    try {
      return await getBearer(email, password);
    } catch {
      // try next admin candidate
    }
  }
  throw new Error("no platform admin password matched DEMO_TEACHER_PASSWORD");
}

async function ensureQaOperatorUser(db, password) {
  let user = await findAuthUserByEmail(db, QA_OPERATOR_EMAIL);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: QA_OPERATOR_EMAIL,
      password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { source: "qa-school-operator-verification" },
    });
    if (error) throw new Error(`createUser failed: ${error.message}`);
    user = data.user;
  } else {
    await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }
  return user.id;
}

async function countAuditLog(db, schoolId, filters = {}) {
  let q = db
    .from("school_operator_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (filters.actionType) q = q.eq("action_type", filters.actionType);
  if (filters.actorUserId) q = q.eq("actor_user_id", filters.actorUserId);
  const { count } = await q;
  return count ?? 0;
}

async function setGrants(managerToken, operatorId, patch) {
  return api("PATCH", `/api/school/operators/${operatorId}/grants`, managerToken, patch);
}

export async function runOperatorVerification() {
  const schoolStaffPassword = resolveSchoolStaffPassword();
  if (!schoolStaffPassword) throw new Error("Missing DEMO_TEACHER_PASSWORD");

  const db = createServiceRole();
  let adminToken;
  let managerToken;
  let operatorUserId;
  let quotaRestore = null;

  adminToken = await authPlatformAdmin(db, schoolStaffPassword);
  quotaRestore = await ensureDemoSchoolQuotaHeadroom(BASE_URL, adminToken, db, {
    teachers: false,
    operators: true,
  });

  try {
  managerToken = await getBearer(SCHOOL_MANAGER_EMAIL, schoolStaffPassword);
  operatorUserId = await ensureQaOperatorUser(db, schoolStaffPassword);

  // Invite operator (idempotent if already member)
  const invite = await api("POST", "/api/school/operators", managerToken, {
    operatorUserId,
    displayName: "QA School Operator",
  });
  record(
    "I",
    "manager_invite_operator",
    invite.status === 201 || invite.code === "user_already_school_staff" || invite.status === 409,
    `status=${invite.status} code=${invite.code || "ok"}`
  );

  let operatorToken;
  operatorToken = await getBearer(QA_OPERATOR_EMAIL, schoolStaffPassword);

  const { data: enrollment } = await db
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", DEMO_SCHOOL_ID)
    .is("unenrolled_at", null)
    .limit(1)
    .maybeSingle();
  const sampleStudentId = enrollment?.student_id;
  if (!sampleStudentId) throw new Error("No enrolled student in demo school");

  // Reset grants to false/false
  await setGrants(managerToken, operatorUserId, {
    studentAccessAdmin: false,
    studentDataViewer: false,
  });

  // ── I: No grants ──
  const blockedAccounts = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/accounts`,
    operatorToken
  );
  record(
    "I",
    "no_grants_credential_blocked",
    blockedAccounts.status === 403 && blockedAccounts.code === "operator_grant_required",
    `status=${blockedAccounts.status} code=${blockedAccounts.code}`
  );

  const blockedReport = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/report-data`,
    operatorToken
  );
  record(
    "I",
    "no_grants_report_blocked",
    blockedReport.status === 403 && blockedReport.code === "operator_grant_required",
    `status=${blockedReport.status} code=${blockedReport.code}`
  );

  const blockedOperatorsList = await api("GET", "/api/school/operators", operatorToken);
  record(
    "I",
    "operator_not_manager_list",
    blockedOperatorsList.status === 403,
    `status=${blockedOperatorsList.status} code=${blockedOperatorsList.code}`
  );

  // ── I2: student_access_admin only ──
  const auditBeforeAdminGrant = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "grant_student_access_admin",
  });
  const grantAdmin = await setGrants(managerToken, operatorUserId, {
    studentAccessAdmin: true,
    studentDataViewer: false,
  });
  record("I2", "grant_student_access_admin", grantAdmin.status === 200, `status=${grantAdmin.status}`);
  const auditAfterAdminGrant = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "grant_student_access_admin",
  });
  record(
    "I2",
    "grant_student_access_admin_audited",
    auditAfterAdminGrant > auditBeforeAdminGrant,
    `count ${auditBeforeAdminGrant} -> ${auditAfterAdminGrant}`
  );

  const adminAccounts = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/accounts`,
    operatorToken
  );
  record(
    "I2",
    "access_admin_list_accounts",
    adminAccounts.status === 200,
    `status=${adminAccounts.status} code=${adminAccounts.code}`
  );

  const adminReportBlocked = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/report-data`,
    operatorToken
  );
  record(
    "I2",
    "access_admin_report_still_blocked",
    adminReportBlocked.status === 403 && adminReportBlocked.code === "operator_grant_required",
    `status=${adminReportBlocked.status} code=${adminReportBlocked.code}`
  );

  const credAuditBefore = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actorUserId: operatorUserId,
    actionType: "credential_create_student",
  });
  void credAuditBefore; // reserved for future destructive credential-write probe

  // ── I3: student_data_viewer only ──
  const auditBeforeViewerGrant = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "grant_student_data_viewer",
  });
  const grantViewer = await setGrants(managerToken, operatorUserId, {
    studentAccessAdmin: false,
    studentDataViewer: true,
  });
  record("I3", "grant_student_data_viewer", grantViewer.status === 200, `status=${grantViewer.status}`);
  const auditAfterViewerGrant = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "grant_student_data_viewer",
  });
  record(
    "I3",
    "grant_student_data_viewer_audited",
    auditAfterViewerGrant > auditBeforeViewerGrant,
    `count ${auditBeforeViewerGrant} -> ${auditAfterViewerGrant}`
  );

  const viewerReport = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/report-data`,
    operatorToken
  );
  record(
    "I3",
    "data_viewer_report_allowed",
    viewerReport.status === 200,
    `status=${viewerReport.status} code=${viewerReport.code}`
  );

  const viewerCredBlocked = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/accounts`,
    operatorToken
  );
  record(
    "I3",
    "data_viewer_credential_blocked",
    viewerCredBlocked.status === 403 && viewerCredBlocked.code === "operator_grant_required",
    `status=${viewerCredBlocked.status} code=${viewerCredBlocked.code}`
  );

  // ── I4: Both grants ──
  await setGrants(managerToken, operatorUserId, {
    studentAccessAdmin: true,
    studentDataViewer: true,
  });
  const bothAccounts = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/accounts`,
    operatorToken
  );
  const bothReport = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/report-data`,
    operatorToken
  );
  record(
    "I4",
    "both_grants_accounts_and_report",
    bothAccounts.status === 200 && bothReport.status === 200,
    `accounts=${bothAccounts.status} report=${bothReport.status}`
  );

  // Revoke admin
  const auditBeforeRevokeAdmin = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "revoke_student_access_admin",
  });
  await setGrants(managerToken, operatorUserId, { studentAccessAdmin: false });
  const auditAfterRevokeAdmin = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "revoke_student_access_admin",
  });
  record(
    "I4",
    "revoke_access_admin_audited",
    auditAfterRevokeAdmin > auditBeforeRevokeAdmin,
    `count ${auditBeforeRevokeAdmin} -> ${auditAfterRevokeAdmin}`
  );
  const afterRevokeAdminCred = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/accounts`,
    operatorToken
  );
  record(
    "I4",
    "revoke_access_admin_blocks_credential",
    afterRevokeAdminCred.status === 403,
    `status=${afterRevokeAdminCred.status} code=${afterRevokeAdminCred.code}`
  );

  // Revoke viewer
  const auditBeforeRevokeViewer = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "revoke_student_data_viewer",
  });
  await setGrants(managerToken, operatorUserId, { studentDataViewer: false });
  const auditAfterRevokeViewer = await countAuditLog(db, DEMO_SCHOOL_ID, {
    actionType: "revoke_student_data_viewer",
  });
  record(
    "I4",
    "revoke_data_viewer_audited",
    auditAfterRevokeViewer > auditBeforeRevokeViewer,
    `count ${auditBeforeRevokeViewer} -> ${auditAfterRevokeViewer}`
  );
  const afterRevokeViewerReport = await api(
    "GET",
    `/api/school/students/${sampleStudentId}/report-data`,
    operatorToken
  );
  record(
    "I4",
    "revoke_data_viewer_blocks_report",
    afterRevokeViewerReport.status === 403,
    `status=${afterRevokeViewerReport.status} code=${afterRevokeViewerReport.code}`
  );

  // ── I4 security: operator forbidden actions ──
  const noClass = await api("POST", "/api/teacher/activities", operatorToken, {
    classId: crypto.randomUUID(),
    subject: "math",
    gradeLevel: "grade_3",
    title: "QA Operator Activity",
  });
  record(
    "I4",
    "operator_no_create_activity",
    noClass.status >= 400,
    `status=${noClass.status} code=${noClass.code}`
  );

  const schoolTeacherUser = await findAuthUserByEmail(db, SCHOOL_TEACHER_EMAIL);
  const noSubjectAssign = await api(
    "POST",
    `/api/school/teachers/${schoolTeacherUser?.id}/subjects`,
    operatorToken,
    { subject: "math", gradeLevel: "grade_3" }
  );
  record(
    "I4",
    "operator_no_assign_subject",
    noSubjectAssign.status === 403,
    `status=${noSubjectAssign.status} code=${noSubjectAssign.code}`
  );

  const noAdmin = await api("GET", "/api/admin/schools", operatorToken);
  record(
    "I4",
    "operator_no_admin_api",
    noAdmin.status === 403,
    `status=${noAdmin.status} code=${noAdmin.code}`
  );

  const noQuotaPatch = await api("PATCH", `/api/admin/schools/${DEMO_SCHOOL_ID}`, operatorToken, {
    maxSchoolOperators: 99,
  });
  record(
    "I4",
    "operator_no_change_quotas",
    noQuotaPatch.status === 403,
    `status=${noQuotaPatch.status} code=${noQuotaPatch.code}`
  );

  // Wrong school: pick another school if exists
  const { data: otherSchool } = await db
    .from("school_accounts")
    .select("id")
    .neq("id", DEMO_SCHOOL_ID)
    .limit(1)
    .maybeSingle();
  if (otherSchool?.id) {
    const { data: otherEnrollment } = await db
      .from("school_student_enrollments")
      .select("student_id")
      .eq("school_id", otherSchool.id)
      .is("unenrolled_at", null)
      .limit(1)
      .maybeSingle();
    if (otherEnrollment?.student_id) {
      await setGrants(managerToken, operatorUserId, { studentDataViewer: true });
      const wrongSchool = await api(
        "GET",
        `/api/school/students/${otherEnrollment.student_id}/report-data`,
        operatorToken
      );
      record(
        "I4",
        "operator_wrong_school_blocked",
        wrongSchool.status === 403,
        `status=${wrongSchool.status} code=${wrongSchool.code}`
      );
      await setGrants(managerToken, operatorUserId, { studentDataViewer: false });
    } else {
      record("I4", "operator_wrong_school_blocked", false, "no student in other school", true);
    }
  } else {
    record("I4", "operator_wrong_school_blocked", false, "only one school in DB", true);
  }

  // ── H: Quota at limit (restore after each) ──
  const schoolGet = await api("GET", `/api/admin/schools/${DEMO_SCHOOL_ID}`, adminToken);
  const school = schoolGet.json?.data?.school;
  const savedQuotas = {
    maxSchoolTeachers: school?.maxSchoolTeachers,
    maxSchoolManagers: school?.maxSchoolManagers,
    maxSchoolStudents: school?.maxSchoolStudents,
    maxSchoolOperators: school?.maxSchoolOperators,
  };

  async function restoreQuotas() {
    await api("PATCH", `/api/admin/schools/${DEMO_SCHOOL_ID}`, adminToken, savedQuotas);
  }

  const { count: operatorCount } = await db
    .from("school_teacher_memberships")
    .select("id", { count: "exact", head: true })
    .eq("school_id", DEMO_SCHOOL_ID)
    .eq("role", "school_operator");

  await api("PATCH", `/api/admin/schools/${DEMO_SCHOOL_ID}`, adminToken, {
    maxSchoolOperators: operatorCount ?? 1,
  });
  const quotaProbeEmail = `qa-operator-quota-${Date.now()}@leo-k.com`;
  const { data: quotaUserData, error: quotaUserErr } = await db.auth.admin.createUser({
    email: quotaProbeEmail,
    password: schoolStaffPassword,
    email_confirm: true,
    app_metadata: { role: "teacher" },
  });
  if (quotaUserErr) {
    record("H", "operator_quota_exceeded", false, quotaUserErr.message);
  } else {
    const quotaInvite = await api("POST", "/api/school/operators", managerToken, {
      operatorUserId: quotaUserData.user.id,
      displayName: "Quota Probe Operator",
    });
    record(
      "H",
      "operator_quota_exceeded",
      quotaInvite.status === 400 && quotaInvite.code === "school_operator_quota_exceeded",
      `status=${quotaInvite.status} code=${quotaInvite.code}`
    );
  }
  await restoreQuotas();

  const { count: teacherCount } = await db
    .from("school_teacher_memberships")
    .select("id", { count: "exact", head: true })
    .eq("school_id", DEMO_SCHOOL_ID)
    .eq("role", "teacher");

  await api("PATCH", `/api/admin/schools/${DEMO_SCHOOL_ID}`, adminToken, {
    maxSchoolTeachers: teacherCount ?? 11,
  });
  const privateTeacherUser = await findAuthUserByEmail(db, PRIVATE_TEACHER_EMAIL);
  const teacherQuota = await api(
    "POST",
    `/api/admin/schools/${DEMO_SCHOOL_ID}/assign-teacher`,
    adminToken,
    { teacherId: privateTeacherUser?.id, force: false }
  );
  record(
    "H",
    "teacher_quota_exceeded",
    teacherQuota.status === 400 && teacherQuota.code === "school_teacher_quota_exceeded",
    `status=${teacherQuota.status} code=${teacherQuota.code}`
  );
  await restoreQuotas();

  const managerQuota = await api(
    "POST",
    `/api/admin/schools/${DEMO_SCHOOL_ID}/assign-manager`,
    adminToken,
    { teacherId: schoolTeacherUser?.id }
  );
  record(
    "H",
    "manager_quota_exceeded",
    managerQuota.status === 400 && managerQuota.code === "school_manager_quota_exceeded",
    `status=${managerQuota.status} code=${managerQuota.code}`
  );

  const { count: studentCount } = await db
    .from("school_student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("school_id", DEMO_SCHOOL_ID)
    .is("unenrolled_at", null);

  const { data: enrolledRows } = await db
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", DEMO_SCHOOL_ID)
    .is("unenrolled_at", null);
  const enrolledIds = new Set((enrolledRows || []).map((r) => r.student_id));

  const { data: candidateStudents } = await db.from("students").select("id").limit(500);
  const unenrolledStudent = (candidateStudents || []).find((s) => !enrolledIds.has(s.id));

  if (unenrolledStudent?.id && studentCount != null) {
    await api("PATCH", `/api/admin/schools/${DEMO_SCHOOL_ID}`, adminToken, {
      maxSchoolStudents: studentCount,
    });
    const studentQuota = await api("POST", "/api/school/students", managerToken, {
      studentId: unenrolledStudent.id,
    });
    record(
      "H",
      "student_quota_exceeded",
      studentQuota.status === 400 && studentQuota.code === "school_student_quota_exceeded",
      `status=${studentQuota.status} code=${studentQuota.code}`
    );
    await restoreQuotas();
  } else {
    record("H", "student_quota_exceeded", false, "no unenrolled student found for probe", true);
  }

  return {
    operatorUserId,
    operatorEmail: QA_OPERATOR_EMAIL,
    sampleStudentId,
  };
  } finally {
    if (quotaRestore) await quotaRestore.restore();
  }
}

async function main() {
  await runOperatorVerification();
  const passed = operatorResults.filter((r) => r.ok && !r.skipped).length;
  const failed = operatorResults.filter((r) => !r.ok && !r.skipped).length;
  const skipped = operatorResults.filter((r) => r.skipped).length;

  const outPath = "docs/auth/POST_SQL_OPERATOR_RESULTS.json";
  fs.mkdirSync("docs/auth", { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify({ passed, failed, skipped, total: operatorResults.length, results: operatorResults }, null, 2)
  );

  console.log("\n=== OPERATOR VERIFICATION SUMMARY ===");
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}  TOTAL: ${operatorResults.length}`);
  console.log(`Report: ${outPath}`);

  if (failed > 0) process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
