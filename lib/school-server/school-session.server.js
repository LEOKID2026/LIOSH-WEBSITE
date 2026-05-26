import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  loadSchoolAccountRow,
  loadTeacherSchoolMembership,
  teacherHasActiveAssignments,
} from "./school-membership.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function buildSchoolMembershipForMe(serviceRole, teacherId) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  if (!membershipResult.membership) {
    return { ok: true, schoolMembership: null };
  }

  const m = membershipResult.membership;
  const schoolResult = await loadSchoolAccountRow(serviceRole, m.schoolId);
  if (!schoolResult.ok) {
    return { ok: true, schoolMembership: null };
  }

  const activity = await teacherHasActiveAssignments(serviceRole, teacherId);
  const hasTeacherActivity = activity.ok ? activity.hasTeacherActivity : false;

  return {
    ok: true,
    schoolMembership: {
      schoolId: m.schoolId,
      schoolRole: m.role,
      schoolName: schoolResult.school.name,
      isSchoolManager: m.isSchoolManager,
      hasTeacherActivity,
      subjectsLocked: m.subjectsLocked,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function buildSchoolDashboardStats(serviceRole, schoolId) {
  const [teachersRes, studentsRes, classesRes, activitiesRes] = await Promise.all([
    serviceRole
      .from("school_teacher_memberships")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceRole
      .from("school_student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .is("unenrolled_at", null),
    serviceRole
      .from("teacher_classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("is_archived", false)
      .is("archived_at", null),
    serviceRole
      .from("classroom_activities")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .in("status", ["draft", "active", "paused"]),
  ]);

  const err = teachersRes.error || studentsRes.error || classesRes.error || activitiesRes.error;
  if (err) {
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    stats: {
      teacherCount: teachersRes.count ?? 0,
      enrolledStudentCount: studentsRes.count ?? 0,
      activeClassCount: classesRes.count ?? 0,
      activeActivityCount: activitiesRes.count ?? 0,
    },
  };
}
