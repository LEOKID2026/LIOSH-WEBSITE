import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { loadSchoolScope } from "./school-scope.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ teacherId?: string, classId?: string, subject?: string, status?: string, limit?: number }} [filters]
 */
export async function listSchoolActivities(serviceRole, schoolId, filters = {}) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  if (scope.teacherIds.length === 0) {
    return { ok: true, activities: [] };
  }

  let query = serviceRole
    .from("classroom_activities")
    .select(
      "id, teacher_id, class_id, title, subject, topic, status, mode, created_at, activated_at, closed_at"
    )
    .in("teacher_id", scope.teacherIds);

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

  const rows = data || [];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
  const classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  const teacherMap = new Map();
  const classMap = new Map();

  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    for (const p of profiles || []) {
      teacherMap.set(p.id, p.display_name);
    }
  }

  if (classIds.length > 0) {
    const { data: classes } = await serviceRole
      .from("teacher_classes")
      .select("id, name")
      .in("id", classIds);
    for (const c of classes || []) {
      classMap.set(c.id, c.name);
    }
  }

  return {
    ok: true,
    activities: rows.map((row) => ({
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: teacherMap.get(row.teacher_id) || null,
      classId: row.class_id,
      className: classMap.get(row.class_id) || null,
      title: row.title,
      subject: row.subject,
      topic: row.topic,
      status: row.status,
      mode: row.mode,
      createdAt: row.created_at,
      activatedAt: row.activated_at,
      closedAt: row.closed_at,
    })),
  };
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
