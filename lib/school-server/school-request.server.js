import {
  getTeacherPortalServiceRole,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
  sendTeacherApiError,
} from "../teacher-server/teacher-session.server.js";
import { loadSchoolAccountRow, loadTeacherSchoolMembership } from "./school-membership.server.js";

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
export function sendSchoolApiError(res, status, code, message) {
  return sendTeacherApiError(res, status, code, message);
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 */
export async function requireSchoolManagerApiContext(res, authHeader) {
  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, auth.teacherUserId);
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.role !== "school_admin") {
    sendSchoolApiError(res, 403, "not_a_school_manager", "Not a school manager");
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, membership.schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (schoolResult.school.is_active === false) {
    sendSchoolApiError(res, 403, "school_inactive", "School is inactive");
    return { ok: false, stopped: true };
  }

  return {
    ok: true,
    stopped: false,
    managerId: auth.teacherUserId,
    schoolId: membership.schoolId,
    schoolName: schoolResult.school.name,
    school: schoolResult.school,
    membership,
    serviceRole,
  };
}
