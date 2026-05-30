import { assertTeacherFeatureEnabled } from "./teacher-entitlements.server.js";
import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";
import {
  getTeacherPortalServiceRole,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
  resolveTeacherPlanLimits,
  sendTeacherApiError,
} from "./teacher-session.server.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function parseBooleanQuery(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

export function unknownQueryParams(query, allowed) {
  const keys = Object.keys(query || {});
  return keys.filter((k) => !allowed.has(k));
}

/**
 * @param {import('http').ServerResponse} res
 * @param {{ featureFlags?: Record<string, boolean> }} limits
 * @param {import('./teacher-entitlements.server.js').TeacherFeatureKey} feature
 */
export function rejectIfTeacherFeatureDisabled(res, limits, feature) {
  const check = assertTeacherFeatureEnabled(limits?.featureFlags, feature);
  if (check.ok) return false;
  sendTeacherApiError(res, check.status, check.code, `Feature disabled: ${feature}`);
  return true;
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string|import('http').IncomingMessage} authHeaderOrReq
 * @param {import('http').IncomingMessage} [reqOptional]
 */
export async function requireTeacherApiContext(res, authHeaderOrReq, reqOptional) {
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
    sendTeacherApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const schoolMembership = await loadTeacherSchoolMembership(serviceRole, auth.teacherUserId);
  if (!schoolMembership.ok) {
    sendTeacherApiError(
      res,
      schoolMembership.status,
      schoolMembership.code,
      schoolMembership.code === "db_schema_not_ready"
        ? "teacher_portal schema not yet applied"
        : "Unexpected server error"
    );
    return { ok: false, stopped: true };
  }
  if (schoolMembership.membership?.role === "school_operator") {
    sendTeacherApiError(
      res,
      403,
      "not_a_school_teacher",
      "School operators cannot use teacher portal APIs"
    );
    return { ok: false, stopped: true };
  }

  const [profileResult, limitsRow] = await Promise.all([
    loadTeacherProfileRow(serviceRole, auth.teacherUserId),
    loadTeacherLimitsRow(serviceRole, auth.teacherUserId),
  ]);

  if (!profileResult.ok) {
    sendTeacherApiError(
      res,
      profileResult.status,
      profileResult.code,
      profileResult.code === "db_schema_not_ready"
        ? "teacher_portal schema not yet applied"
        : "Unexpected server error"
    );
    return { ok: false, stopped: true };
  }

  if (!profileResult.profile) {
    sendTeacherApiError(res, 404, "teacher_profile_missing", "Teacher profile not provisioned");
    return { ok: false, stopped: true };
  }

  if (!limitsRow.ok) {
    sendTeacherApiError(
      res,
      limitsRow.status,
      limitsRow.code,
      limitsRow.code === "db_schema_not_ready"
        ? "teacher_portal schema not yet applied"
        : "Unexpected server error"
    );
    return { ok: false, stopped: true };
  }

  if (!limitsRow.limits) {
    sendTeacherApiError(res, 404, "teacher_profile_missing", "Teacher limits not provisioned");
    return { ok: false, stopped: true };
  }

  const resolved = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
  if (!resolved.ok) {
    sendTeacherApiError(
      res,
      resolved.status,
      resolved.code,
      resolved.code === "db_schema_not_ready"
        ? "teacher_portal schema not yet applied"
        : "Unexpected server error"
    );
    return { ok: false, stopped: true };
  }

  if (resolved.limits.isAccountActive === false) {
    sendTeacherApiError(res, 403, "account_deactivated", "Teacher account is deactivated");
    return { ok: false, stopped: true };
  }

  return {
    ok: true,
    stopped: false,
    teacherId: auth.teacherUserId,
    profile: profileResult.profile,
    limitsRow: limitsRow.limits,
    limits: resolved.limits,
    serviceRole,
  };
}
