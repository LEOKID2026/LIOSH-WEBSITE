#!/usr/bin/env node
/**
 * Public registration / request workflow API matrix.
 */
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

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

async function entitlementStatus(db, userId, persona) {
  const { data } = await db
    .from("account_persona_entitlements")
    .select("status")
    .eq("user_id", userId)
    .eq("persona", persona)
    .maybeSingle();
  return data?.status ?? null;
}

async function setPassword(db, userId, password) {
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
}

async function lifecycle(token, userId, action, persona, reason) {
  return api("POST", `/api/admin/users/${userId}/lifecycle`, token, {
    action,
    persona,
    ...(reason != null ? { reason } : {}),
  });
}

async function main() {
  const adminPassword =
    process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
  if (!adminPassword) throw new Error("Missing DEMO_TEACHER_PASSWORD");

  const db = createServiceRole();
  const adminToken = await getBearer("office@leo.com", adminPassword);
  const ts = Date.now();
  const testPassword = `RegTest${ts}!`;
  const teacherEmail = `reg-teacher-${ts}@test.invalid`;
  const rejectTeacherEmail = `reg-teacher-reject-${ts}@test.invalid`;
  const schoolEmail = `reg-school-${ts}@test.invalid`;

  const teacherPayload = {
    fullName: "מורה בדיקה",
    email: teacherEmail,
    phone: "0501234567",
    requestIntent: "private_teacher",
    description: "בקשה לחשבון מורה פרטי לצורכי בדיקה",
    requestedSubjects: ["math"],
  };

  const teacherReq = await api("POST", "/api/auth/teacher-request", null, teacherPayload);
  record(
    "teacher_request_creates_pending_entitlement",
    teacherReq.status === 201 || teacherReq.status === 200,
    `status=${teacherReq.status} code=${teacherReq.code || "ok"}`
  );

  const teacherUser = await findAuthUserByEmail(db, teacherEmail);
  if (!teacherUser?.id) throw new Error("teacher user not created");

  const pendingEnt = await entitlementStatus(db, teacherUser.id, "private_teacher");
  record(
    "teacher_entitlement_pending_in_db",
    pendingEnt === "pending",
    `status=${pendingEnt}`
  );

  await setPassword(db, teacherUser.id, testPassword);
  const teacherToken = await getBearer(teacherEmail, testPassword);

  const teacherMe = await api("GET", "/api/teacher/me", teacherToken);
  record(
    "teacher_request_no_active_access",
    teacherMe.status === 403 && teacherMe.code === "entitlement_pending",
    `status=${teacherMe.status} code=${teacherMe.code}`
  );

  const dupReq = await api("POST", "/api/auth/teacher-request", null, teacherPayload);
  record(
    "teacher_request_duplicate_pending",
    dupReq.status === 409 && dupReq.code === "request_already_pending",
    `status=${dupReq.status} code=${dupReq.code}`
  );

  const noSubjectsEmail = `reg-teacher-nosubj-${ts}@test.invalid`;
  const noSubjectsReq = await api("POST", "/api/auth/teacher-request", null, {
    fullName: "מורה ללא מקצועות",
    email: noSubjectsEmail,
    phone: "0527654321",
    requestIntent: "school_representative",
    description: "אני נציג בית ספר ומבקש גישה לניהול בית הספר שלנו",
    requestedSubjects: [],
  });
  record(
    "teacher_request_optional_subjects",
    noSubjectsReq.status === 201 || noSubjectsReq.status === 200,
    `status=${noSubjectsReq.status} code=${noSubjectsReq.code || "ok"}`
  );

  const teacherDash = await api("GET", "/api/teacher/dashboard", teacherToken);
  record(
    "teacher_request_no_subject_access_before_approval",
    teacherDash.status === 403 &&
      (teacherDash.code === "entitlement_pending" || teacherDash.code === "not_a_teacher"),
    `status=${teacherDash.status} code=${teacherDash.code}`
  );

  const selfQuota = await api(
    "PATCH",
    `/api/admin/teachers/${teacherUser.id}/quotas`,
    teacherToken,
    { notes: "self" }
  );
  record(
    "teacher_cannot_set_own_quotas",
    selfQuota.status === 403,
    `status=${selfQuota.status} code=${selfQuota.code}`
  );

  const selfSubject = await api(
    "POST",
    `/api/admin/teachers/${teacherUser.id}/discussion-subjects`,
    teacherToken,
    { subject: "math" }
  );
  record(
    "teacher_cannot_set_own_subjects",
    selfSubject.status === 403,
    `status=${selfSubject.status} code=${selfSubject.code}`
  );

  const approveTeacher = await lifecycle(
    adminToken,
    teacherUser.id,
    "reactivate",
    "private_teacher"
  );
  record(
    "admin_approve_teacher",
    approveTeacher.status === 200 &&
      approveTeacher.json?.data?.entitlement?.status === "active",
    `status=${approveTeacher.status}`
  );

  const teacherMeActive = await api("GET", "/api/teacher/me", teacherToken);
  record(
    "approved_teacher_can_access_me",
    teacherMeActive.status === 200,
    `status=${teacherMeActive.status} code=${teacherMeActive.code || "ok"}`
  );

  const rejectPayload = {
    fullName: "מורה נדחה",
    email: rejectTeacherEmail,
    phone: "0541112233",
    requestIntent: "general_access",
    description: "בקשת גישה כללית לצורכי בדיקת דחייה",
    requestedSubjects: ["hebrew"],
  };
  await api("POST", "/api/auth/teacher-request", null, rejectPayload);
  const rejectUser = await findAuthUserByEmail(db, rejectTeacherEmail);
  if (!rejectUser?.id) throw new Error("reject teacher user missing");
  await setPassword(db, rejectUser.id, testPassword);
  const rejectToken = await getBearer(rejectTeacherEmail, testPassword);

  const rejectTeacher = await lifecycle(
    adminToken,
    rejectUser.id,
    "reject",
    "private_teacher",
    "בדיקה"
  );
  record(
    "admin_reject_teacher",
    rejectTeacher.status === 200 &&
      rejectTeacher.json?.data?.entitlement?.status === "rejected",
    `status=${rejectTeacher.status}`
  );

  const rejectedMe = await api("GET", "/api/teacher/me", rejectToken);
  record(
    "rejected_teacher_still_blocked",
    rejectedMe.status === 403 && rejectedMe.code === "entitlement_rejected",
    `status=${rejectedMe.status} code=${rejectedMe.code}`
  );

  const schoolPayload = {
    schoolName: `בית ספר בדיקה ${ts}`,
    city: "תל אביב",
    contactName: "איש קשר בדיקה",
    contactEmail: schoolEmail,
    approxTeachers: 5,
    approxStudents: 120,
    message: "בדיקה",
  };

  const schoolReq = await api("POST", "/api/auth/school-request", null, schoolPayload);

  const schoolUser = await findAuthUserByEmail(db, schoolEmail);
  if (!schoolUser?.id) throw new Error("school contact user missing");

  let schoolId = schoolReq.json?.data?.schoolId;
  if (!schoolId) {
    const { data: membership } = await db
      .from("school_teacher_memberships")
      .select("school_id")
      .eq("teacher_id", schoolUser.id)
      .eq("role", "school_admin")
      .maybeSingle();
    schoolId = membership?.school_id ?? null;
  }

  record(
    "school_request_creates_pending",
    (schoolReq.status === 201 || schoolReq.status === 200) && Boolean(schoolId),
    `status=${schoolReq.status} code=${schoolReq.code || "ok"} schoolId=${schoolId || "none"}`
  );
  record("school_request_returns_school_id", Boolean(schoolId), `schoolId=${schoolId || "none"}`);

  const managerEnt = await entitlementStatus(db, schoolUser.id, "school_manager");
  record(
    "school_manager_entitlement_pending",
    managerEnt === "pending",
    `status=${managerEnt}`
  );

  if (!schoolId) {
    console.log("\nSkipping school approval tests - school registration did not create a school row.");
  } else {
  const { data: schoolRow } = await db
    .from("school_accounts")
    .select("is_active")
    .eq("id", schoolId)
    .maybeSingle();
  record(
    "school_request_does_not_auto_activate",
    schoolRow?.is_active === false,
    `is_active=${schoolRow?.is_active}`
  );

  await setPassword(db, schoolUser.id, testPassword);
  const managerToken = await getBearer(schoolEmail, testPassword);

  const managerMe = await api("GET", "/api/school/me", managerToken);
  record(
    "school_request_no_active_access",
    managerMe.status === 403 &&
      (managerMe.code === "entitlement_pending" || managerMe.code === "school_inactive"),
    `status=${managerMe.status} code=${managerMe.code}`
  );

  record(
    "manager_only_active_after_admin_approval",
    managerMe.status === 403,
    `blocked before approval status=${managerMe.status}`
  );

  const approveSchool = await api(
    "POST",
    `/api/admin/schools/${schoolId}/approve`,
    adminToken
  );
  record(
    "admin_approve_school",
    approveSchool.status === 200,
    `status=${approveSchool.status} code=${approveSchool.code || "ok"}`
  );

  const { data: schoolActive } = await db
    .from("school_accounts")
    .select("is_active")
    .eq("id", schoolId)
    .maybeSingle();
  const managerEntActive = await entitlementStatus(db, schoolUser.id, "school_manager");
  record(
    "school_active_after_admin_approval",
    schoolActive?.is_active === true && managerEntActive === "active",
    `is_active=${schoolActive?.is_active} ent=${managerEntActive}`
  );

  const managerMeAfter = await api("GET", "/api/school/me", managerToken);
  record(
    "approved_manager_can_access_school_portal",
    managerMeAfter.status === 200,
    `status=${managerMeAfter.status} code=${managerMeAfter.code || "ok"}`
  );
  }

  const rejectSchoolEmail = `reg-school-reject-${ts}@test.invalid`;
  const rejectSchoolReq = await api("POST", "/api/auth/school-request", null, {
    ...schoolPayload,
    schoolName: `בית ספר דחייה ${ts}`,
    contactEmail: rejectSchoolEmail,
    contactName: "דחייה בדיקה",
  });
  const rejectSchoolUser = await findAuthUserByEmail(db, rejectSchoolEmail);
  let rejectSchoolId = rejectSchoolReq.json?.data?.schoolId;
  if (!rejectSchoolId && rejectSchoolUser?.id) {
    const { data: mem } = await db
      .from("school_teacher_memberships")
      .select("school_id")
      .eq("teacher_id", rejectSchoolUser.id)
      .maybeSingle();
    rejectSchoolId = mem?.school_id ?? null;
  }
  if (rejectSchoolId) {
    const rejectSchool = await api(
      "POST",
      `/api/admin/schools/${rejectSchoolId}/reject`,
      adminToken,
      { reason: "בדיקת דחייה" }
    );
    record(
      "admin_reject_school",
      rejectSchool.status === 200,
      `status=${rejectSchool.status} code=${rejectSchool.code || "ok"}`
    );
    if (rejectSchoolUser?.id) {
      await setPassword(db, rejectSchoolUser.id, testPassword);
      const rejectManagerToken = await getBearer(rejectSchoolEmail, testPassword);
      const rejectedManagerMe = await api("GET", "/api/school/me", rejectManagerToken);
      record(
        "rejected_school_manager_blocked",
        rejectedManagerMe.status === 403 &&
          (rejectedManagerMe.code === "entitlement_rejected" ||
            rejectedManagerMe.code === "school_inactive"),
        `status=${rejectedManagerMe.status} code=${rejectedManagerMe.code}`
      );
    }
  } else {
    record("admin_reject_school", false, "no school row for reject flow");
  }

  const pendingTeachers = await api("GET", "/api/admin/teachers?status=pending", adminToken);
  record(
    "admin_pending_teachers_filter",
    pendingTeachers.status === 200 && Array.isArray(pendingTeachers.json?.data?.teachers),
    `count=${pendingTeachers.json?.data?.teachers?.length ?? "n/a"}`
  );

  const pendingSchools = await api("GET", "/api/admin/schools?status=pending", adminToken);
  record(
    "admin_pending_schools_filter",
    pendingSchools.status === 200 && Array.isArray(pendingSchools.json?.data?.schools),
    `count=${pendingSchools.json?.data?.schools?.length ?? "n/a"}`
  );

  const nonAdminLifecycle = await lifecycle(rejectToken, teacherUser.id, "reject", "private_teacher");
  record(
    "teacher_cannot_approve_reject_other_users",
    nonAdminLifecycle.status === 403,
    `status=${nonAdminLifecycle.status} code=${nonAdminLifecycle.code}`
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nRegistration request matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
