import { getLearningSupabaseServerUserClient, getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  entitlementStatusToErrorCode,
  hasActivePersonaEntitlement,
  loadParentAccountSettings,
} from "./persona-entitlement.server.js";
import { loadTeacherSchoolMembership, verifyTeacherMembershipInSchool } from "../school-server/school-membership.server.js";

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
export function sendPersonaApiError(res, status, code, message) {
  return res.status(status).json({
    ok: false,
    error: code,
    errorCode: code,
    message: message || code,
  });
}

/**
 * @param {string} authHeader
 */
export async function resolveBearerUser(authHeader) {
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";
  if (!bearer.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Missing bearer token" };
  }

  const supabase = getLearningSupabaseServerUserClient(bearer);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Invalid session" };
  }

  return { ok: true, user: userData.user, userId: userData.user.id, bearerSupabase: supabase };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 * @param {string} persona
 */
export async function requirePersonaApiContext(res, authHeader, persona) {
  const auth = await resolveBearerUser(authHeader);
  if (!auth.ok) {
    sendPersonaApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const entitlementCheck = await hasActivePersonaEntitlement(serviceRole, auth.userId, persona);
  if (!entitlementCheck.ok) {
    sendPersonaApiError(res, entitlementCheck.status, entitlementCheck.code, entitlementCheck.code);
    return { ok: false, stopped: true };
  }

  if (!entitlementCheck.active) {
    const code = entitlementCheck.entitlement
      ? entitlementStatusToErrorCode(entitlementCheck.entitlement.status)
      : persona === "parent"
        ? "not_a_parent"
        : `not_a_${persona}`;
    sendPersonaApiError(res, 403, code, code);
    return { ok: false, stopped: true };
  }

  return {
    ok: true,
    stopped: false,
    user: auth.user,
    userId: auth.userId,
    bearerSupabase: auth.bearerSupabase,
    serviceRole,
    entitlement: entitlementCheck.entitlement,
  };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 * @param {{ requireFeature?: 'reports_enabled'|'copilot_enabled'|'export_enabled'|'advanced_diagnostics_enabled' }} [options]
 */
export async function requireParentApiContext(res, authHeader, options = {}) {
  const auth = await resolveBearerUser(authHeader);
  if (!auth.ok) {
    sendPersonaApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();

  let entitlementCheck = await hasActivePersonaEntitlement(serviceRole, auth.userId, "parent");
  if (!entitlementCheck.ok) {
    sendPersonaApiError(res, entitlementCheck.status, entitlementCheck.code, entitlementCheck.code);
    return { ok: false, stopped: true };
  }

  if (!entitlementCheck.active) {
    const { ensureParentEntitlementIfPolicyAccepted } = await import(
      "../parent-server/parent-entitlement-provision.server.js"
    );
    await ensureParentEntitlementIfPolicyAccepted(
      serviceRole,
      auth.userId,
      auth.user?.email || null
    );
    entitlementCheck = await hasActivePersonaEntitlement(serviceRole, auth.userId, "parent");
  }

  if (!entitlementCheck.active) {
    const code = entitlementCheck.entitlement
      ? entitlementStatusToErrorCode(entitlementCheck.entitlement.status)
      : "not_a_parent";
    sendPersonaApiError(res, 403, code, code);
    return { ok: false, stopped: true };
  }

  const settingsResult = await loadParentAccountSettings(serviceRole, auth.userId);
  if (!settingsResult.ok) {
    sendPersonaApiError(res, settingsResult.status, settingsResult.code, settingsResult.code);
    return { ok: false, stopped: true };
  }

  const settings = settingsResult.settings;
  if (!settings || settings.account_status !== "active") {
    const { ensureParentEntitlementIfPolicyAccepted } = await import(
      "../parent-server/parent-entitlement-provision.server.js"
    );
    await ensureParentEntitlementIfPolicyAccepted(
      serviceRole,
      auth.userId,
      auth.user?.email || null
    );
    const healedSettings = await loadParentAccountSettings(serviceRole, auth.userId);
    if (!healedSettings.ok) {
      sendPersonaApiError(res, healedSettings.status, healedSettings.code, healedSettings.code);
      return { ok: false, stopped: true };
    }
    if (!healedSettings.settings || healedSettings.settings.account_status !== "active") {
      sendPersonaApiError(res, 403, "parent_account_inactive", "Parent account is not active");
      return { ok: false, stopped: true };
    }
    if (options.requireFeature && !healedSettings.settings[options.requireFeature]) {
      sendPersonaApiError(res, 403, "feature_not_enabled", `${options.requireFeature} is not enabled`);
      return { ok: false, stopped: true };
    }
    return buildParentApiContextSuccess(
      auth,
      serviceRole,
      entitlementCheck.entitlement,
      healedSettings.settings
    );
  }

  if (options.requireFeature) {
    if (!settings[options.requireFeature]) {
      sendPersonaApiError(res, 403, "feature_not_enabled", `${options.requireFeature} is not enabled`);
      return { ok: false, stopped: true };
    }
  }

  return buildParentApiContextSuccess(auth, serviceRole, entitlementCheck.entitlement, settings);
}

/**
 * @param {object} auth
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} entitlement
 * @param {object} settings
 */
function buildParentApiContextSuccess(auth, serviceRole, entitlement, settings) {
  return {
    ok: true,
    stopped: false,
    user: auth.user,
    userId: auth.userId,
    bearerSupabase: auth.bearerSupabase,
    serviceRole,
    entitlement,
    parentUserId: auth.userId,
    settings,
  };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 */
export async function requirePrivateTeacherApiContext(res, authHeader) {
  const auth = await resolveBearerUser(authHeader);
  if (!auth.ok) {
    sendPersonaApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const privateCheck = await hasActivePersonaEntitlement(serviceRole, auth.userId, "private_teacher");
  if (!privateCheck.ok) {
    sendPersonaApiError(res, privateCheck.status, privateCheck.code, privateCheck.code);
    return { ok: false, stopped: true };
  }

  if (!privateCheck.active) {
    sendPersonaApiError(res, 403, "not_a_private_teacher", "Not a private teacher");
    return { ok: false, stopped: true };
  }

  const membershipResult = await loadTeacherSchoolMembership(serviceRole, auth.userId);
  if (!membershipResult.ok) {
    sendPersonaApiError(res, membershipResult.status, membershipResult.code, membershipResult.code);
    return { ok: false, stopped: true };
  }

  if (membershipResult.membership) {
    sendPersonaApiError(res, 403, "school_teacher_no_private_access", "School staff cannot use private teacher APIs");
    return { ok: false, stopped: true };
  }

  return {
    ok: true,
    stopped: false,
    user: auth.user,
    userId: auth.userId,
    teacherUserId: auth.userId,
    teacherId: auth.userId,
    serviceRole,
    entitlement: privateCheck.entitlement,
  };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 * @param {string} schoolId
 * @param {{ requireGrant?: 'student_access_admin'|'student_data_viewer', req?: import('http').IncomingMessage }} [options]
 */
export async function requireSchoolOperatorApiContext(res, authHeader, schoolId, options = {}) {
  let userId = null;

  if (options.req) {
    const { resolveAuthenticatedTeacherUserId } = await import(
      "../teacher-server/teacher-session.server.js"
    );
    const auth = await resolveAuthenticatedTeacherUserId(authHeader, options.req);
    if (!auth.ok) {
      sendPersonaApiError(res, auth.status, auth.code, auth.message);
      return { ok: false, stopped: true };
    }
    userId = auth.teacherUserId;
  } else {
    const auth = await resolveBearerUser(authHeader);
    if (!auth.ok) {
      sendPersonaApiError(res, auth.status, auth.code, auth.message);
      return { ok: false, stopped: true };
    }
    userId = auth.userId;
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const operatorCheck = await hasActivePersonaEntitlement(serviceRole, userId, "school_operator");
  if (!operatorCheck.ok) {
    sendPersonaApiError(res, operatorCheck.status, operatorCheck.code, operatorCheck.code);
    return { ok: false, stopped: true };
  }

  if (!operatorCheck.active) {
    sendPersonaApiError(res, 403, "not_a_school_operator", "Not a school operator");
    return { ok: false, stopped: true };
  }

  const membershipVerify = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!membershipVerify.ok) {
    const code = membershipVerify.code === "teacher_not_in_school" ? "wrong_school" : membershipVerify.code;
    sendPersonaApiError(res, membershipVerify.status, code, code);
    return { ok: false, stopped: true };
  }

  if (membershipVerify.membership.role !== "school_operator") {
    sendPersonaApiError(res, 403, "wrong_school", "Not an operator in this school");
    return { ok: false, stopped: true };
  }

  const { data: grants, error: grantsErr } = await serviceRole
    .from("school_operator_grants")
    .select("school_id, operator_user_id, student_access_admin, student_data_viewer, updated_by, updated_at")
    .eq("school_id", schoolId)
    .eq("operator_user_id", userId)
    .maybeSingle();

  if (grantsErr) {
    if (isDbSchemaNotReadyError(grantsErr)) {
      sendPersonaApiError(res, 503, "db_schema_not_ready", "db_schema_not_ready");
      return { ok: false, stopped: true };
    }
    sendPersonaApiError(res, 500, "internal_error", "internal_error");
    return { ok: false, stopped: true };
  }

  if (!grants) {
    sendPersonaApiError(res, 403, "operator_no_grants", "Operator has no grant record");
    return { ok: false, stopped: true };
  }

  if (options.requireGrant) {
    if (!grants[options.requireGrant]) {
      sendPersonaApiError(res, 403, "operator_grant_required", "Required operator grant missing");
      return { ok: false, stopped: true };
    }
  }

  return {
    ok: true,
    stopped: false,
    userId,
    operatorUserId: userId,
    schoolId,
    serviceRole,
    entitlement: operatorCheck.entitlement,
    grants,
    membership: membershipVerify.membership,
  };
}

/**
 * Check active persona entitlement for teacher/admin guards (non-blocking helper).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {string} persona
 */
export async function assertActivePersonaEntitlement(serviceRole, userId, persona) {
  const check = await hasActivePersonaEntitlement(serviceRole, userId, persona);
  if (!check.ok) return check;
  if (!check.active) {
    return {
      ok: false,
      status: 403,
      code: check.entitlement ? entitlementStatusToErrorCode(check.entitlement.status) : `not_a_${persona}`,
    };
  }
  return { ok: true, entitlement: check.entitlement };
}
