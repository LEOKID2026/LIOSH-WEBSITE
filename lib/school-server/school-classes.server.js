import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { countRowsByGroupColumn } from "./school-query-chunks.server.js";
import { loadSchoolScope } from "./school-scope.server.js";

export { loadSchoolClassInScope } from "./school-scope.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ teacherId?: string, subject?: string, gradeLevel?: string, isArchived?: boolean }} [filters]
 */
export async function listSchoolClasses(serviceRole, schoolId, filters = {}) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  if (scope.teacherIds.length === 0) {
    return { ok: true, classes: [] };
  }

  let query = serviceRole
    .from("teacher_classes")
    .select(
      "id, teacher_id, name, grade_level, subject_focus, color_hint, is_archived, archived_at, created_at, school_id"
    )
    .in("teacher_id", scope.teacherIds);

  if (filters.teacherId && isUuid(filters.teacherId)) {
    query = query.eq("teacher_id", filters.teacherId);
  }
  if (filters.subject) {
    query = query.eq("subject_focus", String(filters.subject).trim());
  }
  if (filters.gradeLevel) {
    query = query.eq("grade_level", String(filters.gradeLevel).trim());
  }
  if (filters.isArchived === true) {
    query = query.eq("is_archived", true);
  } else if (filters.isArchived === false) {
    query = query.eq("is_archived", false).is("archived_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teacherIds = [...new Set((data || []).map((c) => c.teacher_id))];
  const classIds = (data || []).map((c) => c.id);
  const profileMap = new Map();
  const memberCountMap = new Map();
  const activityCountMap = new Map();

  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    for (const p of profiles || []) {
      profileMap.set(p.id, p.display_name);
    }
  }

  if (classIds.length > 0) {
    const membersRes = await countRowsByGroupColumn(
      serviceRole,
      "teacher_class_students",
      "class_id",
      "class_id",
      classIds,
      (q) => q.is("removed_at", null)
    );
    if (!membersRes.ok) {
      if (isDbSchemaNotReadyError(membersRes.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const [classId, count] of membersRes.counts) {
      memberCountMap.set(classId, count);
    }

    const activitiesRes = await countRowsByGroupColumn(
      serviceRole,
      "classroom_activities",
      "class_id",
      "class_id",
      classIds,
      (q) => q.neq("status", "archived")
    );
    if (!activitiesRes.ok) {
      if (isDbSchemaNotReadyError(activitiesRes.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const [classId, count] of activitiesRes.counts) {
      activityCountMap.set(classId, count);
    }
  }

  return {
    ok: true,
    classes: (data || []).map((c) => ({
      classId: c.id,
      teacherId: c.teacher_id,
      teacherName: profileMap.get(c.teacher_id) || null,
      name: c.name,
      gradeLevel: c.grade_level,
      subjectFocus: c.subject_focus,
      isArchived: c.is_archived === true,
      createdAt: c.created_at,
      memberCount: memberCountMap.get(c.id) ?? 0,
      activityCount: activityCountMap.get(c.id) ?? 0,
    })),
  };
}
