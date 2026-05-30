import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

const DEFAULT_MAX_SCHOOL_TEACHERS = 20;
const DEFAULT_MAX_SCHOOL_MANAGERS = 1;
const DEFAULT_MAX_SCHOOL_STUDENTS = 500;
const DEFAULT_MAX_SCHOOL_OPERATORS = 5;

/**
 * @param {object|null|undefined} schoolRow
 */
export function resolveSchoolQuotaFields(schoolRow) {
  if (!schoolRow) {
    return {
      maxSchoolTeachers: DEFAULT_MAX_SCHOOL_TEACHERS,
      maxSchoolManagers: DEFAULT_MAX_SCHOOL_MANAGERS,
      maxSchoolStudents: DEFAULT_MAX_SCHOOL_STUDENTS,
      maxSchoolOperators: DEFAULT_MAX_SCHOOL_OPERATORS,
    };
  }

  return {
    maxSchoolTeachers: schoolRow.max_school_teachers ?? DEFAULT_MAX_SCHOOL_TEACHERS,
    maxSchoolManagers: schoolRow.max_school_managers ?? DEFAULT_MAX_SCHOOL_MANAGERS,
    maxSchoolStudents: schoolRow.max_school_students ?? DEFAULT_MAX_SCHOOL_STUDENTS,
    maxSchoolOperators: schoolRow.max_school_operators ?? DEFAULT_MAX_SCHOOL_OPERATORS,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function loadSchoolQuotas(serviceRole, schoolId) {
  const { data, error } = await serviceRole
    .from("school_accounts")
    .select(
      "id, max_school_teachers, max_school_managers, max_school_students, max_school_operators, is_active"
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

  return { ok: true, school: data, quotas: resolveSchoolQuotaFields(data) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function countSchoolTeachers(serviceRole, schoolId) {
  const { count, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "teacher");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function countSchoolManagers(serviceRole, schoolId) {
  const { count, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "school_admin");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function countSchoolOperators(serviceRole, schoolId) {
  const { count, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "school_operator");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function countSchoolStudents(serviceRole, schoolId) {
  const { count, error } = await serviceRole
    .from("school_student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .is("unenrolled_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {'teacher'|'manager'|'operator'|'student'} quotaType
 */
export async function assertSchoolQuotaAvailable(serviceRole, schoolId, quotaType) {
  const quotaLoad = await loadSchoolQuotas(serviceRole, schoolId);
  if (!quotaLoad.ok) return quotaLoad;

  const { quotas } = quotaLoad;

  if (quotaType === "teacher") {
    const counted = await countSchoolTeachers(serviceRole, schoolId);
    if (!counted.ok) return counted;
    if (counted.count >= quotas.maxSchoolTeachers) {
      return { ok: false, status: 400, code: "school_teacher_quota_exceeded" };
    }
  }

  if (quotaType === "manager") {
    const counted = await countSchoolManagers(serviceRole, schoolId);
    if (!counted.ok) return counted;
    if (counted.count >= quotas.maxSchoolManagers) {
      return { ok: false, status: 400, code: "school_manager_quota_exceeded" };
    }
  }

  if (quotaType === "operator") {
    const counted = await countSchoolOperators(serviceRole, schoolId);
    if (!counted.ok) return counted;
    if (counted.count >= quotas.maxSchoolOperators) {
      return { ok: false, status: 400, code: "school_operator_quota_exceeded" };
    }
  }

  if (quotaType === "student") {
    const counted = await countSchoolStudents(serviceRole, schoolId);
    if (!counted.ok) return counted;
    if (counted.count >= quotas.maxSchoolStudents) {
      return { ok: false, status: 400, code: "school_student_quota_exceeded" };
    }
  }

  return { ok: true, quotas };
}
