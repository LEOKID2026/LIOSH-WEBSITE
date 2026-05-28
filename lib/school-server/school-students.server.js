import { deriveStudentLearningStatusLabelHe } from "../teacher-portal/student-learning-status.js";
import { buildLightweightStudentActivityMap } from "../teacher-server/teacher-dashboard-activity.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { countRowsByGroupColumn } from "./school-query-chunks.server.js";
import {
  loadSchoolScope,
  loadSchoolVisibleStudentIds,
  verifyStudentVisibleToSchool,
} from "./school-scope.server.js";

export { verifyStudentVisibleToSchool } from "./school-scope.server.js";

/** Same window as teacher dashboard roster badges (days). */
const SCHOOL_STUDENT_BROWSE_ACTIVITY_DAYS = 30;

/**
 * Lightweight 30-day rollups for school manager browse cards (no guidance engine).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Array<{ studentId: string }>} rows
 */
async function attachLearningStatusBadgesForBrowse(serviceRole, rows) {
  if (!rows.length) return rows;

  const studentIds = rows.map((r) => r.studentId).filter(Boolean);
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - SCHOOL_STUDENT_BROWSE_ACTIVITY_DAYS * 86_400_000);

  const activity = await buildLightweightStudentActivityMap({
    serviceRole,
    teacherId: null,
    studentIds,
    fromDate,
    toDate,
  });

  if (!activity.ok) {
    return rows;
  }

  return rows.map((row) => {
    const rollup = activity.byStudentId.get(row.studentId);
    const summary = {
      totalAnswers: rollup?.totalAnswers ?? 0,
      totalSessions: rollup?.totalSessions ?? 0,
      accuracy: rollup?.accuracy ?? null,
    };
    const learningStatusBadge = deriveStudentLearningStatusLabelHe(summary);
    return {
      ...row,
      learningStatusBadge:
        learningStatusBadge === "אין מספיק נתונים" ? null : learningStatusBadge,
    };
  });
}

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
 * Fast grade + physical-class browse index (no full student payloads).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function getSchoolStudentBrowseSummary(serviceRole, schoolId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

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

  const studentIds = [...new Set((enrollments || []).map((e) => e.student_id).filter(Boolean))];
  const gradeCounts = new Map();

  if (studentIds.length > 0) {
    const studentsRes = await selectInChunks(serviceRole, "students", "id, grade_level", "id", studentIds);
    if (!studentsRes.ok) {
      if (isDbSchemaNotReadyError(studentsRes.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const s of studentsRes.data) {
      const g = String(s.grade_level || "").trim();
      if (!g) continue;
      gradeCounts.set(g, (gradeCounts.get(g) || 0) + 1);
    }
  }

  const { data: schoolClasses, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("teacher_id", scope.teacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (classErr) {
    if (isDbSchemaNotReadyError(classErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classRows = schoolClasses || [];
  const classIds = classRows.map((c) => c.id);
  const memberCountMap = new Map();

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
  }

  /** @type {Map<string, { gradeLevel: string, name: string, studentCount: number }>} */
  const physicalMap = new Map();
  for (const c of classRows) {
    const gradeLevel = String(c.grade_level || "").trim();
    const name = String(c.name || "").trim();
    if (!gradeLevel || !name) continue;
    const key = `${gradeLevel}::${name}`;
    const memberCount = memberCountMap.get(c.id) ?? 0;
    const existing = physicalMap.get(key);
    if (!existing || memberCount > existing.studentCount) {
      physicalMap.set(key, { gradeLevel, name, studentCount: memberCount });
    }
  }

  /** @type {Record<string, Array<{ name: string, studentCount: number }>>} */
  const physicalClassesByGrade = {};
  for (const row of physicalMap.values()) {
    if (!physicalClassesByGrade[row.gradeLevel]) {
      physicalClassesByGrade[row.gradeLevel] = [];
    }
    physicalClassesByGrade[row.gradeLevel].push({
      name: row.name,
      studentCount: row.studentCount,
    });
  }

  for (const gradeLevel of Object.keys(physicalClassesByGrade)) {
    physicalClassesByGrade[gradeLevel].sort((a, b) => {
      const sectionA = parseInt(String(a.name).replace(/[^\d]/g, ""), 10) || 0;
      const sectionB = parseInt(String(b.name).replace(/[^\d]/g, ""), 10) || 0;
      return sectionA - sectionB || a.name.localeCompare(b.name, "he");
    });
  }

  const grades = [...gradeCounts.entries()]
    .map(([gradeLevel, studentCount]) => ({ gradeLevel, studentCount }))
    .sort((a, b) => Number(a.gradeLevel) - Number(b.gradeLevel));

  return {
    ok: true,
    totalStudents: studentIds.length,
    grades,
    physicalClassesByGrade,
  };
}

/**
 * Students for one physical class only (typically 20–24 rows).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ gradeLevel: string, physicalClassName: string }} filters
 */
export async function listSchoolStudentsInPhysicalClass(serviceRole, schoolId, filters) {
  const gradeLevel = String(filters.gradeLevel || "").trim();
  const physicalClassName = String(filters.physicalClassName || "").trim();
  if (!gradeLevel || !physicalClassName) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data: schoolClasses, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("school_id", schoolId)
    .in("teacher_id", scope.teacherIds)
    .eq("grade_level", gradeLevel)
    .eq("name", physicalClassName)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (classErr) {
    if (isDbSchemaNotReadyError(classErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classIds = (schoolClasses || []).map((c) => c.id);
  if (!classIds.length) {
    return { ok: true, students: [] };
  }

  const studentIdSet = new Set();
  for (const chunk of chunkIds(classIds, 40)) {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await serviceRole
        .from("teacher_class_students")
        .select("student_id")
        .in("class_id", chunk)
        .is("removed_at", null)
        .range(from, from + pageSize - 1);
      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }
      const rows = data || [];
      for (const row of rows) {
        if (row.student_id) studentIdSet.add(row.student_id);
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
  }

  const studentIds = [...studentIdSet];
  if (!studentIds.length) {
    return { ok: true, students: [] };
  }

  const studentsRes = await selectInChunks(serviceRole, "students", "id, full_name, grade_level", "id", studentIds);
  if (!studentsRes.ok) {
    if (isDbSchemaNotReadyError(studentsRes.error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rows = (studentsRes.data || [])
    .map((s) => ({
      studentId: s.id,
      displayName: s.full_name || null,
      gradeLevel: s.grade_level || gradeLevel,
      physicalClassName,
      isEnrolled: true,
      linkedTeachers: [],
    }))
    .sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || ""), "he"));

  const studentsWithStatus = await attachLearningStatusBadgesForBrowse(serviceRole, rows);

  return { ok: true, students: studentsWithStatus };
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
