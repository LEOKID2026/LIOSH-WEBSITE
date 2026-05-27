import { safeApiLog } from "../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { maskStudentFullName } from "../../../lib/teacher-server/teacher-students.server.js";
import { computeGuardianAccessState } from "../../../lib/teacher-server/teacher-student-access.server.js";
import {
  isGuardianPortalUiCopyEnabled,
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../lib/guardian-server/guardian-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const queryKeys = Object.keys(req.query || {});
  if (queryKeys.length > 0) {
    return sendGuardianApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  try {
    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "guardian_me",
        keys: [`ip:${ip}`, `access:${ctx.guardianAccessId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendGuardianApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const { data: student } = await ctx.serviceRole
      .from("students")
      .select("full_name")
      .eq("id", ctx.studentId)
      .maybeSingle();

    const accessState = computeGuardianAccessState(ctx.accessRow);

    return res.status(200).json({
      data: {
        studentId: ctx.studentId,
        studentFullNameMasked: maskStudentFullName(student?.full_name),
        accessState,
        accessCreatedAt: ctx.accessRow.created_at,
        accessExpiresAt: ctx.accessRow.expires_at,
        sessionExpiresAt: ctx.sessionExpiresAt,
        mustChangePin: Boolean(ctx.accessRow?.must_change_pin),
        isSchoolLinked: Boolean(ctx.accessRow?.created_by_school_id),
        flags: { uiCopyEnabled: isGuardianPortalUiCopyEnabled() },
      },
    });
  } catch (_e) {
    safeApiLog("guardian_me_error", {});
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
