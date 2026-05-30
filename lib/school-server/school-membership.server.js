import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";

/**
 * Sole source of truth for school membership on teacher-side APIs.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ preferredSchoolId?: string|null }} [options]
 */
export async function loadTeacherSchoolMembership(serviceRole, teacherId, options = {}) {
  const preferredSchoolId = options.preferredSchoolId;
  if (preferredSchoolId && isUuid(preferredSchoolId)) {
    const preferred = await serviceRole
      .from("school_teacher_memberships")
      .select("id, school_id, teacher_id, role, joined_at, subjects_locked")
      .eq("teacher_id", teacherId)
      .eq("school_id", preferredSchoolId)
      .maybeSingle();

    if (preferred.error) {
      if (isDbSchemaNotReadyError(preferred.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    if (preferred.data) {
      const data = preferred.data;
      return {
        ok: true,
        membership: {
          id: data.id,
          schoolId: data.school_id,
          teacherId: data.teacher_id,
          role: data.role,
          joinedAt: data.joined_at,
          subjectsLocked: data.subjects_locked === true,
          isSchoolManager: data.role === "school_admin",
        },
      };
    }
  }

  const { data, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, school_id, teacher_id, role, joined_at, subjects_locked")
    .eq("teacher_id", teacherId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: true, membership: null };
  }

  return {
    ok: true,
    membership: {
      id: data.id,
      schoolId: data.school_id,
      teacherId: data.teacher_id,
      role: data.role,
      joinedAt: data.joined_at,
      subjectsLocked: data.subjects_locked === true,
      isSchoolManager: data.role === "school_admin",
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function verifyTeacherMembershipInSchool(serviceRole, schoolId, teacherId) {
  if (!isUuid(schoolId) || !isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, school_id, teacher_id, role")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 403, code: "teacher_not_in_school" };
  }

  return {
    ok: true,
    membership: {
      schoolId: data.school_id,
      teacherId: data.teacher_id,
      role: data.role,
      isSchoolManager: data.role === "school_admin",
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function teacherHasActiveAssignments(serviceRole, teacherId) {
  const [studentsRes, classesRes] = await Promise.all([
    serviceRole
      .from("teacher_students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .is("archived_at", null),
    serviceRole
      .from("teacher_classes")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null),
  ]);

  const err = studentsRes.error || classesRes.error;
  if (err) {
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const activeStudentLinks = studentsRes.count ?? 0;
  const activeClasses = classesRes.count ?? 0;
  return {
    ok: true,
    hasTeacherActivity: activeStudentLinks > 0 || activeClasses > 0,
    activeStudentLinks,
    activeClasses,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function loadSchoolAccountRow(serviceRole, schoolId) {
  const { data, error } = await serviceRole
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

  if (!data) {
    return { ok: false, status: 404, code: "school_not_found" };
  }

  return { ok: true, school: data };
}
