#!/usr/bin/env node
/**
 * UI product-scope API checks (admin private-only, school manager invite, operator isolation).
 */
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import { SCHOOL_MANAGER_EMAIL } from "../../scripts/school-portal/sim/school-sim-config.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
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
  if (!tokenJson.access_token) throw new Error(`auth failed for ${email}`);
  return tokenJson.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const code = json?.error?.code || json?.errorCode || null;
  return { status: res.status, json, code };
}

async function main() {
  const password =
    process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
  if (!password) throw new Error("Missing DEMO_TEACHER_PASSWORD");

  const db = createServiceRole();
  const adminToken = await getBearer("office@leo.com", password);
  const managerToken = await getBearer(SCHOOL_MANAGER_EMAIL, password);

  const list = await api("GET", "/api/admin/teachers", adminToken);
  const teachers = list.json?.data?.teachers || [];
  record(
    "admin_teachers_private_only",
    list.status === 200 && teachers.every((t) => !t.schoolMembership?.schoolId && !t.schoolId),
    `count=${teachers.length} withSchool=${teachers.filter((t) => t.schoolId).length}`
  );

  const dan = await findAuthUserByEmail(db, "dan@leo-k.com");
  if (dan?.id) {
    const quota = await api("PATCH", `/api/admin/teachers/${dan.id}/quotas`, adminToken, {
      notes: "scope-test",
    });
    record(
      "admin_cannot_patch_school_teacher_quotas",
      quota.status === 403 && quota.code === "school_staff_not_private_teacher",
      `status=${quota.status} code=${quota.code}`
    );

    const subjects = await api(
      "POST",
      `/api/admin/teachers/${dan.id}/discussion-subjects`,
      adminToken,
      { subject: "math" }
    );
    record(
      "admin_cannot_grant_school_teacher_subjects",
      subjects.status === 403 || subjects.code === "not_private_teacher",
      `status=${subjects.status} code=${subjects.code}`
    );
  }

  const schoolTeachers = await api("GET", "/api/school/teachers", managerToken);
  const st = schoolTeachers.json?.data?.teachers || [];
  record(
    "school_teachers_exclude_operators",
    schoolTeachers.status === 200 && st.every((t) => t.role !== "school_operator"),
    `count=${st.length} operators=${st.filter((t) => t.role === "school_operator").length}`
  );

  const operators = await api("GET", "/api/school/operators", managerToken);
  record(
    "school_manager_lists_operators",
    operators.status === 200,
    `status=${operators.status} count=${operators.json?.data?.operators?.length ?? 0}`
  );

  const qaOp = await findAuthUserByEmail(db, "qa-school-operator@leo-k.com");
  if (qaOp?.id && dan?.id) {
    const assign = await api(
      "POST",
      `/api/school/teachers/${dan.id}/subjects`,
      managerToken,
      { subject: "math", gradeLevel: "grade_3" }
    );
    record(
      "manager_can_assign_teacher_subject",
      assign.status === 201 || assign.code === "subject_already_granted",
      `status=${assign.status} code=${assign.code || "ok"}`
    );

    const opAssign = await api(
      "POST",
      `/api/school/teachers/${qaOp.id}/subjects`,
      managerToken,
      { subject: "math", gradeLevel: "grade_3" }
    );
    record(
      "manager_cannot_assign_operator_subject",
      opAssign.status === 403 || opAssign.status === 404,
      `status=${opAssign.status} code=${opAssign.code}`
    );
  }

  if (qaOp?.id) {
    const opToken = await getBearer("qa-school-operator@leo-k.com", password);
    const me = await api("GET", "/api/school/me", opToken);
    record(
      "operator_school_me",
      me.status === 200 && me.json?.data?.portalRole === "school_operator",
      `status=${me.status} role=${me.json?.data?.portalRole}`
    );

    const mgrList = await api("GET", "/api/school/operators", opToken);
    record(
      "operator_cannot_list_operators",
      mgrList.status === 403,
      `status=${mgrList.status} code=${mgrList.code}`
    );

    const opSubject = await api(
      "POST",
      `/api/school/teachers/${qaOp.id}/subjects`,
      managerToken,
      { subject: "math", gradeLevel: "grade_3" }
    );
    record(
      "operators_cannot_receive_subject_permissions",
      opSubject.status === 403 || opSubject.status === 404,
      `status=${opSubject.status} code=${opSubject.code}`
    );
  }

  const parentsList = await api("GET", "/api/admin/parents", adminToken);
  record(
    "admin_can_list_registered_parents",
    parentsList.status === 200 && Array.isArray(parentsList.json?.data?.parents),
    `status=${parentsList.status} count=${parentsList.json?.data?.parents?.length ?? "n/a"}`
  );

  const schoolsList = await api("GET", "/api/admin/schools", adminToken);
  record(
    "admin_can_list_schools",
    schoolsList.status === 200 && Array.isArray(schoolsList.json?.data?.schools),
    `status=${schoolsList.status} count=${schoolsList.json?.data?.schools?.length ?? "n/a"}`
  );

  const teacherInviteEmail = await api("POST", "/api/school/teachers", managerToken, {
    email: "nonexistent-staff-invite@test.invalid",
  });
  record(
    "school_manager_teacher_invite_accepts_email",
    teacherInviteEmail.status === 404 && teacherInviteEmail.code === "staff_user_not_found",
    `status=${teacherInviteEmail.status} code=${teacherInviteEmail.code}`
  );

  const operatorInviteEmail = await api("POST", "/api/school/operators", managerToken, {
    email: "nonexistent-staff-invite@test.invalid",
  });
  record(
    "school_manager_operator_invite_accepts_email",
    operatorInviteEmail.status === 404 && operatorInviteEmail.code === "staff_user_not_found",
    `status=${operatorInviteEmail.status} code=${operatorInviteEmail.code}`
  );

  const inviteFormSource = await import("fs/promises").then((fs) =>
    fs.readFile("components/school-portal/SchoolStaffEmailInviteForm.jsx", "utf8")
  );
  record(
    "staff_invite_form_no_student_wording",
    !inviteFormSource.includes("SCHOOL_STUDENT_ID") &&
      !inviteFormSource.includes("SCHOOL_ENROLL_SECTION") &&
      !inviteFormSource.includes("תלמיד"),
    "SchoolStaffEmailInviteForm uses email-first copy"
  );

  const operatorGrantSource = await import("fs/promises").then((fs) =>
    fs.readFile("components/school-portal/SchoolOperatorGrantPanel.jsx", "utf8")
  );
  record(
    "operator_ui_no_teacher_subject_strings",
    !operatorGrantSource.includes("SCHOOL_SUBJECT") &&
      !operatorGrantSource.includes("כיתות של המורה") &&
      !operatorGrantSource.includes("הוספת מקצוע"),
    "operator grant panel is grant-only"
  );

  const adminShellSource = await import("fs/promises").then((fs) =>
    fs.readFile("components/admin/AdminShell.jsx", "utf8")
  );
  record(
    "admin_nav_includes_schools_and_parents",
    adminShellSource.includes("/admin/schools") &&
      adminShellSource.includes("/admin/parents") &&
      adminShellSource.includes("ADMIN_NAV_PARENTS"),
    "AdminShell exposes schools + registered parents"
  );

  const studentCreateSource = await import("fs/promises").then((fs) =>
    fs.readFile("components/school-portal/SchoolStudentCreateForm.jsx", "utf8")
  );
  record(
    "school_student_create_form_primary",
    studentCreateSource.includes("SCHOOL_CREATE_STUDENT_SECTION") &&
      studentCreateSource.includes("fullName") &&
      !studentCreateSource.includes("SCHOOL_STUDENT_ID"),
    "primary student create is name-based"
  );

  const studentsPageSource = await import("fs/promises").then((fs) =>
    fs.readFile("pages/school/students/index.js", "utf8")
  );
  record(
    "school_students_page_has_create_form",
    studentsPageSource.includes("SchoolStudentCreateForm"),
    "create form on /school/students"
  );

  const teacherDetailSource = await import("fs/promises").then((fs) =>
    fs.readFile("components/admin/TeacherAdminDetailView.jsx", "utf8")
  );
  record(
    "admin_teacher_detail_plan_mapped",
    teacherDetailSource.includes("planCodeLabelHe(teacher.planCode)"),
    "plan label mapper"
  );

  const { planCodeLabelHe } = await import("../../lib/admin-portal/admin-ui.he.js");
  record(
    "plan_label_teacher_basic_20",
    planCodeLabelHe("teacher_basic_20") === "תוכנית בסיסית - עד 20 תלמידים",
    planCodeLabelHe("teacher_basic_20")
  );

  const pendingTeachers = await api("GET", "/api/admin/teachers?status=pending", adminToken);
  record(
    "admin_can_see_pending_teachers_filter",
    pendingTeachers.status === 200 && Array.isArray(pendingTeachers.json?.data?.teachers),
    `status=${pendingTeachers.status}`
  );

  const pendingSchools = await api("GET", "/api/admin/schools?status=pending", adminToken);
  record(
    "admin_can_see_pending_schools_filter",
    pendingSchools.status === 200 && Array.isArray(pendingSchools.json?.data?.schools),
    `status=${pendingSchools.status}`
  );

  const teacherLoginSource = await import("fs/promises").then((fs) =>
    fs.readFile("pages/teacher/login.js", "utf8")
  );
  record(
    "teacher_login_has_registration_request_tab",
    teacherLoginSource.includes("teacher-request-tab") &&
      teacherLoginSource.includes("TeacherRegistrationRequestForm") &&
      !teacherLoginSource.includes('mode === "request" && !inviteOnly'),
    "request tab on teacher login (always visible)"
  );

  const schoolRegisterSource = await import("fs/promises").then((fs) =>
    fs.readFile("pages/school/register.js", "utf8")
  );
  record(
    "school_register_page_exists",
    schoolRegisterSource.includes("school-register-page") &&
      schoolRegisterSource.includes("SchoolRegistrationRequestForm"),
    "/school/register"
  );

  const privateTeacherToken = await getBearer("teacher@leo.com", password);
  const parentTeachersPending = await api(
    "GET",
    "/api/admin/teachers?status=pending",
    privateTeacherToken
  );
  record(
    "parent_cannot_see_admin_pending_teachers",
    parentTeachersPending.status === 403,
    `status=${parentTeachersPending.status} code=${parentTeachersPending.code}`
  );

  void DEMO_SCHOOL_ID;

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nUI scope: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
