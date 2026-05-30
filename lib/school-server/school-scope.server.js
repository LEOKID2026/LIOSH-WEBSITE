import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { isSchoolClassRowInScope } from "./school-class-scope.server.js";
import { chunkIds } from "./school-query-chunks.server.js";
import { teacherHasReportAccessToStudent } from "../teacher-server/teacher-report.server.js";
import {
  memoSchoolServerQuery,
  SCHOOL_SERVER_CACHE_TTL_MS,
} from "./school-server-cache.server.js";

/**
 * School manager visibility is aggregated from school teacher memberships and
 * teacher-owned classes/students/activities — not enrollment-only.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function loadSchoolScope(serviceRole, schoolId) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  return memoSchoolServerQuery(`${schoolId}::scope`, SCHOOL_SERVER_CACHE_TTL_MS.scope, async () => {
    const { data: memberships, error } = await serviceRole
      .from("school_teacher_memberships")
      .select("teacher_id, role")
      .eq("school_id", schoolId);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const teacherIds = [...new Set((memberships || []).map((m) => m.teacher_id))];
    const teachingTeacherIds = (memberships || [])
      .filter((m) => m.role === "teacher")
      .map((m) => m.teacher_id);

    return {
      ok: true,
      schoolId,
      teacherIds,
      teachingTeacherIds,
      teacherCount: teachingTeacherIds.length,
      staffCount: teacherIds.length,
    };
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function loadSchoolVisibleStudentIds(serviceRole, schoolId) {
  return memoSchoolServerQuery(
    `${schoolId}::visible-students`,
    SCHOOL_SERVER_CACHE_TTL_MS.visibleStudents,
    () => loadSchoolVisibleStudentIdsUncached(serviceRole, schoolId)
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
async function loadSchoolVisibleStudentIdsUncached(serviceRole, schoolId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const studentIds = new Set();

  const { data: enrollments, error: enrollErr } = await serviceRole
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .is("unenrolled_at", null);

  if (enrollErr) {
    if (isDbSchemaNotReadyError(enrollErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  for (const row of enrollments || []) {
    if (row.student_id) studentIds.add(row.student_id);
  }

  if (scope.teacherIds.length === 0) {
    return { ok: true, studentIds: [...studentIds], enrolledOnlyIds: new Set(enrollments?.map((e) => e.student_id) || []) };
  }

  const { data: classes, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .in("teacher_id", scope.teacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (classErr) {
    if (isDbSchemaNotReadyError(classErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classIds = (classes || []).map((c) => c.id);
  if (classIds.length > 0) {
    for (const idChunk of chunkIds(classIds, 40)) {
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: classMembers, error: memErr } = await serviceRole
          .from("teacher_class_students")
          .select("student_id")
          .in("class_id", idChunk)
          .is("removed_at", null)
          .range(from, from + pageSize - 1);

        if (memErr) {
          if (isDbSchemaNotReadyError(memErr)) {
            return { ok: false, status: 503, code: "db_schema_not_ready" };
          }
          return { ok: false, status: 500, code: "internal_error" };
        }

        const rows = classMembers || [];
        for (const row of rows) {
          if (row.student_id) studentIds.add(row.student_id);
        }
        if (rows.length < pageSize) break;
        from += pageSize;
      }
    }
  }

  const { data: directLinks, error: linkErr } = await serviceRole
    .from("teacher_students")
    .select("student_id")
    .in("teacher_id", scope.teacherIds)
    .is("archived_at", null);

  if (linkErr) {
    if (isDbSchemaNotReadyError(linkErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  for (const row of directLinks || []) {
    if (row.student_id) studentIds.add(row.student_id);
  }

  const enrolledOnlyIds = new Set((enrollments || []).map((e) => e.student_id).filter(Boolean));

  return {
    ok: true,
    studentIds: [...studentIds],
    studentIdSet: studentIds,
    enrolledOnlyIds,
    scope,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function verifyStudentVisibleToSchool(serviceRole, schoolId, studentId) {
  if (!isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const visible = await loadSchoolVisibleStudentIds(serviceRole, schoolId);
  if (!visible.ok) return visible;

  if (!visible.studentIdSet.has(studentId)) {
    return { ok: false, status: 403, code: "student_not_visible_in_school" };
  }

  return {
    ok: true,
    isEnrolled: visible.enrolledOnlyIds.has(studentId),
  };
}

/**
 * Pick a school teacher who can access the student report (not the manager id).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 * @param {{ classId?: string|null }} [options]
 */
export async function resolveSchoolReportTeacherForStudent(serviceRole, schoolId, studentId, options = {}) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, studentId);
  if (!visible.ok) return visible;

  const classId = options.classId || null;
  if (classId) {
    const inScope = await loadSchoolClassInScope(serviceRole, schoolId, classId);
    if (inScope.ok) {
      const access = await teacherHasReportAccessToStudent(
        serviceRole,
        inScope.classRow.teacher_id,
        studentId
      );
      if (access.ok && access.allowed) {
        return { ok: true, teacherId: inScope.classRow.teacher_id };
      }
    }
  }

  for (const teacherId of scope.teacherIds) {
    const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
    if (access.ok && access.allowed) {
      return { ok: true, teacherId };
    }
  }

  return { ok: false, status: 403, code: "student_not_linked_to_school_teacher" };
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

  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, teacher_id, name, school_id, subject_focus, grade_level, is_archived")
    .eq("id", classId)
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

  if (!isSchoolClassRowInScope(data, schoolId, scope.teacherIds)) {
    return { ok: false, status: 403, code: "class_not_in_school" };
  }

  return { ok: true, classRow: data };
}
