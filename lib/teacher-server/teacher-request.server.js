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
 * @param {string} authHeader
 */
export async function requireTeacherApiContext(res, authHeader) {
  if (rejectIfTeacherPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const auth = await resolveAuthenticatedTeacherUserId(authHeader);
  if (!auth.ok) {
    sendTeacherApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  const serviceRole = getTeacherPortalServiceRole();
  const profileResult = await loadTeacherProfileRow(serviceRole, auth.teacherUserId);
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

  const limitsRow = await loadTeacherLimitsRow(serviceRole, auth.teacherUserId);
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
