import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { assignTeacherToSchool } from "../admin-server/admin-schools.server.js";
import { listSchoolTeacherSubjects } from "./school-subjects.server.js";
import { verifyTeacherMembershipInSchool } from "./school-membership.server.js";
import { chunkIds } from "./school-query-chunks.server.js";
import { loadStaffAccessMapForUsers } from "./school-staff-management.server.js";

/** School portal teacher list — managers and teachers only (not operators). */
const SCHOOL_TEACHING_ROLES = ["teacher", "school_admin"];

/**
 * Batch unique active students per teacher via direct links + class roster membership.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} teacherIds
 * @returns {Promise<Map<string, number>>}
 */
async function batchCountUniqueLinkedStudents(serviceRole, teacherIds) {
  /** @type {Map<string, Set<string>>} */
  const byTeacher = new Map();
  for (const teacherId of teacherIds) {
    byTeacher.set(teacherId, new Set());
  }
  if (!teacherIds.length) return new Map();

  const { data: directLinks } = await serviceRole
    .from("teacher_students")
    .select("teacher_id, student_id")
    .in("teacher_id", teacherIds)
    .is("archived_at", null);

  for (const row of directLinks || []) {
    if (row.teacher_id && row.student_id) {
      byTeacher.get(row.teacher_id)?.add(row.student_id);
    }
  }

  const { data: classRows } = await serviceRole
    .from("teacher_classes")
    .select("id, teacher_id")
    .in("teacher_id", teacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  const classToTeacher = new Map((classRows || []).map((row) => [row.id, row.teacher_id]));
  const classIds = [...classToTeacher.keys()];

  if (classIds.length) {
    for (const idChunk of chunkIds(classIds, 40)) {
      const { data: members } = await serviceRole
        .from("teacher_class_students")
        .select("class_id, student_id")
        .in("class_id", idChunk)
        .is("removed_at", null);

      for (const row of members || []) {
        const teacherId = classToTeacher.get(row.class_id);
        if (teacherId && row.student_id) {
          byTeacher.get(teacherId)?.add(row.student_id);
        }
      }
    }
  }

  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const [teacherId, ids] of byTeacher) {
    counts.set(teacherId, ids.size);
  }
  return counts;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
async function countUniqueLinkedStudents(serviceRole, teacherId) {
  const counts = await batchCountUniqueLinkedStudents(serviceRole, [teacherId]);
  return counts.get(teacherId) ?? 0;
}
/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolTeachers(serviceRole, schoolId) {
  const { data: memberships, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, teacher_id, role, joined_at")
    .eq("school_id", schoolId)
    .in("role", SCHOOL_TEACHING_ROLES)
    .order("joined_at", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teacherIds = (memberships || []).map((m) => m.teacher_id);
  const profileMap = new Map();
  const subjectMap = new Map();
  const classCountMap = new Map();
  const studentLinkCountMap = new Map();

  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name, is_active")
      .in("id", teacherIds);

    for (const p of profiles || []) {
      profileMap.set(p.id, p);
    }

    const { data: subjects } = await serviceRole
      .from("school_teacher_subjects")
      .select("teacher_id, subject")
      .eq("school_id", schoolId)
      .in("teacher_id", teacherIds);

    for (const s of subjects || []) {
      if (!subjectMap.has(s.teacher_id)) subjectMap.set(s.teacher_id, []);
      const list = subjectMap.get(s.teacher_id);
      if (!list.includes(s.subject)) list.push(s.subject);
    }

    const { data: classRows } = await serviceRole
      .from("teacher_classes")
      .select("teacher_id")
      .eq("is_archived", false)
      .is("archived_at", null)
      .in("teacher_id", teacherIds);

    for (const row of classRows || []) {
      classCountMap.set(row.teacher_id, (classCountMap.get(row.teacher_id) || 0) + 1);
    }

    const studentLinkCounts = await batchCountUniqueLinkedStudents(serviceRole, teacherIds);
    for (const teacherId of teacherIds) {
      studentLinkCountMap.set(teacherId, studentLinkCounts.get(teacherId) ?? 0);
    }
  }

  const staffAccessMap = await loadStaffAccessMapForUsers(serviceRole, schoolId, teacherIds);

  return {
    ok: true,
    teachers: (memberships || []).map((m) => {
      const staffAccess = staffAccessMap.get(m.teacher_id);
      let staffAccessStatus = null;
      if (staffAccess) {
        staffAccessStatus = staffAccess.is_active ? "active" : "suspended";
      }
      return {
      membershipId: m.id,
      teacherId: m.teacher_id,
      role: m.role,
      joinedAt: m.joined_at,
      displayName: profileMap.get(m.teacher_id)?.display_name || null,
      isActive: profileMap.get(m.teacher_id)?.is_active !== false,
      subjects: [...new Set(subjectMap.get(m.teacher_id) || [])],
      activeClassCount: classCountMap.get(m.teacher_id) ?? 0,
      activeStudentLinkCount: studentLinkCountMap.get(m.teacher_id) ?? 0,
      staffCode: staffAccess?.code_display || null,
      staffAccessStatus,
      hasStaffCodeLogin: Boolean(staffAccess?.code_display),
      mustChangePin: staffAccess?.must_change_pin === true,
    };
    }),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function getSchoolTeacherDetail(serviceRole, schoolId, teacherId) {
  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, teacherId);
  if (!verified.ok) return verified;

  if (!SCHOOL_TEACHING_ROLES.includes(verified.membership.role)) {
    return { ok: false, status: 404, code: "school_teacher_not_found" };
  }

  const { data: profile, error: profileErr } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, preferred_language, is_active, created_at")
    .eq("id", teacherId)
    .maybeSingle();

  if (profileErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const subjects = await listSchoolTeacherSubjects(serviceRole, schoolId, teacherId);
  if (!subjects.ok) return subjects;

  const { count: classCount } = await serviceRole
    .from("teacher_classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .eq("is_archived", false)
    .is("archived_at", null);

  const studentLinkCount = await countUniqueLinkedStudents(serviceRole, teacherId);

  return {
    ok: true,
    teacher: {
      teacherId,
      displayName: profile?.display_name || null,
      role: verified.membership.role,
      isSchoolManager: verified.membership.isSchoolManager,
      subjects: subjects.subjects,
      activeClassCount: classCount ?? 0,
      activeStudentLinkCount: studentLinkCount,
    },
  };
}

/**
 * School manager invites an existing auth user as a school teacher (within quota).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; teacherUserId: string }} input
 */
export async function inviteSchoolTeacherByManager(serviceRole, input) {
  const { schoolId, managerId, teacherUserId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(teacherUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  return assignTeacherToSchool(serviceRole, schoolId, teacherUserId, {
    approvalSource: "school_admin",
  });
}
