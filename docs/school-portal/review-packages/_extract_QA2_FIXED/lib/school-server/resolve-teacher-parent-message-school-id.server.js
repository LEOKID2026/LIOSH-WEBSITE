/**
 * Resolve school_id for teacher_parent_messages only when teacher membership
 * and student enrollment share exactly one school (same rules as migration 033).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 * @returns {Promise<string|null>}
 */
export async function resolveTeacherParentMessageSchoolId(serviceRole, teacherId, studentId) {
  const { data: memberships, error: memErr } = await serviceRole
    .from("school_teacher_memberships")
    .select("school_id")
    .eq("teacher_id", teacherId);

  if (memErr || !memberships?.length) {
    return null;
  }

  const teacherSchoolIds = new Set(memberships.map((m) => m.school_id));

  const { data: enrollments, error: enrErr } = await serviceRole
    .from("school_student_enrollments")
    .select("school_id")
    .eq("student_id", studentId)
    .is("unenrolled_at", null);

  if (enrErr || !enrollments?.length) {
    return null;
  }

  const matchingSchoolIds = enrollments
    .map((e) => e.school_id)
    .filter((id) => teacherSchoolIds.has(id));

  const unique = [...new Set(matchingSchoolIds)];
  if (unique.length !== 1) {
    return null;
  }

  return unique[0];
}
