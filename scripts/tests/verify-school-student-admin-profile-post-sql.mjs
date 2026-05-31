#!/usr/bin/env node
/**
 * Post-SQL 053 verification — School Student Admin Profile (live HTTP + schema).
 *
 *   node --env-file=.env.local scripts/tests/verify-school-student-admin-profile-post-sql.mjs
 *
 * Requires dev server (default http://localhost:3001). Does not commit/deploy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createServiceRole,
  findAuthUserByEmail,
} from "../school-portal/demo-school-lib.mjs";
import {
  DEMO_SCHOOL_ID,
  ensureDemoSchoolQuotaHeadroom,
} from "../../tests/auth/lib/demo-school-quota-helper.mjs";
import {
  SCHOOL_MANAGER_EMAIL,
  TEACHER_EMAILS,
  DEMO_PARENT_EMAIL,
} from "../school-portal/sim/school-sim-config.mjs";
import {
  canBrowseSchoolStudents,
  canManageStudentAccess,
  canViewStudentData,
  getOperatorGrants,
} from "../../lib/school-portal/operator-grants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const BASE_URL = (
  process.env.ADMIN_PROFILE_QA_BASE_URL ||
  process.env.SCHOOL_PORTAL_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const QA_OPERATOR_EMAIL = process.env.QA_SCHOOL_OPERATOR_EMAIL || "qa-school-operator@leo-k.com";
const SCHOOL_TEACHER_EMAIL = TEACHER_EMAILS.dan || "dan@leo-k.com";
const PRIVATE_TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const SCHOOL_B_MANAGER_EMAIL = "school-b@leo.com";
const STUDENT_PIN = process.env.DEMO_STUDENT_PIN || "1234";
/** Demo enrolled student in dan@leo-k.com class — for teacher/regression probes */
const SAMPLE_STUDENT_ID = "f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea";

/** @type {Array<{ group: string, id: string, pass: boolean; detail: string }>} */
const results = [];

function record(group, id, pass, detail = "") {
  results.push({ group, id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} [${group}] ${id}${detail ? ` — ${detail}` : ""}`);
}

function password() {
  return (
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    ""
  );
}

async function getBearer(email, pwd) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pwd }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`auth failed for ${email}: ${json.error_description || json.msg || res.status}`);
  }
  return json.access_token;
}

async function api(method, urlPath, token, body) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  const code = json?.error?.code || json?.errorCode || json?.code || null;
  return { status: res.status, json, code, raw: text };
}

async function studentLogin(username) {
  const res = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin: STUDENT_PIN }),
  });
  const json = await res.json().catch(() => ({}));
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") || "").split(",")[0]?.split(";")[0] ||
    "";
  return { ok: res.ok && json?.ok, cookie, json };
}

async function apiWithCookie(method, urlPath, cookie, body) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    json,
    code: json?.error?.code || json?.errorCode || null,
  };
}

async function refreshOperatorToken() {
  return getBearer(QA_OPERATOR_EMAIL, password());
}

function withheldKeys(profile) {
  return ["parent1NationalId", "parent2NationalId", "updatedBy", "updatedByName"].filter(
    (k) => profile && k in profile
  );
}

async function seedSampleProfileForTeacher(managerToken) {
  return api("PUT", `/api/school/students/${SAMPLE_STUDENT_ID}/admin-profile`, managerToken, {
    parent1Name: "TeacherVis Parent",
    parent1Phone: "0504444444",
    parent1NationalId: "999888777",
    parent2Name: "TeacherVis Parent2",
    parent2Phone: "0505555555",
    parent2NationalId: "666555444",
    parentEmail: "teacher-vis-parent@example.com",
    address: "Teacher QA Address",
    emergencyContactName: "Emergency QA",
    emergencyContactPhone: "0506666666",
    transportationNotes: "Bus line 5",
    internalNotes: "Internal QA note",
    dateOfBirth: "2015-01-01",
    childAgeYears: null,
    medicalAllergyNotes: "peanut allergy",
  });
}

async function cleanupSampleProfile(db) {
  await db
    .from("school_student_profiles")
    .delete()
    .eq("school_id", DEMO_SCHOOL_ID)
    .eq("student_id", SAMPLE_STUDENT_ID);
}

async function setGrants(managerToken, operatorId, patch) {
  return api("PATCH", `/api/school/operators/${operatorId}/grants`, managerToken, patch);
}

async function ensureQaOperator(db, pwd) {
  let user = await findAuthUserByEmail(db, QA_OPERATOR_EMAIL);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: QA_OPERATOR_EMAIL,
      password: pwd,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { source: "admin-profile-post-sql-qa" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    await db.auth.admin.updateUserById(user.id, { password: pwd, email_confirm: true });
  }
  return user.id;
}

async function authPlatformAdmin(db, pwd) {
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
      if (ent?.status !== "active" || !user.email) continue;
      try {
        return await getBearer(user.email, pwd);
      } catch {
        // try next
      }
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error("no platform admin matched password");
}

function staticUiChecks() {
  const studentsPage = fs.readFileSync(path.join(ROOT, "pages/school/students/index.js"), "utf8");
  const panel = fs.readFileSync(
    path.join(ROOT, "components/school-portal/SchoolStudentDetailsPanel.jsx"),
    "utf8"
  );
  const teacherPage = fs.readFileSync(path.join(ROOT, "pages/teacher/student/[studentId].js"), "utf8");

  record(
    "UI-static",
    "details_button_gated_by_canBrowseSchoolStudents",
    /canViewDetails\s*=\s*canBrowseSchoolStudents/.test(studentsPage) &&
      /onDetails=\{[\s\S]*canViewDetails/.test(studentsPage),
    "pages/school/students/index.js"
  );
  record(
    "UI-static",
    "viewer_readonly_canEdit_false",
    /canEdit=\{canEditDetails\}/.test(studentsPage) &&
      /canEditDetails\s*=\s*canManageStudentAccess/.test(studentsPage),
    "edit only for manager or student_access_admin"
  );
  record(
    "UI-static",
    "viewer_sees_national_ids_when_canViewNationalIds_default",
    /canViewNationalIds\s*=\s*true/.test(panel),
    "SchoolStudentDetailsPanel default prop"
  );
  record(
    "UI-static",
    "teacher_portal_readonly_no_national_ids",
    /canEdit=\{false\}/.test(teacherPage) &&
      /canViewNationalIds=\{false\}/.test(teacherPage) &&
      /showAuditFooter=\{false\}/.test(teacherPage),
    "pages/teacher/student/[studentId].js"
  );
  record(
    "UI-static",
    "readonly_badge_when_not_canEdit",
    /!canEdit \?/.test(panel) && /SC_DETAILS_READONLY_BADGE/.test(panel),
    "SchoolStudentDetailsPanel"
  );
  record(
    "UI-static",
    "save_controls_only_when_editing_and_canEdit",
    /canEdit &&/.test(panel) && /SC_BTN_SAVE_DETAILS/.test(panel),
    "no save in view-only mode"
  );

  const viewerMe = {
    portalRole: "school_operator",
    operator: { grants: { studentDataViewer: true, studentAccessAdmin: false } },
  };
  const adminMe = {
    portalRole: "school_operator",
    operator: { grants: { studentDataViewer: false, studentAccessAdmin: true } },
  };
  const noGrantMe = {
    portalRole: "school_operator",
    operator: { grants: { studentDataViewer: false, studentAccessAdmin: false } },
  };
  record(
    "UI-static",
    "operator_grants_matrix_viewer_can_browse_not_edit",
    canBrowseSchoolStudents(viewerMe) &&
      !canManageStudentAccess(viewerMe) &&
      canViewStudentData(viewerMe),
    "operator-grants.js"
  );
  record(
    "UI-static",
    "operator_grants_matrix_admin_can_browse_and_edit",
    canBrowseSchoolStudents(adminMe) && canManageStudentAccess(adminMe),
    "operator-grants.js"
  );
  record(
    "UI-static",
    "operator_grants_matrix_no_grants_cannot_browse",
    !canBrowseSchoolStudents(noGrantMe) && !getOperatorGrants(noGrantMe).studentAccessAdmin,
    "operator-grants.js"
  );
}

async function verifySchema(db) {
  const { error: tableErr } = await db.from("school_student_profiles").select("id").limit(1);
  record("Schema", "school_student_profiles.readable", !tableErr, tableErr?.message || "OK");

  const { data: cols, error: colErr } = await db.rpc("to_regclass", { relname: "school_student_profiles" }).maybeSingle?.() ?? {};
  void cols;
  void colErr;

  const { data: sample, error: selErr } = await db
    .from("school_student_profiles")
    .select(
      "parent1_national_id, parent2_national_id, date_of_birth, child_age_years, medical_allergy_notes, updated_by"
    )
    .limit(1);
  record(
    "Schema",
    "expected_columns_present",
    !selErr,
    selErr?.message || (sample ? "select OK" : "empty table OK")
  );
}

async function cleanupTestStudent(db, schoolId, studentId) {
  if (!studentId) return;
  await db.from("school_student_profiles").delete().eq("school_id", schoolId).eq("student_id", studentId);
  await db.from("school_student_enrollments").delete().eq("school_id", schoolId).eq("student_id", studentId);
  await db.from("students").delete().eq("id", studentId);
}

async function main() {
  const pwd = password();
  assert.ok(pwd, "Set DEMO_TEACHER_PASSWORD or SCHOOL_QA_PASSWORD");
  console.log(`verify-school-student-admin-profile-post-sql — base: ${BASE_URL}\n`);

  staticUiChecks();

  const db = createServiceRole();
  await verifySchema(db);

  const root = await fetch(`${BASE_URL}/`, { redirect: "manual" });
  record(
    "Preflight",
    "dev_server_reachable",
    root.status >= 200 && root.status < 500,
    `GET / HTTP ${root.status}`
  );

  let quotaRestore = null;
  const adminToken = await authPlatformAdmin(db, pwd);
  quotaRestore = await ensureDemoSchoolQuotaHeadroom(BASE_URL, adminToken, db, {
    teachers: false,
    operators: true,
  });

  const managerToken = await getBearer(SCHOOL_MANAGER_EMAIL, pwd);
  const operatorUserId = await ensureQaOperator(db, pwd);

  const invite = await api("POST", "/api/school/operators", managerToken, {
    operatorUserId,
    displayName: "QA Admin Profile Operator",
  });
  record(
    "Preflight",
    "qa_operator_invited",
    invite.status === 201 || invite.code === "user_already_school_staff" || invite.status === 409,
    `status=${invite.status} code=${invite.code || "ok"}`
  );

  let operatorToken = await getBearer(QA_OPERATOR_EMAIL, pwd);
  const teacherToken = await getBearer(SCHOOL_TEACHER_EMAIL, pwd);
  let privateTeacherToken;
  try {
    privateTeacherToken = await getBearer(PRIVATE_TEACHER_EMAIL, pwd);
  } catch (e) {
    record("Preflight", "private_teacher_auth", false, e.message);
    privateTeacherToken = null;
  }
  let parentToken;
  try {
    parentToken = await getBearer(DEMO_PARENT_EMAIL, pwd);
  } catch (e) {
    record("Preflight", "parent_auth", false, e.message);
    parentToken = null;
  }

  const ts = Date.now();
  let testStudentId = null;
  let testStudentId2 = null;

  try {
    // ── 1. Manager flow ──
    const createOnlyName = await api("POST", "/api/school/students", managerToken, {
      fullName: `QA-053 NameOnly ${ts}`,
    });
    testStudentId = createOnlyName.json?.data?.student?.studentId;
    record(
      "1-Manager",
      "create_student_name_only",
      createOnlyName.status === 201 && Boolean(testStudentId),
      `status=${createOnlyName.status} studentId=${testStudentId || "missing"}`
    );

    const getEmpty = await api(
      "GET",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken
    );
    record(
      "1-Manager",
      "get_empty_profile_after_name_only_create",
      getEmpty.status === 200 && getEmpty.json?.isEmpty === true && getEmpty.json?.profile == null,
      `status=${getEmpty.status} isEmpty=${getEmpty.json?.isEmpty}`
    );

    const fullProfile = {
      parent1Name: "הורה א",
      parent1Phone: "0501111111",
      parent1NationalId: "111222333",
      parent2Name: "הורה ב",
      parent2Phone: "0502222222",
      parent2NationalId: "444555666",
      parentEmail: "qa-parent@example.com",
      address: "רחוב בדיקה 1",
      emergencyContactName: "דוד",
      emergencyContactPhone: "0503333333",
      transportationNotes: "הסעה A",
      internalNotes: "הערה פנימית",
      dateOfBirth: "2015-03-15",
      medicalAllergyNotes: "אלרגיה לביצים",
    };
    const putFull = await api(
      "PUT",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken,
      fullProfile
    );
    record(
      "1-Manager",
      "put_all_profile_fields",
      putFull.status === 200 &&
        putFull.json?.profile?.parent1NationalId === "111222333" &&
        putFull.json?.profile?.medicalAllergyNotes === "אלרגיה לביצים",
      `status=${putFull.status}`
    );

    const getAfterSave = await api(
      "GET",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken
    );
    record(
      "1-Manager",
      "values_persist_after_save",
      getAfterSave.status === 200 &&
        getAfterSave.json?.profile?.parent1Name === "הורה א" &&
        getAfterSave.json?.profile?.address === "רחוב בדיקה 1" &&
        getAfterSave.json?.isEmpty === false,
      `parent1=${getAfterSave.json?.profile?.parent1Name}`
    );

    const patchName = await api(
      "PATCH",
      `/api/school/students/${testStudentId}/name`,
      managerToken,
      { fullName: `QA-053 Renamed ${ts}` }
    );
    record(
      "1-Manager",
      "patch_student_name",
      patchName.status === 200 && patchName.json?.fullName === `QA-053 Renamed ${ts}`,
      `status=${patchName.status} name=${patchName.json?.fullName}`
    );

    const getReopen = await api(
      "GET",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken
    );
    record(
      "1-Manager",
      "profile_persists_after_reopen",
      getReopen.status === 200 && getReopen.json?.profile?.parent1Phone === "0501111111",
      "parent1Phone preserved"
    );

    // ── 2. student_data_viewer secretary ──
    await setGrants(managerToken, operatorUserId, {
      studentAccessAdmin: false,
      studentDataViewer: true,
    });
    operatorToken = await refreshOperatorToken();

    const viewerGet = await api(
      "GET",
      `/api/school/students/${testStudentId}/admin-profile`,
      operatorToken
    );
    record(
      "2-Viewer",
      "get_profile_includes_national_ids",
      viewerGet.status === 200 &&
        viewerGet.json?.profile?.parent1NationalId === "111222333" &&
        viewerGet.json?.profile?.parent2NationalId === "444555666",
      `status=${viewerGet.status}`
    );

    const viewerPut = await api(
      "PUT",
      `/api/school/students/${testStudentId}/admin-profile`,
      operatorToken,
      { parent1Name: "Blocked" }
    );
    record(
      "2-Viewer",
      "put_profile_denied",
      viewerPut.status === 403,
      `status=${viewerPut.status} code=${viewerPut.code}`
    );

    const viewerPatchName = await api(
      "PATCH",
      `/api/school/students/${testStudentId}/name`,
      operatorToken,
      { fullName: "Blocked Name" }
    );
    record(
      "2-Viewer",
      "patch_name_denied",
      viewerPatchName.status === 403,
      `status=${viewerPatchName.status} code=${viewerPatchName.code}`
    );

    const viewerMe = await api("GET", "/api/school/me", operatorToken);
    record(
      "2-Viewer",
      "me_shows_data_viewer_grant",
      viewerMe.status === 200 && viewerMe.json?.data?.operator?.grants?.studentDataViewer === true,
      `studentDataViewer=${viewerMe.json?.data?.operator?.grants?.studentDataViewer}`
    );

    // ── 3. student_access_admin secretary ──
    await setGrants(managerToken, operatorUserId, {
      studentAccessAdmin: true,
      studentDataViewer: false,
    });
    operatorToken = await refreshOperatorToken();

    const adminCreate = await api("POST", "/api/school/students", operatorToken, {
      fullName: `QA-053 AdminCreate ${ts}`,
    });
    testStudentId2 = adminCreate.json?.data?.student?.studentId;
    record(
      "3-AccessAdmin",
      "create_student",
      adminCreate.status === 201 && Boolean(testStudentId2),
      `status=${adminCreate.status}`
    );

    const adminPutOptional = await api(
      "PUT",
      `/api/school/students/${testStudentId2}/admin-profile`,
      operatorToken,
      { parent1Name: "Optional Create Parent", parent1Phone: "0509999999" }
    );
    record(
      "3-AccessAdmin",
      "optional_details_on_create",
      adminPutOptional.status === 200 && adminPutOptional.json?.profile?.parent1Name === "Optional Create Parent",
      `status=${adminPutOptional.status}`
    );

    const adminPutEdit = await api(
      "PUT",
      `/api/school/students/${testStudentId2}/admin-profile`,
      operatorToken,
      { medicalAllergyNotes: "Updated by admin secretary" }
    );
    record(
      "3-AccessAdmin",
      "edit_all_fields_partial",
      adminPutEdit.status === 200 &&
        adminPutEdit.json?.profile?.medicalAllergyNotes === "Updated by admin secretary" &&
        adminPutEdit.json?.profile?.parent1Phone === "0509999999",
      "partial preserves other fields"
    );

    const adminPatchName = await api(
      "PATCH",
      `/api/school/students/${testStudentId2}/name`,
      operatorToken,
      { fullName: `QA-053 AdminRenamed ${ts}` }
    );
    record(
      "3-AccessAdmin",
      "patch_student_name",
      adminPatchName.status === 200,
      `status=${adminPatchName.status}`
    );

    // ── 4. No grants secretary ──
    await setGrants(managerToken, operatorUserId, {
      studentAccessAdmin: false,
      studentDataViewer: false,
    });
    operatorToken = await refreshOperatorToken();

    const noGrantGet = await api(
      "GET",
      `/api/school/students/${testStudentId}/admin-profile`,
      operatorToken
    );
    record(
      "4-NoGrants",
      "get_profile_denied",
      noGrantGet.status === 403,
      `status=${noGrantGet.status} code=${noGrantGet.code}`
    );

    const noGrantMe = await api("GET", "/api/school/me", operatorToken);
    const grants = noGrantMe.json?.data?.operator?.grants || {};
    record(
      "4-NoGrants",
      "me_shows_no_grants_ui_would_hide_details",
      noGrantMe.status === 200 &&
        grants.studentAccessAdmin !== true &&
        grants.studentDataViewer !== true,
      `accessAdmin=${grants.studentAccessAdmin} dataViewer=${grants.studentDataViewer}`
    );

    // ── 5. Teacher flow ──
    await seedSampleProfileForTeacher(managerToken);
    const teacherGet = await api(
      "GET",
      `/api/teacher/students/${SAMPLE_STUDENT_ID}/admin-profile`,
      teacherToken
    );
    const tp = teacherGet.json?.profile || {};
    const leaked = withheldKeys(tp);
    const allowedPresent =
      tp.parent1Name === "TeacherVis Parent" &&
      tp.medicalAllergyNotes === "peanut allergy" &&
      tp.dateOfBirth === "2015-01-01" &&
      tp.address === "Teacher QA Address";
    record(
      "5-Teacher",
      "get_allowed_fields",
      teacherGet.status === 200 && allowedPresent,
      `status=${teacherGet.status}`
    );
    record(
      "5-Teacher",
      "withheld_fields_absent_from_response",
      teacherGet.status === 200 && leaked.length === 0,
      leaked.length ? `leaked: ${leaked.join(", ")}` : "none leaked"
    );
    record(
      "5-Teacher",
      "response_body_string_has_no_national_id_keys",
      teacherGet.status === 200 &&
        !/"parent1NationalId"/.test(teacherGet.raw || JSON.stringify(teacherGet.json)) &&
        !/"parent2NationalId"/.test(teacherGet.raw || JSON.stringify(teacherGet.json)) &&
        !/"updatedBy"/.test(teacherGet.raw || JSON.stringify(teacherGet.json)) &&
        !/"updatedByName"/.test(teacherGet.raw || JSON.stringify(teacherGet.json)),
      "raw JSON scan"
    );

    const teacherPutSchool = await api(
      "PUT",
      `/api/school/students/${SAMPLE_STUDENT_ID}/admin-profile`,
      teacherToken,
      { parent1Name: "Teacher Hack" }
    );
    record(
      "5-Teacher",
      "put_school_route_denied",
      teacherPutSchool.status === 403,
      `status=${teacherPutSchool.status}`
    );

    const teacherPatchName = await api(
      "PATCH",
      `/api/school/students/${SAMPLE_STUDENT_ID}/name`,
      teacherToken,
      { fullName: "Teacher Hack" }
    );
    record(
      "5-Teacher",
      "patch_name_denied",
      teacherPatchName.status === 403,
      `status=${teacherPatchName.status}`
    );

    // ── 6. API edge checks ──
    const partialPut = await api(
      "PUT",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken,
      { parent1Name: "Partial Updated" }
    );
    record(
      "6-Edge",
      "partial_put_preserves_other_fields",
      partialPut.status === 200 &&
        partialPut.json?.profile?.parent1Name === "Partial Updated" &&
        partialPut.json?.profile?.parent1Phone === "0501111111" &&
        partialPut.json?.profile?.address === "רחוב בדיקה 1",
      `parent1Phone=${partialPut.json?.profile?.parent1Phone}`
    );

    const clearPhone = await api(
      "PUT",
      `/api/school/students/${testStudentId}/admin-profile`,
      managerToken,
      { parent1Phone: null }
    );
    record(
      "6-Edge",
      "explicit_null_clears_single_field",
      clearPhone.status === 200 &&
        clearPhone.json?.profile?.parent1Phone == null &&
        clearPhone.json?.profile?.parent1Name === "Partial Updated",
      `parent1Phone=${clearPhone.json?.profile?.parent1Phone}`
    );

    // Cross-school
    let schoolBToken = null;
    let schoolBId = null;
    try {
      schoolBToken = await getBearer(SCHOOL_B_MANAGER_EMAIL, pwd);
      const schoolBMe = await api("GET", "/api/school/me", schoolBToken);
      schoolBId = schoolBMe.json?.data?.schoolId;
    } catch (e) {
      record("6-Edge", "cross_school_setup", false, e.message);
    }
    if (schoolBToken) {
      const crossGet = await api(
        "GET",
        `/api/school/students/${testStudentId}/admin-profile`,
        schoolBToken
      );
      record(
        "6-Edge",
        "cross_school_get_blocked",
        crossGet.status === 403 || crossGet.status === 404,
        `status=${crossGet.status} code=${crossGet.code} schoolB=${schoolBId || "?"}`
      );
      const crossPut = await api(
        "PUT",
        `/api/school/students/${testStudentId}/admin-profile`,
        schoolBToken,
        { parent1Name: "Cross" }
      );
      record(
        "6-Edge",
        "cross_school_put_blocked",
        crossPut.status === 403 || crossPut.status === 404,
        `status=${crossPut.status}`
      );
    }

    if (privateTeacherToken) {
      const privGet = await api(
        "GET",
        `/api/school/students/${testStudentId}/admin-profile`,
        privateTeacherToken
      );
      record(
        "6-Edge",
        "private_teacher_school_route_blocked",
        privGet.status === 403,
        `status=${privGet.status}`
      );
      const privTeacherGet = await api(
        "GET",
        `/api/teacher/students/${testStudentId}/admin-profile`,
        privateTeacherToken
      );
      record(
        "6-Edge",
        "private_teacher_teacher_route_blocked",
        privTeacherGet.status === 403,
        `status=${privTeacherGet.status} code=${privTeacherGet.code}`
      );
    }

    if (parentToken) {
      const parentSchoolGet = await api(
        "GET",
        `/api/school/students/${testStudentId}/admin-profile`,
        parentToken
      );
      record(
        "6-Edge",
        "parent_school_route_blocked",
        parentSchoolGet.status === 403,
        `status=${parentSchoolGet.status}`
      );
      const parentTeacherGet = await api(
        "GET",
        `/api/teacher/students/${testStudentId}/admin-profile`,
        parentToken
      );
      record(
        "6-Edge",
        "parent_teacher_route_blocked",
        parentTeacherGet.status === 403,
        `status=${parentTeacherGet.status}`
      );
    }

    const { data: credRows } = await db
      .from("student_access_codes")
      .select("login_username")
      .eq("student_id", SAMPLE_STUDENT_ID)
      .eq("is_active", true)
      .limit(1);
    const credRow = credRows?.[0];
    if (credRow?.login_username) {
      const st = await studentLogin(credRow.login_username);
      const stGet = await apiWithCookie(
        "GET",
        `/api/school/students/${SAMPLE_STUDENT_ID}/admin-profile`,
        st.cookie
      );
      record(
        "6-Edge",
        "student_session_school_route_blocked",
        stGet.status === 403 || stGet.status === 401,
        `status=${stGet.status}`
      );
    } else {
      record(
        "6-Edge",
        "student_session_school_route_blocked",
        false,
        "no active student_access_codes row for sample student"
      );
    }

    // ── 7. Regression checks ──
    const listStudents = await api("GET", "/api/school/students", managerToken);
    record(
      "7-Regression",
      "student_list_loads",
      listStudents.status === 200 && Array.isArray(listStudents.json?.data?.students),
      `count=${listStudents.json?.data?.students?.length ?? "?"}`
    );

    const reportData = await api(
      "GET",
      `/api/school/students/${SAMPLE_STUDENT_ID}/report-data`,
      managerToken
    );
    record(
      "7-Regression",
      "report_modal_api",
      reportData.status === 200,
      `status=${reportData.status}`
    );

    const accessApi = await api(
      "GET",
      `/api/school/students/${SAMPLE_STUDENT_ID}/accounts`,
      managerToken
    );
    record(
      "7-Regression",
      "access_modal_api",
      accessApi.status === 200,
      `status=${accessApi.status}`
    );

    const assignApi = await api(
      "GET",
      `/api/school/students/${SAMPLE_STUDENT_ID}/assignment`,
      managerToken
    );
    record(
      "7-Regression",
      "assignment_modal_api",
      assignApi.status === 200,
      `status=${assignApi.status}`
    );

    const teacherReport = await api(
      "GET",
      `/api/teacher/students/${SAMPLE_STUDENT_ID}/report-data`,
      teacherToken
    );
    record(
      "7-Regression",
      "teacher_report_api",
      teacherReport.status === 200,
      `status=${teacherReport.status}`
    );

    if (parentToken) {
      const parentPolicy = await api("GET", "/api/parent/policy-acceptance/status", parentToken);
      const parentAdminGet = await api(
        "GET",
        `/api/school/students/${SAMPLE_STUDENT_ID}/admin-profile`,
        parentToken
      );
      record(
        "7-Regression",
        "parent_portal_unchanged",
        parentPolicy.status === 200 && parentAdminGet.status === 403,
        `policy=${parentPolicy.status} admin-profile=${parentAdminGet.status}`
      );
    } else {
      record("7-Regression", "parent_portal_unchanged", false, "parent auth unavailable");
    }

    await cleanupSampleProfile(db);
  } finally {
    await setGrants(managerToken, operatorUserId, {
      studentAccessAdmin: false,
      studentDataViewer: false,
    });
    await cleanupTestStudent(db, DEMO_SCHOOL_ID, testStudentId);
    await cleanupTestStudent(db, DEMO_SCHOOL_ID, testStudentId2);
    if (quotaRestore?.restore) await quotaRestore.restore();
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n=== SUMMARY ===");
  console.log(`Total: ${results.length}  PASS: ${results.length - failed.length}  FAIL: ${failed.length}`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  [${f.group}] ${f.id} — ${f.detail}`);
    process.exit(1);
  }
  console.log("\nverify-school-student-admin-profile-post-sql: ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
