import { countRowsByGroupColumn, chunkIds } from "../school-server/school-query-chunks.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { groupTeacherClassesForDashboard } from "../teacher-portal/teacher-physical-class.js";
import { teacherStudentDisplayName } from "./teacher-students.server.js";

/**
 * Paginated teacher_class_students links for many class ids.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 */
export async function loadTeacherClassMembershipRows(serviceRole, classIds) {
  /** @type {Array<{ student_id: string, class_id: string }>} */
  const rows = [];
  if (!classIds.length) return { ok: true, rows };

  const pageSize = 1000;
  for (const chunk of chunkIds(classIds, 40)) {
    let from = 0;
    while (true) {
      const { data, error } = await serviceRole
        .from("teacher_class_students")
        .select("student_id, class_id")
        .in("class_id", chunk)
        .is("removed_at", null)
        .range(from, from + pageSize - 1);

      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      const page = data || [];
      rows.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
  }

  return { ok: true, rows };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 */
export async function loadPerClassMemberAndActivityCounts(serviceRole, classIds) {
  const memberCountMap = new Map();
  const activityCountMap = new Map();

  if (!classIds.length) {
    return { ok: true, memberCountMap, activityCountMap };
  }

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

  return { ok: true, memberCountMap, activityCountMap };
}

/**
 * @param {Array<{
 *   classId: string,
 *   name: string,
 *   gradeLevel?: string|null,
 *   subjectFocus?: string|null,
 *   schoolId?: string|null,
 * }>} classes
 * @param {Array<{ student_id: string, class_id: string }>} membershipRows
 * @param {Map<string, number>} [activityCountMap]
 */
export function buildGroupedTeacherDashboardClasses(classes, membershipRows, activityCountMap) {
  const enriched = (classes || []).map((c) => ({
    ...c,
    activityCount: activityCountMap?.get(c.classId) ?? c.activityCount ?? 0,
  }));

  return groupTeacherClassesForDashboard(enriched, membershipRows);
}

/**
 * Students linked only via teacher_class_students (school-managed teachers).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Array<{ student_id: string, class_id: string }>} membershipRows
 */
export async function loadStudentsByMembershipRows(serviceRole, membershipRows) {
  const studentIds = [
    ...new Set((membershipRows || []).map((r) => r.student_id).filter(Boolean)),
  ];
  if (!studentIds.length) {
    return { ok: true, students: [] };
  }

  /** @type {Map<string, { full_name?: string|null, grade_level?: string|null }>} */
  const byId = new Map();

  for (const chunk of chunkIds(studentIds, 100)) {
    const { data, error } = await serviceRole
      .from("students")
      .select("id, full_name, grade_level")
      .in("id", chunk);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const row of data || []) {
      if (row?.id) byId.set(row.id, row);
    }
  }

  const students = studentIds.map((studentId) => {
    const row = byId.get(studentId);
    const fullName = row?.full_name || "";
    return {
      linkId: null,
      studentId,
      studentFullName: fullName,
      studentFullNameMasked: teacherStudentDisplayName(fullName),
      gradeLevel: row?.grade_level ?? null,
      relationship: null,
      linkedAt: null,
      archivedAt: null,
      guardianAccessSummary: { active: 0, revoked: 0, expired: 0 },
    };
  });

  return { ok: true, students };
}

/**
 * Direct teacher_students links win; class-roster students fill gaps (school teachers).
 *
 * @param {Array<Record<string, unknown>>} directStudents
 * @param {Array<Record<string, unknown>>} classMembershipStudents
 */
export function mergeDirectAndClassMembershipStudents(directStudents, classMembershipStudents) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();
  for (const s of directStudents || []) {
    if (s?.studentId) byId.set(String(s.studentId), s);
  }
  for (const s of classMembershipStudents || []) {
    const id = s?.studentId ? String(s.studentId) : "";
    if (!id || byId.has(id)) continue;
    byId.set(id, s);
  }
  return [...byId.values()];
}
