import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolEnrolledStudents(serviceRole, schoolId) {
  const { data: enrollments, error } = await serviceRole
    .from("school_student_enrollments")
    .select("id, student_id, enrolled_at, enrolled_by, notes")
    .eq("school_id", schoolId)
    .is("unenrolled_at", null)
    .order("enrolled_at", { ascending: false });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const studentIds = (enrollments || []).map((e) => e.student_id);
  const studentMap = new Map();

  if (studentIds.length > 0) {
    const { data: students } = await serviceRole
      .from("students")
      .select("id, full_name, grade_level")
      .in("id", studentIds);

    for (const s of students || []) {
      studentMap.set(s.id, s);
    }
  }

  const rows = [];
  for (const e of enrollments || []) {
    const student = studentMap.get(e.student_id);
    const linkedTeachers = await loadLinkedSchoolTeachersForStudent(
      serviceRole,
      schoolId,
      e.student_id
    );

    rows.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      displayName: student?.full_name || null,
      gradeLevel: student?.grade_level || null,
      enrolledAt: e.enrolled_at,
      notes: e.notes,
      linkedTeachers: linkedTeachers.ok ? linkedTeachers.teachers : [],
    });
  }

  return { ok: true, students: rows };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
async function loadLinkedSchoolTeachersForStudent(serviceRole, schoolId, studentId) {
  const { data: memberships } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id")
    .eq("school_id", schoolId);

  const schoolTeacherIds = (memberships || []).map((m) => m.teacher_id);
  if (schoolTeacherIds.length === 0) {
    return { ok: true, teachers: [] };
  }

  const { data: links } = await serviceRole
    .from("teacher_students")
    .select("teacher_id, relationship")
    .eq("student_id", studentId)
    .in("teacher_id", schoolTeacherIds)
    .is("archived_at", null);

  const teacherIds = (links || []).map((l) => l.teacher_id);
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
    teachers: (links || []).map((l) => ({
      teacherId: l.teacher_id,
      displayName: profileMap.get(l.teacher_id) || null,
      relationship: l.relationship,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function verifyStudentEnrolledInSchool(serviceRole, schoolId, studentId) {
  const { data, error } = await serviceRole
    .from("school_student_enrollments")
    .select("id")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .is("unenrolled_at", null)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 403, code: "student_not_enrolled_in_school" };
  }

  return { ok: true, enrollmentId: data.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, studentId: string, enrolledBy: string, notes?: string|null }} input
 */
export async function enrollStudentInSchool(serviceRole, input) {
  if (!isUuid(input.studentId)) {
    return { ok: false, status: 400, code: "validation_failed", field: "studentId" };
  }

  const { data: student, error: studentErr } = await serviceRole
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .maybeSingle();

  if (studentErr || !student) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  const { data, error } = await serviceRole
    .from("school_student_enrollments")
    .insert({
      school_id: input.schoolId,
      student_id: input.studentId,
      enrolled_by: input.enrolledBy,
      notes: input.notes || null,
    })
    .select("id, enrolled_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, code: "student_already_enrolled" };
    }
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, enrollment: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function unenrollStudentFromSchool(serviceRole, schoolId, studentId) {
  const verified = await verifyStudentEnrolledInSchool(serviceRole, schoolId, studentId);
  if (!verified.ok) return verified;

  const { error } = await serviceRole
    .from("school_student_enrollments")
    .update({ unenrolled_at: new Date().toISOString() })
    .eq("id", verified.enrollmentId);

  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, studentId };
}
