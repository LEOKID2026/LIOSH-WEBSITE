import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ teacherId?: string, subject?: string, gradeLevel?: string, isArchived?: boolean }} [filters]
 */
export async function listSchoolClasses(serviceRole, schoolId, filters = {}) {
  let query = serviceRole
    .from("teacher_classes")
    .select(
      "id, teacher_id, name, grade_level, subject_focus, color_hint, is_archived, archived_at, created_at, school_id"
    )
    .eq("school_id", schoolId);

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
  const profileMap = new Map();
  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    for (const p of profiles || []) {
      profileMap.set(p.id, p.display_name);
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
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} classId
 */
export async function loadSchoolClassInScope(serviceRole, schoolId, classId) {
  if (!isUuid(classId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, teacher_id, name, school_id, subject_focus, grade_level")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 403, code: "class_not_in_school" };
  }

  return { ok: true, classRow: data };
}
