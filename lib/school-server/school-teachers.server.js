import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { listSchoolTeacherSubjects } from "./school-subjects.server.js";
import { verifyTeacherMembershipInSchool } from "./school-membership.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolTeachers(serviceRole, schoolId) {
  const { data: memberships, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, teacher_id, role, joined_at")
    .eq("school_id", schoolId)
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
      subjectMap.get(s.teacher_id).push(s.subject);
    }

    const { data: classRows } = await serviceRole
      .from("teacher_classes")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .eq("is_archived", false)
      .is("archived_at", null)
      .in("teacher_id", teacherIds);

    for (const row of classRows || []) {
      classCountMap.set(row.teacher_id, (classCountMap.get(row.teacher_id) || 0) + 1);
    }

    const { data: linkRows } = await serviceRole
      .from("teacher_students")
      .select("teacher_id")
      .in("teacher_id", teacherIds)
      .is("archived_at", null);

    for (const row of linkRows || []) {
      studentLinkCountMap.set(row.teacher_id, (studentLinkCountMap.get(row.teacher_id) || 0) + 1);
    }
  }

  return {
    ok: true,
    teachers: (memberships || []).map((m) => ({
      membershipId: m.id,
      teacherId: m.teacher_id,
      role: m.role,
      joinedAt: m.joined_at,
      displayName: profileMap.get(m.teacher_id)?.display_name || null,
      isActive: profileMap.get(m.teacher_id)?.is_active !== false,
      subjects: subjectMap.get(m.teacher_id) || [],
      activeClassCount: classCountMap.get(m.teacher_id) ?? 0,
      activeStudentLinkCount: studentLinkCountMap.get(m.teacher_id) ?? 0,
    })),
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
    .eq("school_id", schoolId)
    .eq("is_archived", false);

  const { count: studentLinkCount } = await serviceRole
    .from("teacher_students")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  return {
    ok: true,
    teacher: {
      teacherId,
      displayName: profile?.display_name || null,
      role: verified.membership.role,
      isSchoolManager: verified.membership.isSchoolManager,
      subjects: subjects.subjects,
      activeClassCount: classCount ?? 0,
      activeStudentLinkCount: studentLinkCount ?? 0,
    },
  };
}
