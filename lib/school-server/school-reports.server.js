import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ teacherId?: string, classId?: string, subject?: string, status?: string, limit?: number }} [filters]
 */
export async function listSchoolActivities(serviceRole, schoolId, filters = {}) {
  let query = serviceRole
    .from("classroom_activities")
    .select(
      "id, teacher_id, class_id, title, subject, topic, status, mode, created_at, activated_at, closed_at"
    )
    .eq("school_id", schoolId);

  if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.subject) query = query.eq("subject", String(filters.subject).trim());
  if (filters.status) query = query.eq("status", String(filters.status).trim());

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, activities: data || [] };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} managerId
 * @param {string} schoolId
 * @param {string} classId
 */
export async function writeSchoolClassViewedAudit(serviceRole, managerId, schoolId, classId) {
  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    action: "school_class_viewed",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, class_id: classId },
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} managerId
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function writeSchoolStudentReportViewedAudit(
  serviceRole,
  managerId,
  schoolId,
  studentId
) {
  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: "school_student_report_viewed",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, student_id: studentId },
  });
}
