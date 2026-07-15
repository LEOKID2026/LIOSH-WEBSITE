import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { buildEnrichedActivityReportPayload } from "../../../../../lib/teacher-server/teacher-activities-enriched.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  if (req.method !== "GET") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_activity_report_export",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 20,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "יותר מדי בקשות - המתן מעט ונסה שוב");
      }
    }

    const result = await buildEnrichedActivityReportPayload(
      ctx.serviceRole,
      ctx.teacherId,
      activityId
    );

    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.message || result.code);
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ data: result });
  } catch (err) {
    safeApiLog("teacher/activities/report-export", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
