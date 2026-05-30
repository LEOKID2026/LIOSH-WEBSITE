import { writeAdminAuditRow } from "./admin-audit.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { assertSchoolQuotaAvailable } from "../school-server/school-quota.server.js";
import { upsertActiveEntitlement } from "../auth/persona-entitlement.server.js";

function formatSchoolRow(row, counts = {}) {
  return {
    schoolId: row.id,
    name: row.name,
    countryCode: row.country_code,
    contactEmail: row.contact_email,
    city: row.city,
    maxTeachers: row.max_teachers,
    maxSchoolTeachers: row.max_school_teachers,
    maxSchoolManagers: row.max_school_managers,
    maxSchoolStudents: row.max_school_students,
    maxSchoolOperators: row.max_school_operators,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teacherCount: counts.teacherCount ?? 0,
    enrolledStudentCount: counts.enrolledStudentCount ?? 0,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ statusFilter?: string|null }} [options]
 */
export async function listAdminSchools(serviceRole, options = {}) {
  const statusFilter =
    typeof options.statusFilter === "string" ? options.statusFilter.trim().toLowerCase() : null;

  const { data: schools, error } = await serviceRole
    .from("school_accounts")
    .select(
      "id, name, country_code, contact_email, city, max_teachers, max_school_teachers, max_school_managers, max_school_students, max_school_operators, is_active, created_at, updated_at"
    )
    .order("name", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rows = (schools || []).filter((row) => {
    if (statusFilter === "pending") return row.is_active === false;
    return true;
  });
  const schoolIds = rows.map((s) => s.id);
  const teacherCountMap = new Map();
  const studentCountMap = new Map();

  if (schoolIds.length > 0) {
    const [membersRes, enrollRes] = await Promise.all([
      serviceRole.from("school_teacher_memberships").select("school_id").in("school_id", schoolIds),
      serviceRole
        .from("school_student_enrollments")
        .select("school_id")
        .in("school_id", schoolIds)
        .is("unenrolled_at", null),
    ]);

    if (membersRes.error || enrollRes.error) {
      const err = membersRes.error || enrollRes.error;
      if (isDbSchemaNotReadyError(err)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const m of membersRes.data || []) {
      teacherCountMap.set(m.school_id, (teacherCountMap.get(m.school_id) || 0) + 1);
    }
    for (const e of enrollRes.data || []) {
      studentCountMap.set(e.school_id, (studentCountMap.get(e.school_id) || 0) + 1);
    }
  }

  return {
    ok: true,
    schools: rows.map((row) =>
      formatSchoolRow(row, {
        teacherCount: teacherCountMap.get(row.id) || 0,
        enrolledStudentCount: studentCountMap.get(row.id) || 0,
      })
    ),
  };
}

/**
 * @param {unknown} body
 */
export function parseCreateSchoolBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 120) {
    return { ok: false, code: "validation_failed", field: "name" };
  }

  let contactEmail = b.contactEmail;
  if (contactEmail != null) {
    if (typeof contactEmail !== "string") {
      return { ok: false, code: "validation_failed", field: "contactEmail" };
    }
    contactEmail = contactEmail.trim() || null;
  } else {
    contactEmail = null;
  }

  let city = b.city;
  if (city != null) {
    if (typeof city !== "string") return { ok: false, code: "validation_failed", field: "city" };
    city = city.trim() || null;
    if (city && city.length > 100) return { ok: false, code: "validation_failed", field: "city" };
  } else {
    city = null;
  }

  let countryCode = b.countryCode;
  if (countryCode != null) {
    if (typeof countryCode !== "string") {
      return { ok: false, code: "validation_failed", field: "countryCode" };
    }
    countryCode = countryCode.trim() || null;
  } else {
    countryCode = null;
  }

  let maxTeachers = b.maxTeachers;
  if (maxTeachers != null) {
    const n = Number(maxTeachers);
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, code: "validation_failed", field: "maxTeachers" };
    }
    maxTeachers = n;
  } else {
    maxTeachers = null;
  }

  return { ok: true, payload: { name, contactEmail, city, countryCode, maxTeachers } };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} payload
 */
export async function createSchoolAccount(serviceRole, payload) {
  const { data, error } = await serviceRole
    .from("school_accounts")
    .insert({
      name: payload.name,
      contact_email: payload.contactEmail,
      city: payload.city,
      country_code: payload.countryCode,
      max_teachers: payload.maxTeachers,
      is_active: true,
    })
    .select(
      "id, name, country_code, contact_email, city, max_teachers, max_school_teachers, max_school_managers, max_school_students, max_school_operators, is_active, created_at, updated_at"
    )
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, school: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function getAdminSchoolDetail(serviceRole, schoolId) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: school, error } = await serviceRole
    .from("school_accounts")
    .select(
      "id, name, country_code, contact_email, city, max_teachers, max_school_teachers, max_school_managers, max_school_students, max_school_operators, is_active, created_at, updated_at"
    )
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!school) {
    return { ok: false, status: 404, code: "school_not_found" };
  }

  const { data: memberships, error: memErr } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, school_id, teacher_id, role, joined_at, subjects_locked")
    .eq("school_id", schoolId)
    .order("joined_at", { ascending: true });

  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teacherIds = (memberships || []).map((m) => m.teacher_id);
  const profileMap = new Map();
  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name, is_active")
      .in("id", teacherIds);
    for (const p of profiles || []) {
      profileMap.set(p.id, p);
    }
  }

  const { count: enrolledCount, error: enrollErr } = await serviceRole
    .from("school_student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .is("unenrolled_at", null);

  if (enrollErr) {
    if (isDbSchemaNotReadyError(enrollErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teachers = (memberships || []).map((m) => {
    const profile = profileMap.get(m.teacher_id);
    return {
      membershipId: m.id,
      teacherId: m.teacher_id,
      role: m.role,
      joinedAt: m.joined_at,
      subjectsLocked: m.subjects_locked === true,
      displayName: profile?.display_name || null,
      isActive: profile?.is_active !== false,
    };
  });

  let registrationRequest = null;
  const { data: regRow, error: regErr } = await serviceRole
    .from("school_registration_requests")
    .select(
      "status, contact_name, contact_email, contact_phone, approx_teachers, approx_students, message, password_setup_sent_at, password_setup_last_error, created_at, updated_at, contact_user_id"
    )
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!regErr && regRow) {
    registrationRequest = {
      status: regRow.status,
      contactName: regRow.contact_name,
      contactEmail: regRow.contact_email,
      contactPhone: regRow.contact_phone || null,
      approxTeachers: regRow.approx_teachers,
      approxStudents: regRow.approx_students,
      message: regRow.message,
      passwordSetupSentAt: regRow.password_setup_sent_at || null,
      passwordSetupLastError: regRow.password_setup_last_error || null,
      contactUserId: regRow.contact_user_id,
      createdAt: regRow.created_at,
      updatedAt: regRow.updated_at,
    };
  }

  return {
    ok: true,
    school: formatSchoolRow(school, {
      teacherCount: teachers.length,
      enrolledStudentCount: enrolledCount ?? 0,
    }),
    teachers,
    registrationRequest,
  };
}

/**
 * @param {unknown} body
 */
export function parseUpdateSchoolBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(b, "name")) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 120) return { ok: false, code: "validation_failed", field: "name" };
    patch.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(b, "contactEmail")) {
    if (b.contactEmail != null && typeof b.contactEmail !== "string") {
      return { ok: false, code: "validation_failed", field: "contactEmail" };
    }
    patch.contact_email = b.contactEmail == null ? null : String(b.contactEmail).trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(b, "city")) {
    if (b.city != null && typeof b.city !== "string") {
      return { ok: false, code: "validation_failed", field: "city" };
    }
    const city = b.city == null ? null : String(b.city).trim() || null;
    if (city && city.length > 100) return { ok: false, code: "validation_failed", field: "city" };
    patch.city = city;
  }
  if (Object.prototype.hasOwnProperty.call(b, "countryCode")) {
    if (b.countryCode != null && typeof b.countryCode !== "string") {
      return { ok: false, code: "validation_failed", field: "countryCode" };
    }
    patch.country_code = b.countryCode == null ? null : String(b.countryCode).trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(b, "maxTeachers")) {
    if (b.maxTeachers == null) {
      patch.max_teachers = null;
    } else {
      const n = Number(b.maxTeachers);
      if (!Number.isInteger(n) || n < 1) {
        return { ok: false, code: "validation_failed", field: "maxTeachers" };
      }
      patch.max_teachers = n;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, "maxSchoolTeachers")) {
    if (b.maxSchoolTeachers == null) {
      patch.max_school_teachers = null;
    } else {
      const n = Number(b.maxSchoolTeachers);
      if (!Number.isInteger(n) || n < 1) {
        return { ok: false, code: "validation_failed", field: "maxSchoolTeachers" };
      }
      patch.max_school_teachers = n;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, "maxSchoolManagers")) {
    if (b.maxSchoolManagers == null) {
      patch.max_school_managers = null;
    } else {
      const n = Number(b.maxSchoolManagers);
      if (!Number.isInteger(n) || n < 1) {
        return { ok: false, code: "validation_failed", field: "maxSchoolManagers" };
      }
      patch.max_school_managers = n;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, "maxSchoolStudents")) {
    if (b.maxSchoolStudents == null) {
      patch.max_school_students = null;
    } else {
      const n = Number(b.maxSchoolStudents);
      if (!Number.isInteger(n) || n < 1) {
        return { ok: false, code: "validation_failed", field: "maxSchoolStudents" };
      }
      patch.max_school_students = n;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, "maxSchoolOperators")) {
    if (b.maxSchoolOperators == null) {
      patch.max_school_operators = null;
    } else {
      const n = Number(b.maxSchoolOperators);
      if (!Number.isInteger(n) || n < 1) {
        return { ok: false, code: "validation_failed", field: "maxSchoolOperators" };
      }
      patch.max_school_operators = n;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, "isActive")) {
    patch.is_active = b.isActive === true;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "validation_failed", field: "body" };
  }

  patch.updated_at = new Date().toISOString();
  return { ok: true, patch };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
async function findTeacherOtherSchoolMembership(serviceRole, teacherId, excludeSchoolId) {
  const { data, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("school_id")
    .eq("teacher_id", teacherId)
    .neq("school_id", excludeSchoolId)
    .limit(1);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, otherSchoolId: data?.[0]?.school_id || null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function assignTeacherToSchool(serviceRole, schoolId, teacherId, options = {}) {
  if (!isUuid(schoolId) || !isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const force = options.force === true;

  const { data: profile, error: profileErr } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, school_id")
    .eq("id", teacherId)
    .maybeSingle();

  if (profileErr) {
    if (isDbSchemaNotReadyError(profileErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!profile) {
    return { ok: false, status: 404, code: "teacher_not_found" };
  }

  const other = await findTeacherOtherSchoolMembership(serviceRole, teacherId, schoolId);
  if (!other.ok) return other;

  const { data: existingHere } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, role")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (other.otherSchoolId && !force && !existingHere) {
    return { ok: false, status: 409, code: "teacher_already_in_school" };
  }

  if (other.otherSchoolId && force) {
    await serviceRole
      .from("school_teacher_memberships")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("school_id", other.otherSchoolId);
  }

  if (existingHere) {
    const { error: updErr } = await serviceRole
      .from("school_teacher_memberships")
      .update({ role: "teacher" })
      .eq("id", existingHere.id);
    if (updErr) {
      return { ok: false, status: 500, code: "internal_error" };
    }
  } else {
    const quotaCheck = await assertSchoolQuotaAvailable(serviceRole, schoolId, "teacher");
    if (!quotaCheck.ok) return quotaCheck;

    const { error: insErr } = await serviceRole.from("school_teacher_memberships").insert({
      school_id: schoolId,
      teacher_id: teacherId,
      role: "teacher",
    });
    if (insErr) {
      if (isDbSchemaNotReadyError(insErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  await serviceRole
    .from("teacher_profiles")
    .update({ school_id: schoolId, updated_at: new Date().toISOString() })
    .eq("id", teacherId);

  await serviceRole
    .from("teacher_classes")
    .update({ school_id: schoolId })
    .eq("teacher_id", teacherId)
    .is("school_id", null);

  await serviceRole
    .from("classroom_activities")
    .update({ school_id: schoolId })
    .eq("teacher_id", teacherId)
    .is("school_id", null);

  await serviceRole
    .from("student_activities")
    .update({ school_id: schoolId })
    .eq("teacher_id", teacherId)
    .is("school_id", null);

  await upsertActiveEntitlement(serviceRole, teacherId, "school_teacher", {
    approvalSource: options.approvalSource === "school_admin" ? "school_admin" : "admin",
  });

  return { ok: true, teacherId, schoolId, beforeProfile: profile };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function assignSchoolManager(serviceRole, schoolId, teacherId) {
  const { data: existingManager } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("role", "school_admin")
    .maybeSingle();

  if (!existingManager || existingManager.teacher_id !== teacherId) {
    const quotaCheck = await assertSchoolQuotaAvailable(serviceRole, schoolId, "manager");
    if (!quotaCheck.ok) return quotaCheck;
  }

  const assigned = await assignTeacherToSchool(serviceRole, schoolId, teacherId, { force: true });
  if (!assigned.ok) return assigned;

  const { error } = await serviceRole
    .from("school_teacher_memberships")
    .update({ role: "school_admin" })
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await upsertActiveEntitlement(serviceRole, teacherId, "school_manager", {
    approvalSource: "admin",
  });

  return { ok: true, teacherId, schoolId, beforeProfile: assigned.beforeProfile };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function removeTeacherFromSchool(serviceRole, schoolId, teacherId) {
  if (!isUuid(schoolId) || !isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: membership, error: memErr } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, role")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!membership) {
    return { ok: false, status: 404, code: "teacher_not_in_school" };
  }

  await serviceRole
    .from("school_teacher_subjects")
    .delete()
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  const { error: delErr } = await serviceRole
    .from("school_teacher_memberships")
    .delete()
    .eq("id", membership.id);

  if (delErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await serviceRole
    .from("teacher_profiles")
    .update({ school_id: null, updated_at: new Date().toISOString() })
    .eq("id", teacherId);

  return { ok: true, membership, teacherId, schoolId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ limit?: number }} [opts]
 */
export async function listAdminAuditForSchool(serviceRole, schoolId, opts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const { data, error } = await serviceRole
    .from("admin_audit_log")
    .select("id, admin_user_id, target_type, target_id, action, before_state, after_state, notes, created_at")
    .eq("target_type", "school")
    .eq("target_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, entries: data || [] };
}

export { writeAdminAuditRow };
