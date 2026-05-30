import {
  getTeacherPortalServiceRole,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
  sendTeacherApiError,
} from "../teacher-server/teacher-session.server.js";
import { assertActivePersonaEntitlement } from "../auth/persona-guard.server.js";
import { requireSchoolOperatorApiContext } from "../auth/persona-guard.server.js";
import { loadSchoolAccountRow, loadTeacherSchoolMembership } from "./school-membership.server.js";

/** @param {{ authMethod?: string, schoolId?: string|null }} auth */
function schoolMembershipLookupOptions(auth) {
  if (auth.authMethod === "staff_cookie" && auth.schoolId) {
    return { preferredSchoolId: auth.schoolId };
  }
  return {};
}

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
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolManagerApiContext(res, authHeaderOrReq, reqOptional) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.role !== "school_admin") {
    sendSchoolApiError(res, 403, "not_a_school_manager", "אין הרשאת מנהל/ת בית ספר");
    return { ok: false, stopped: true };
  }

  const managerEntitlement = await assertActivePersonaEntitlement(
    serviceRole,
    auth.teacherUserId,
    "school_manager"
  );
  if (!managerEntitlement.ok) {
    sendSchoolApiError(res, managerEntitlement.status, managerEntitlement.code, managerEntitlement.code);
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, membership.schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (schoolResult.school.is_active === false) {
    sendSchoolApiError(res, 403, "school_inactive", "בית הספר אינו פעיל");
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

/**
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolPortalMeContext(res, authHeaderOrReq, reqOptional) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership?.schoolId) {
    sendSchoolApiError(res, 403, "not_school_portal_member", "not_school_portal_member");
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, membership.schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (schoolResult.school.is_active === false) {
    sendSchoolApiError(res, 403, "school_inactive", "school_inactive");
    return { ok: false, stopped: true };
  }

  if (membership.role === "school_admin") {
    const managerEntitlement = await assertActivePersonaEntitlement(
      serviceRole,
      auth.teacherUserId,
      "school_manager"
    );
    if (!managerEntitlement.ok) {
      sendSchoolApiError(res, managerEntitlement.status, managerEntitlement.code, managerEntitlement.code);
      return { ok: false, stopped: true };
    }
    return {
      ok: true,
      stopped: false,
      portalRole: "school_manager",
      actorUserId: auth.teacherUserId,
      managerId: auth.teacherUserId,
      schoolId: membership.schoolId,
      school: schoolResult.school,
      membership,
      serviceRole,
    };
  }

  if (membership.role === "school_operator") {
    const operatorEntitlement = await assertActivePersonaEntitlement(
      serviceRole,
      auth.teacherUserId,
      "school_operator"
    );
    if (!operatorEntitlement.ok) {
      sendSchoolApiError(res, operatorEntitlement.status, operatorEntitlement.code, operatorEntitlement.code);
      return { ok: false, stopped: true };
    }

    const { data: grants, error: grantsErr } = await serviceRole
      .from("school_operator_grants")
      .select("student_access_admin, student_data_viewer, updated_at")
      .eq("school_id", membership.schoolId)
      .eq("operator_user_id", auth.teacherUserId)
      .maybeSingle();

    if (grantsErr) {
      sendSchoolApiError(res, 500, "internal_error", "internal_error");
      return { ok: false, stopped: true };
    }

    return {
      ok: true,
      stopped: false,
      portalRole: "school_operator",
      actorUserId: auth.teacherUserId,
      operatorUserId: auth.teacherUserId,
      schoolId: membership.schoolId,
      school: schoolResult.school,
      membership,
      grants: grants || {
        student_access_admin: false,
        student_data_viewer: false,
      },
      serviceRole,
    };
  }

  sendSchoolApiError(res, 403, "not_school_portal_member", "not_school_portal_member");
  return { ok: false, stopped: true };
}

/**
 * School manager OR operator with student_access_admin grant.
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {string} schoolId
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolCredentialAdminContext(
  res,
  authHeaderOrReq,
  schoolId,
  reqOptional
) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.schoolId !== schoolId) {
    sendSchoolApiError(res, 403, "wrong_school", "wrong_school");
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (schoolResult.school.is_active === false) {
    sendSchoolApiError(res, 403, "school_inactive", "school_inactive");
    return { ok: false, stopped: true };
  }

  if (membership.role === "school_admin") {
    const managerEntitlement = await assertActivePersonaEntitlement(
      serviceRole,
      auth.teacherUserId,
      "school_manager"
    );
    if (!managerEntitlement.ok) {
      sendSchoolApiError(res, managerEntitlement.status, managerEntitlement.code, managerEntitlement.code);
      return { ok: false, stopped: true };
    }
    return {
      ok: true,
      stopped: false,
      actorRole: "school_manager",
      actorUserId: auth.teacherUserId,
      managerId: auth.teacherUserId,
      schoolId,
      school: schoolResult.school,
      membership,
      serviceRole,
    };
  }

  if (membership.role === "school_operator") {
    const operatorCtx = await requireSchoolOperatorApiContext(res, authHeader, schoolId, {
      requireGrant: "student_access_admin",
      req,
    });
    if (!operatorCtx.ok) return operatorCtx;
    return {
      ...operatorCtx,
      actorRole: "school_operator",
      actorUserId: operatorCtx.operatorUserId,
      managerId: null,
      school: schoolResult.school,
    };
  }

  sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
  return { ok: false, stopped: true };
}

/**
 * School manager OR operator with student_data_viewer grant.
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {string} schoolId
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolDataViewerContext(
  res,
  authHeaderOrReq,
  schoolId,
  reqOptional
) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.schoolId !== schoolId) {
    sendSchoolApiError(res, 403, "wrong_school", "wrong_school");
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (membership.role === "school_admin") {
    const managerEntitlement = await assertActivePersonaEntitlement(
      serviceRole,
      auth.teacherUserId,
      "school_manager"
    );
    if (!managerEntitlement.ok) {
      sendSchoolApiError(res, managerEntitlement.status, managerEntitlement.code, managerEntitlement.code);
      return { ok: false, stopped: true };
    }
    return {
      ok: true,
      stopped: false,
      actorRole: "school_manager",
      actorUserId: auth.teacherUserId,
      managerId: auth.teacherUserId,
      schoolId,
      school: schoolResult.school,
      membership,
      serviceRole,
    };
  }

  if (membership.role === "school_operator") {
    const operatorCtx = await requireSchoolOperatorApiContext(res, authHeader, schoolId, {
      requireGrant: "student_data_viewer",
      req,
    });
    if (!operatorCtx.ok) return operatorCtx;
    return {
      ...operatorCtx,
      actorRole: "school_operator",
      actorUserId: operatorCtx.operatorUserId,
      managerId: null,
      school: schoolResult.school,
    };
  }

  sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
  return { ok: false, stopped: true };
}

/**
 * Resolve school membership then credential-admin context (manager or operator with grant).
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolCredentialAdminApiContext(
  res,
  authHeaderOrReq,
  reqOptional
) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  if (!membershipResult.membership?.schoolId) {
    sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
    return { ok: false, stopped: true };
  }

  return requireSchoolCredentialAdminContext(
    res,
    authHeader,
    membershipResult.membership.schoolId,
    req
  );
}

/** School manager or operator with student_access_admin — class roster / assignment admin. */
export const requireSchoolClassAdminApiContext = requireSchoolCredentialAdminApiContext;

/**
 * School manager OR operator with student_access_admin OR student_data_viewer.
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {string} schoolId
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolStudentBrowseContext(
  res,
  authHeaderOrReq,
  schoolId,
  reqOptional
) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.schoolId !== schoolId) {
    sendSchoolApiError(res, 403, "wrong_school", "wrong_school");
    return { ok: false, stopped: true };
  }

  const schoolResult = await loadSchoolAccountRow(serviceRole, schoolId);
  if (!schoolResult.ok) {
    sendSchoolApiError(res, schoolResult.status, schoolResult.code, schoolResult.code);
    return { ok: false, stopped: true };
  }

  if (schoolResult.school.is_active === false) {
    sendSchoolApiError(res, 403, "school_inactive", "school_inactive");
    return { ok: false, stopped: true };
  }

  if (membership.role === "school_admin") {
    const managerEntitlement = await assertActivePersonaEntitlement(
      serviceRole,
      auth.teacherUserId,
      "school_manager"
    );
    if (!managerEntitlement.ok) {
      sendSchoolApiError(res, managerEntitlement.status, managerEntitlement.code, managerEntitlement.code);
      return { ok: false, stopped: true };
    }
    return {
      ok: true,
      stopped: false,
      actorRole: "school_manager",
      actorUserId: auth.teacherUserId,
      managerId: auth.teacherUserId,
      schoolId,
      school: schoolResult.school,
      membership,
      serviceRole,
    };
  }

  if (membership.role === "school_operator") {
    const operatorCtx = await requireSchoolOperatorApiContext(res, authHeader, schoolId, { req });
    if (!operatorCtx.ok) return operatorCtx;
    const grants = operatorCtx.grants || {};
    if (!grants.student_access_admin && !grants.student_data_viewer) {
      sendSchoolApiError(res, 403, "operator_grant_required", "operator_grant_required");
      return { ok: false, stopped: true };
    }
    return {
      ...operatorCtx,
      actorRole: "school_operator",
      actorUserId: operatorCtx.operatorUserId,
      managerId: null,
      school: schoolResult.school,
      membership,
      serviceRole,
    };
  }

  sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
  return { ok: false, stopped: true };
}

/**
 * Resolve school membership then student-browse context (manager or operator with browse grant).
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireSchoolStudentBrowseApiContext(
  res,
  authHeaderOrReq,
  reqOptional
) {
  const authHeader =
    typeof authHeaderOrReq === "string"
      ? authHeaderOrReq
      : authHeaderOrReq?.headers?.authorization || "";
  const req =
    typeof authHeaderOrReq === "string" ? reqOptional : authHeaderOrReq;

  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader, req);
  if (!auth.ok) {
    sendSchoolApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const membershipResult = await loadTeacherSchoolMembership(
    serviceRole,
    auth.teacherUserId,
    schoolMembershipLookupOptions(auth)
  );
  if (!membershipResult.ok) {
    sendSchoolApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  if (!membershipResult.membership?.schoolId) {
    sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
    return { ok: false, stopped: true };
  }

  return requireSchoolStudentBrowseContext(
    res,
    authHeader,
    membershipResult.membership.schoolId,
    req
  );
}
