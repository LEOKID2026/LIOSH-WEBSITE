import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";
import { sendTeacherApiError } from "./teacher-session.server.js";

/**
 * Block school teachers/managers/operators from private teacher student/class actions.
 * @param {import('http').ServerResponse} res
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherUserId
 */
export async function rejectIfSchoolTeacher(res, serviceRole, teacherUserId) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherUserId);
  if (!membershipResult.ok) {
    sendTeacherApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { blocked: true };
  }

  if (membershipResult.membership) {
    sendTeacherApiError(
      res,
      403,
      "school_teacher_no_private_access",
      "School staff cannot manage private students or classes"
    );
    return { blocked: true };
  }

  return { blocked: false };
}
