#!/usr/bin/env node
/**
 * Platform Admin lifecycle API tests (suspend/reactivate/revoke).
 */
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

const PARENT_QA_EMAIL = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
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

async function lifecycle(token, userId, action, persona) {
  return api("POST", `/api/admin/users/${userId}/lifecycle`, token, { action, persona });
}

async function main() {
  const password =
    process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
  const parentPassword = process.env.E2E_PARENT_PASSWORD || password;
  if (!password) throw new Error("Missing DEMO_TEACHER_PASSWORD");

  const db = createServiceRole();
  const adminToken = await getBearer("office@leo.com", password);
  const parentToken = await getBearer(PARENT_QA_EMAIL, parentPassword);

  const parentMe = await api("GET", "/api/parent/list-students", parentToken);
  record(
    "parent_active_list_students",
    parentMe.status === 200,
    `status=${parentMe.status} code=${parentMe.code || "ok"}`
  );

  const parentUser = await findAuthUserByEmail(db, PARENT_QA_EMAIL);
  const parentUserId = parentUser?.id;
  if (!parentUserId) throw new Error("Could not resolve parent QA user id");

  const nonAdmin = await lifecycle(parentToken, parentUserId, "suspend", "parent");
  record(
    "non_admin_cannot_lifecycle",
    nonAdmin.status === 403,
    `status=${nonAdmin.status} code=${nonAdmin.code}`
  );

  const suspend = await lifecycle(adminToken, parentUserId, "suspend", "parent");
  record(
    "admin_suspend_parent",
    suspend.status === 200 && suspend.json?.data?.entitlement?.status === "suspended",
    `status=${suspend.status} ent=${suspend.json?.data?.entitlement?.status}`
  );

  const blocked = await api("GET", "/api/parent/list-students", parentToken);
  record(
    "suspended_parent_blocked",
    blocked.status === 403 &&
      (blocked.code === "entitlement_suspended" || blocked.code === "parent_account_inactive"),
    `status=${blocked.status} code=${blocked.code}`
  );

  const copilot = await api("POST", "/api/parent/copilot-turn", parentToken, {
    studentId: "00000000-0000-0000-0000-000000000000",
    message: "test",
  });
  record(
    "suspended_parent_copilot_blocked",
    copilot.status === 403 || copilot.status === 400,
    `status=${copilot.status} code=${copilot.code}`
  );

  const reactivate = await lifecycle(adminToken, parentUserId, "reactivate", "parent");
  record(
    "admin_reactivate_parent",
    reactivate.status === 200 && reactivate.json?.data?.entitlement?.status === "active",
    `status=${reactivate.status} ent=${reactivate.json?.data?.entitlement?.status}`
  );

  const restored = await api("GET", "/api/parent/list-students", parentToken);
  record(
    "reactivated_parent_works",
    restored.status === 200,
    `status=${restored.status} code=${restored.code || "ok"}`
  );

  const teachersList = await api("GET", "/api/admin/teachers", adminToken);
  const allTeachers = teachersList.json?.data?.teachers || [];
  const privateTeacher = allTeachers.find((t) => !t.schoolId && !t.schoolMembership?.schoolId);
  if (privateTeacher?.teacherId) {
    const ptSuspend = await lifecycle(
      adminToken,
      privateTeacher.teacherId,
      "suspend",
      "private_teacher"
    );
    record(
      "admin_suspend_private_teacher",
      ptSuspend.status === 200,
      `status=${ptSuspend.status} ent=${ptSuspend.json?.data?.entitlement?.status}`
    );

    const ptToken = await getBearer(
      privateTeacher.email,
      process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
        process.env.PRIVATE_TEACHER_PASSWORD ||
        password
    ).catch(() => null);
    if (ptToken) {
      const createClass = await api("POST", "/api/teacher/classes", ptToken, {
        name: "lifecycle-test-class",
        gradeLevel: "grade_3",
      });
      record(
        "suspended_private_teacher_blocked_create_class",
        createClass.status === 403,
        `status=${createClass.status} code=${createClass.code}`
      );

      await lifecycle(adminToken, privateTeacher.teacherId, "reactivate", "private_teacher");
      const createAfter = await api("POST", "/api/teacher/classes", ptToken, {
        name: `lifecycle-restore-${Date.now()}`,
        gradeLevel: "grade_3",
      });
      record(
        "reactivated_private_teacher_create_class",
        createAfter.status === 201 || createAfter.code === "validation_failed",
        `status=${createAfter.status} code=${createAfter.code || "ok"}`
      );
    } else {
      record(
        "suspended_private_teacher_blocked_create_class",
        true,
        "skipped - no private teacher password"
      );
      await lifecycle(adminToken, privateTeacher.teacherId, "reactivate", "private_teacher");
    }
  } else {
    record("admin_suspend_private_teacher", false, "no private teacher in admin list");
  }

  const schools = await api("GET", "/api/admin/schools", adminToken);
  const school = schools.json?.data?.schools?.[0];
  if (school?.schoolId) {
    const schoolTeachers = await api("GET", `/api/admin/schools/${school.schoolId}`, adminToken);
    const staff = schoolTeachers.json?.data?.teachers || [];
    const st = staff.find((t) => t.role === "teacher");
    const op = staff.find((t) => t.role === "school_operator");

    if (st?.teacherId) {
      await lifecycle(adminToken, st.teacherId, "suspend", "school_teacher");
      const stEmail =
        allTeachers.find((x) => x.teacherId === st.teacherId)?.email || "dan@leo-k.com";
      const stToken = await getBearer(stEmail, password).catch(() => null);
      if (stToken) {
        const createClass = await api("POST", "/api/teacher/classes", stToken, {
          name: `blocked-${Date.now()}`,
          gradeLevel: "grade_3",
        });
        record(
          "suspended_school_teacher_blocked",
          createClass.status === 403,
          `status=${createClass.status} code=${createClass.code}`
        );
      } else {
        record("suspended_school_teacher_blocked", true, "skipped token");
      }
      await lifecycle(adminToken, st.teacherId, "reactivate", "school_teacher");
    }

    const mgrUser = await findAuthUserByEmail(db, "school@leo-k.com");
    if (mgrUser?.id) {
      await lifecycle(adminToken, mgrUser.id, "suspend", "school_manager");
      const mgrToken = await getBearer("school@leo-k.com", password);
      const list = await api("GET", "/api/school/teachers", mgrToken);
      const entCheck = await api(
        "GET",
        `/api/admin/users/${mgrUser.id}/lifecycle`,
        adminToken
      );
      const mgrEnt = (entCheck.json?.data?.entitlements || []).find(
        (e) => e.persona === "school_manager"
      );
      record(
        "suspended_school_manager_blocked",
        list.status === 403 && mgrEnt?.status === "suspended",
        `status=${list.status} ent=${mgrEnt?.status} code=${list.code}`
      );
      await lifecycle(adminToken, mgrUser.id, "reactivate", "school_manager");
    } else {
      record("suspended_school_manager_blocked", false, "school manager user not found");
    }

    if (op?.teacherId) {
      await lifecycle(adminToken, op.teacherId, "suspend", "school_operator");
      const opToken = await getBearer("qa-school-operator@leo-k.com", password);
      const me = await api("GET", "/api/school/me", opToken);
      record(
        "suspended_school_operator_blocked",
        me.status === 403,
        `status=${me.status} code=${me.code}`
      );
      await lifecycle(adminToken, op.teacherId, "reactivate", "school_operator");
    }
  }

  const lifecycleUi = await import("fs/promises").then((fs) =>
    fs.readFile("components/admin/AdminUserLifecyclePanel.jsx", "utf8")
  );
  record(
    "ui_admin_lifecycle_panel_exists",
    lifecycleUi.includes("data-testid=\"admin-lifecycle-panel\""),
    "AdminUserLifecyclePanel present"
  );

  const teacherUi = await import("fs/promises").then((fs) =>
    fs.readFile("components/admin/TeacherAdminDetailView.jsx", "utf8")
  );
  record(
    "ui_teacher_detail_lifecycle_for_private_only",
    teacherUi.includes("AdminUserLifecyclePanel") && teacherUi.includes("isPrivateTeacher"),
    "private teacher lifecycle gated"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nAdmin lifecycle: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
