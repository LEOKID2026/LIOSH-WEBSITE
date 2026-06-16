import { safeApiLog } from "../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { buildTeacherDashboardShellPayload, buildTeacherDashboardPayload } from "../../../lib/teacher-server/teacher-dashboard.server.js";
import { requireTeacherApiContext, unknownQueryParams } from "../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../lib/teacher-server/teacher-session.server.js";
import {
  elapsedMs,
  setTeacherApiServerTiming,
  startTimer,
} from "../../../lib/teacher-server/api-timing.server.js";
import { trackServerAnalyticsEvent } from "../../../lib/analytics/track-event.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const t0 = startTimer();
    const ctx = await requireTeacherApiContext(res, req);
    const tAuth = elapsedMs(t0);
    if (ctx.stopped) return undefined;

    const unknown = unknownQueryParams(req.query, new Set(["phase"]));
    if (unknown.length) {
      return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
    }

    const phaseRaw = typeof req.query?.phase === "string" ? req.query.phase.trim().toLowerCase() : "shell";
    const wantFull = phaseRaw === "full";

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_dashboard",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const tBuild0 = startTimer();
    const result = wantFull
      ? await buildTeacherDashboardPayload({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.teacherId,
        })
      : await buildTeacherDashboardShellPayload({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.teacherId,
        });
    const tBuild = elapsedMs(tBuild0);

    if (!result.ok) {
      return sendTeacherApiError(
        res,
        result.status,
        result.code,
        result.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : result.code || "Unexpected server error"
      );
    }

    setTeacherApiServerTiming(res, {
      auth: tAuth,
      build: tBuild,
      total: elapsedMs(t0),
    });

    void trackServerAnalyticsEvent(ctx.serviceRole, {
      eventName: "teacher_dashboard_opened",
      actorType: "teacher",
      actorId: ctx.teacherId,
      objectType: "teacher_dashboard",
      objectId: ctx.teacherId,
      idempotencyKey: `teacher_dashboard_opened:${ctx.teacherId}:${new Date().toISOString().slice(0, 13)}:${phaseRaw}`,
      metadata: { phase: phaseRaw },
    });

    return res.status(200).json({ data: result.payload });
  } catch (_e) {
    safeApiLog("teacher_dashboard_error", { route: "dashboard" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
