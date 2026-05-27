import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  loadSchoolAccountRow,
  loadTeacherSchoolMembership,
  teacherHasActiveAssignments,
} from "./school-membership.server.js";
import {
  memoSchoolServerQuery,
  SCHOOL_SERVER_CACHE_TTL_MS,
} from "./school-server-cache.server.js";
import {
  loadSchoolScope,
  loadSchoolVisibleStudentIds,
} from "./school-scope.server.js";
import { countSchoolUnreadMessagesForDashboard } from "./school-messaging.server.js";

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
  return memoSchoolServerQuery(
    `${schoolId}::dashboard-stats`,
    SCHOOL_SERVER_CACHE_TTL_MS.dashboardStats,
    () => buildSchoolDashboardStatsUncached(serviceRole, schoolId)
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
async function buildSchoolDashboardStatsUncached(serviceRole, schoolId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const visibleStudents = await loadSchoolVisibleStudentIds(serviceRole, schoolId);
  if (!visibleStudents.ok) return visibleStudents;

  const enrolledCount = visibleStudents.enrolledOnlyIds.size;

  let classesRes = { count: 0, error: null };
  let activitiesRes = { count: 0, error: null };
  let individualRes = { count: 0, error: null };

  if (scope.teacherIds.length > 0) {
    [classesRes, activitiesRes, individualRes] = await Promise.all([
      serviceRole
        .from("teacher_classes")
        .select("id", { count: "exact", head: true })
        .in("teacher_id", scope.teacherIds)
        .eq("is_archived", false)
        .is("archived_at", null),
      serviceRole
        .from("classroom_activities")
        .select("id", { count: "exact", head: true })
        .in("teacher_id", scope.teacherIds)
        .in("status", ["draft", "active", "paused"]),
      serviceRole
        .from("student_activities")
        .select("id", { count: "exact", head: true })
        .in("teacher_id", scope.teacherIds)
        .in("status", ["draft", "active"]),
    ]);
  }

  const err = classesRes.error || activitiesRes.error || individualRes.error;
  if (err) {
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classroomActive = activitiesRes.count ?? 0;
  const individualActive = individualRes.count ?? 0;

  const messagingStats = await countSchoolUnreadMessagesForDashboard(serviceRole, schoolId);
  const unreadStats = messagingStats.ok
    ? messagingStats.data
    : {
        unreadParentMessageCount: 0,
        unreadTeacherMessageCount: 0,
        importantActiveMessageCount: 0,
      };

  return {
    ok: true,
    stats: {
      teacherCount: scope.teacherCount,
      staffCount: scope.staffCount,
      studentCount: visibleStudents.studentIds.length,
      enrolledStudentCount: enrolledCount,
      activeClassCount: classesRes.count ?? 0,
      activeActivityCount: classroomActive + individualActive,
      activeClassroomActivityCount: classroomActive,
      activeIndividualActivityCount: individualActive,
      unreadParentMessageCount: unreadStats.unreadParentMessageCount,
      unreadTeacherMessageCount: unreadStats.unreadTeacherMessageCount,
      importantActiveMessageCount: unreadStats.importantActiveMessageCount,
    },
  };
}
