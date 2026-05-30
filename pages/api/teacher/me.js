import { safeApiLog } from "../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { buildSchoolMembershipForMe } from "../../../lib/school-server/school-session.server.js";
import {
  formatTeacherMePayload,
  getTeacherPortalServiceRole,
  loadTeacherCounters,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
  resolveTeacherPlanLimits,
  sendTeacherApiError,
} from "../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;

  const queryKeys = Object.keys(req.query || {});
  if (queryKeys.length > 0) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  try {
    const auth = await resolveAuthenticatedTeacherUserId(req.headers.authorization || "", req);
    if (!auth.ok) {
      return sendTeacherApiError(res, auth.status, auth.code, auth.message);
    }

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_me",
        keys: [`ip:${ip}`, `teacher:${auth.teacherUserId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const serviceRole = getTeacherPortalServiceRole();
    const profileResult = await loadTeacherProfileRow(serviceRole, auth.teacherUserId);
    if (!profileResult.ok) {
      return sendTeacherApiError(
        res,
        profileResult.status,
        profileResult.code,
        profileResult.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    if (!profileResult.profile) {
      return sendTeacherApiError(res, 404, "teacher_profile_missing", "Teacher profile not provisioned");
    }

    const limitsRow = await loadTeacherLimitsRow(serviceRole, auth.teacherUserId);
    if (!limitsRow.ok) {
      return sendTeacherApiError(
        res,
        limitsRow.status,
        limitsRow.code,
        limitsRow.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    if (!limitsRow.limits) {
      return sendTeacherApiError(res, 404, "teacher_profile_missing", "Teacher limits not provisioned");
    }

    if (limitsRow.limits.is_account_active === false) {
      return sendTeacherApiError(res, 403, "account_deactivated", "Teacher account is deactivated");
    }

    const resolvedLimits = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
    if (!resolvedLimits.ok) {
      return sendTeacherApiError(
        res,
        resolvedLimits.status,
        resolvedLimits.code,
        resolvedLimits.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    const countersResult = await loadTeacherCounters(serviceRole, auth.teacherUserId);
    if (!countersResult.ok) {
      return sendTeacherApiError(
        res,
        countersResult.status,
        countersResult.code,
        countersResult.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    const schoolMem = await buildSchoolMembershipForMe(serviceRole, auth.teacherUserId);
    if (!schoolMem.ok) {
      return sendTeacherApiError(
        res,
        schoolMem.status,
        schoolMem.code,
        schoolMem.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    const mePayload = formatTeacherMePayload(
      profileResult.profile,
      resolvedLimits.limits,
      countersResult.counters
    );
    if (schoolMem.schoolMembership) {
      mePayload.schoolMembership = schoolMem.schoolMembership;
    }

    return res.status(200).json({ data: mePayload });
  } catch (_e) {
    safeApiLog("teacher_me_unexpected_error", { route: "me" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
