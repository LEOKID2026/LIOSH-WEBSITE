import { safeApiLog } from "../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { clientIpFromRequest, consumeRateLimit } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { isDbSchemaNotReadyError, writeTeacherAuditRow } from "../../../lib/teacher-server/teacher-audit.server.js";
import { ensureTeacherAccessPrefix } from "../../../lib/teacher-server/teacher-access-prefix.server.js";
import {
  TEACHER_PORTAL_DEFAULT_PLAN_CODE,
  formatTeacherOnboardPayload,
  getTeacherPortalServiceRole,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
  parseTeacherOnboardBody,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
  resolveTeacherPlanLimits,
  sendTeacherApiError,
} from "../../../lib/teacher-server/teacher-session.server.js";

function rejectIfTeacherOnboardRateLimited(req, res) {
  if (!isProductionRuntime()) return false;

  const ip = clientIpFromRequest(req);
  const keys = [`ip:${ip}`];
  const oneMin = consumeRateLimit({
    namespace: "teacher_onboard_1m",
    keys,
    maxAttempts: 1,
    windowMs: 60_000,
  });
  if (!oneMin.allowed) {
    if (oneMin.retryAfterSec) res.setHeader("Retry-After", String(oneMin.retryAfterSec));
    sendTeacherApiError(res, 429, "rate_limited", "Too many onboard attempts");
    return true;
  }

  const oneHour = consumeRateLimit({
    namespace: "teacher_onboard_1h",
    keys,
    maxAttempts: 5,
    windowMs: 3_600_000,
  });
  if (!oneHour.allowed) {
    if (oneHour.retryAfterSec) res.setHeader("Retry-After", String(oneHour.retryAfterSec));
    sendTeacherApiError(res, 429, "rate_limited", "Too many onboard attempts");
    return true;
  }

  return false;
}

async function provisionTeacherRows(serviceRole, teacherId, displayName, preferredLanguage) {
  const existing = await loadTeacherProfileRow(serviceRole, teacherId);
  if (!existing.ok) return existing;

  if (existing.profile) {
    const limitsRow = await loadTeacherLimitsRow(serviceRole, teacherId);
    if (!limitsRow.ok) return limitsRow;
    if (!limitsRow.limits) {
      const { error: limitsInsertErr } = await serviceRole.from("teacher_limits").insert({
        teacher_id: teacherId,
        plan_code: TEACHER_PORTAL_DEFAULT_PLAN_CODE,
      });
      if (limitsInsertErr && limitsInsertErr.code !== "23505") {
        return { ok: false, status: 500, code: "internal_error" };
      }
      const limitsReload = await loadTeacherLimitsRow(serviceRole, teacherId);
      if (!limitsReload.ok || !limitsReload.limits) {
        return { ok: false, status: 500, code: "internal_error" };
      }
      const resolved = await resolveTeacherPlanLimits(serviceRole, limitsReload.limits);
      if (!resolved.ok) return resolved;
      return {
        ok: true,
        created: false,
        profile: existing.profile,
        limits: resolved.limits,
      };
    }

    const resolved = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      created: false,
      profile: existing.profile,
      limits: resolved.limits,
    };
  }

  const { error: profileErr } = await serviceRole.from("teacher_profiles").insert({
    id: teacherId,
    display_name: displayName,
    preferred_language: preferredLanguage,
  });

  if (profileErr) {
    if (isDbSchemaNotReadyError(profileErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    if (profileErr.code === "23505") {
      const retry = await loadTeacherProfileRow(serviceRole, teacherId);
      if (!retry.ok || !retry.profile) {
        return { ok: false, status: 500, code: "internal_error" };
      }
      const limitsRow = await loadTeacherLimitsRow(serviceRole, teacherId);
      if (!limitsRow.ok) return limitsRow;
      if (!limitsRow.limits) {
        await serviceRole.from("teacher_limits").insert({
          teacher_id: teacherId,
          plan_code: TEACHER_PORTAL_DEFAULT_PLAN_CODE,
        });
        const limitsReload = await loadTeacherLimitsRow(serviceRole, teacherId);
        if (!limitsReload.ok || !limitsReload.limits) {
          return { ok: false, status: 500, code: "internal_error" };
        }
        const resolved = await resolveTeacherPlanLimits(serviceRole, limitsReload.limits);
        if (!resolved.ok) return resolved;
        return { ok: true, created: false, profile: retry.profile, limits: resolved.limits };
      }
      const resolved = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
      if (!resolved.ok) return resolved;
      return { ok: true, created: false, profile: retry.profile, limits: resolved.limits };
    }
    safeApiLog("teacher_onboard_profile_insert_error", { code: profileErr.code });
    return { ok: false, status: 500, code: "internal_error" };
  }

  const { error: limitsErr } = await serviceRole.from("teacher_limits").insert({
    teacher_id: teacherId,
    plan_code: TEACHER_PORTAL_DEFAULT_PLAN_CODE,
  });

  if (limitsErr && limitsErr.code !== "23505") {
    if (isDbSchemaNotReadyError(limitsErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    safeApiLog("teacher_onboard_limits_insert_error", { code: limitsErr.code });
    return { ok: false, status: 500, code: "internal_error" };
  }

  const profileReload = await loadTeacherProfileRow(serviceRole, teacherId);
  const limitsReload = await loadTeacherLimitsRow(serviceRole, teacherId);
  if (!profileReload.ok || !profileReload.profile || !limitsReload.ok || !limitsReload.limits) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const resolved = await resolveTeacherPlanLimits(serviceRole, limitsReload.limits);
  if (!resolved.ok) return resolved;

  return {
    ok: true,
    created: true,
    profile: profileReload.profile,
    limits: resolved.limits,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfTeacherOnboardRateLimited(req, res)) return undefined;

  try {
    const auth = await resolveAuthenticatedTeacherUserId(req.headers.authorization || "", req);
    if (!auth.ok) {
      return sendTeacherApiError(res, auth.status, auth.code, auth.message);
    }
    if (auth.authMethod === "staff_cookie") {
      return sendTeacherApiError(res, 403, "jwt_required", "Onboard requires Supabase email login");
    }

    const serviceRole = getTeacherPortalServiceRole();
    const limitsCheck = await loadTeacherLimitsRow(serviceRole, auth.teacherUserId);
    if (limitsCheck.ok && limitsCheck.limits && limitsCheck.limits.is_account_active === false) {
      return sendTeacherApiError(res, 403, "account_deactivated", "Teacher account is deactivated");
    }

    const parsed = parseTeacherOnboardBody(req);
    if (!parsed.ok) {
      return sendTeacherApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
    }

    const result = await provisionTeacherRows(
      serviceRole,
      auth.teacherUserId,
      parsed.displayName,
      parsed.preferredLanguage
    );

    if (!result.ok) {
      return sendTeacherApiError(
        res,
        result.status,
        result.code,
        result.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    const prefixResult = await ensureTeacherAccessPrefix(serviceRole, auth.teacherUserId);
    if (!prefixResult.ok) {
      return sendTeacherApiError(
        res,
        prefixResult.status,
        prefixResult.code,
        prefixResult.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    await writeTeacherAuditRow({
      serviceRole,
      teacherId: auth.teacherUserId,
      action: "teacher_onboarded",
      actorRole: "teacher",
      actorId: auth.teacherUserId,
      metadata: {
        plan_code: TEACHER_PORTAL_DEFAULT_PLAN_CODE,
        outcome: result.created ? "created" : "idempotent",
      },
    });

    const status = result.created ? 201 : 200;
    return res.status(status).json({
      data: formatTeacherOnboardPayload(result.profile, result.limits),
    });
  } catch (_e) {
    safeApiLog("teacher_onboard_unexpected_error", { route: "onboard" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
