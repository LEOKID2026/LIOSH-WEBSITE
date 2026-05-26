import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  loadSchoolScope,
  loadSchoolVisibleStudentIds,
  verifyStudentVisibleToSchool,
} from "./school-scope.server.js";

export { verifyStudentVisibleToSchool } from "./school-scope.server.js";

/**
 * Lists all students visible to the school manager: enrollments plus students
 * linked through school teachers' classes or direct teacher_students links.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolEnrolledStudents(serviceRole, schoolId) {
  const visible = await loadSchoolVisibleStudentIds(serviceRole, schoolId);
  if (!visible.ok) return visible;

  const studentIds = visible.studentIds;
  if (studentIds.length === 0) {
    return { ok: true, students: [] };
  }

  const { data: enrollments, error: enrollErr } = await serviceRole
    .from("school_student_enrollments")
    .select("id, student_id, enrolled_at, enrolled_by, notes")
    .eq("school_id", schoolId)
    .in("student_id", studentIds)
    .is("unenrolled_at", null);

  if (enrollErr) {
    if (isDbSchemaNotReadyError(enrollErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const enrollmentByStudent = new Map();
  for (const e of enrollments || []) {
    enrollmentByStudent.set(e.student_id, e);
  }

  const { data: students, error: studentErr } = await serviceRole
    .from("students")
    .select("id, full_name, grade_level")
    .in("id", studentIds);

  if (studentErr) {
    if (isDbSchemaNotReadyError(studentErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const studentMap = new Map();
  for (const s of students || []) {
    studentMap.set(s.id, s);
  }

  const rows = [];
  for (const studentId of studentIds) {
    const student = studentMap.get(studentId);
    const e = enrollmentByStudent.get(studentId);
    const linkedTeachers = await loadLinkedSchoolTeachersForStudent(
      serviceRole,
      schoolId,
      studentId
    );

    rows.push({
      enrollmentId: e?.id || null,
      studentId,
      displayName: student?.full_name || null,
      gradeLevel: student?.grade_level || null,
      enrolledAt: e?.enrolled_at || null,
      notes: e?.notes || null,
      isEnrolled: Boolean(e),
      linkedTeachers: linkedTeachers.ok ? linkedTeachers.teachers : [],
    });
  }

  rows.sort((a, b) => {
    const aTime = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
    const bTime = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
    return bTime - aTime;
  });

  return { ok: true, students: rows };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
async function loadLinkedSchoolTeachersForStudent(serviceRole, schoolId, studentId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const schoolTeacherIds = scope.teacherIds;
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
