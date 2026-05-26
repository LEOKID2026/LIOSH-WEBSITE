import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  loadSchoolScope,
  loadSchoolVisibleStudentIds,
  verifyStudentVisibleToSchool,
} from "./school-scope.server.js";

export { verifyStudentVisibleToSchool } from "./school-scope.server.js";

function chunkIds(ids, size = 80) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function selectInChunks(serviceRole, table, columns, idColumn, ids) {
  const rows = [];
  for (const chunk of chunkIds(ids)) {
    const { data, error } = await serviceRole.from(table).select(columns).in(idColumn, chunk);
    if (error) return { ok: false, error };
    rows.push(...(data || []));
  }
  return { ok: true, data: rows };
}

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

  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const enrollmentByStudent = new Map();
  for (const chunk of chunkIds(studentIds)) {
    const { data, error: enrollErr } = await serviceRole
      .from("school_student_enrollments")
      .select("id, student_id, enrolled_at, enrolled_by, notes")
      .eq("school_id", schoolId)
      .in("student_id", chunk)
      .is("unenrolled_at", null);

    if (enrollErr) {
      if (isDbSchemaNotReadyError(enrollErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const e of data || []) {
      enrollmentByStudent.set(e.student_id, e);
    }
  }

  const studentsRes = await selectInChunks(serviceRole, "students", "id, full_name, grade_level", "id", studentIds);
  if (!studentsRes.ok) {
    if (isDbSchemaNotReadyError(studentsRes.error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const studentMap = new Map();
  for (const s of studentsRes.data) {
    studentMap.set(s.id, s);
  }

  const linkedTeachersByStudent = await buildLinkedTeachersByStudent(
    serviceRole,
    schoolId,
    studentIds,
    scope.teacherIds
  );

  const physicalClassByStudent = await buildPhysicalClassByStudent(
    serviceRole,
    schoolId,
    studentIds,
    scope.teacherIds
  );

  const rows = [];
  for (const studentId of studentIds) {
    const student = studentMap.get(studentId);
    const e = enrollmentByStudent.get(studentId);
    const physical = physicalClassByStudent.get(studentId);

    rows.push({
      enrollmentId: e?.id || null,
      studentId,
      displayName: student?.full_name || null,
      gradeLevel: student?.grade_level || null,
      physicalClassName: physical?.name || null,
      enrolledAt: e?.enrolled_at || null,
      notes: e?.notes || null,
      isEnrolled: Boolean(e),
      linkedTeachers: linkedTeachersByStudent.get(studentId) || [],
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
async function buildLinkedTeachersByStudent(serviceRole, schoolId, studentIds, schoolTeacherIds) {
  const byStudent = new Map();
  for (const id of studentIds) {
    byStudent.set(id, []);
  }

  if (schoolTeacherIds.length === 0) {
    return byStudent;
  }

  const profileMap = new Map();
  const { data: profiles } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name")
    .in("id", schoolTeacherIds);
  for (const p of profiles || []) {
    profileMap.set(p.id, p.display_name);
  }

  const addTeacher = (studentId, teacherId, relationship = "class_teacher") => {
    const list = byStudent.get(studentId);
    if (!list) return;
    if (list.some((t) => t.teacherId === teacherId)) return;
    list.push({
      teacherId,
      displayName: profileMap.get(teacherId) || null,
      relationship,
    });
  };

  for (const chunk of chunkIds(studentIds)) {
    const { data: directLinks } = await serviceRole
      .from("teacher_students")
      .select("teacher_id, student_id, relationship")
      .in("student_id", chunk)
      .in("teacher_id", schoolTeacherIds)
      .is("archived_at", null);

    for (const link of directLinks || []) {
      addTeacher(link.student_id, link.teacher_id, link.relationship);
    }
  }

  const { data: schoolClasses } = await serviceRole
    .from("teacher_classes")
    .select("id, teacher_id")
    .eq("school_id", schoolId)
    .in("teacher_id", schoolTeacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  const classIds = (schoolClasses || []).map((c) => c.id);
  const classTeacher = new Map((schoolClasses || []).map((c) => [c.id, c.teacher_id]));

  for (const chunk of chunkIds(classIds, 40)) {
    const { data: members } = await serviceRole
      .from("teacher_class_students")
      .select("class_id, student_id")
      .in("class_id", chunk)
      .in("student_id", studentIds)
      .is("removed_at", null);

    for (const m of members || []) {
      const teacherId = classTeacher.get(m.class_id);
      if (teacherId) addTeacher(m.student_id, teacherId, "class_teacher");
    }
  }

  return byStudent;
}

/**
 * Resolve each student's physical homeroom class name from class roster membership.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string[]} studentIds
 * @param {string[]} schoolTeacherIds
 */
async function buildPhysicalClassByStudent(serviceRole, schoolId, studentIds, schoolTeacherIds) {
  /** @type {Map<string, { name: string }>} */
  const byStudent = new Map();
  if (!studentIds.length || !schoolTeacherIds.length) return byStudent;

  const { data: schoolClasses } = await serviceRole
    .from("teacher_classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("teacher_id", schoolTeacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  const classIds = (schoolClasses || []).map((c) => c.id);
  const classMeta = new Map((schoolClasses || []).map((c) => [c.id, c]));
  if (!classIds.length) return byStudent;

  for (const chunk of chunkIds(studentIds)) {
    const { data: members } = await serviceRole
      .from("teacher_class_students")
      .select("class_id, student_id")
      .in("student_id", chunk)
      .in("class_id", classIds)
      .is("removed_at", null);

    for (const m of members || []) {
      if (byStudent.has(m.student_id)) continue;
      const meta = classMeta.get(m.class_id);
      if (meta?.name) {
        byStudent.set(m.student_id, { name: meta.name, gradeLevel: meta.grade_level });
      }
    }
  }

  return byStudent;
}

async function loadLinkedSchoolTeachersForStudent(serviceRole, schoolId, studentId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const schoolTeacherIds = scope.teacherIds;
  if (schoolTeacherIds.length === 0) {
    return { ok: true, teachers: [] };
  }

  const byStudent = await buildLinkedTeachersByStudent(serviceRole, schoolId, [studentId], schoolTeacherIds);
  return { ok: true, teachers: byStudent.get(studentId) || [] };
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
