import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { transitionActivityStatus } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";

const ACTION_AUDIT = {
  activate: "activity_activated",
  pause: "activity_paused",
  close: "activity_closed",
  archive: "activity_archived",
};

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  if (req.method !== "PATCH") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_activity_status",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "יותר מדי בקשות - המתן מעט ונסה שוב");
      }
    }

    const body = readJsonBody(req);
    const action = String(body.action || "").trim().toLowerCase();
    if (!action || !["activate", "pause", "resume", "close", "archive"].includes(action)) {
      return sendTeacherApiError(res, 400, "validation_failed", "invalid action");
    }

    const result = await transitionActivityStatus(
      ctx.serviceRole,
      ctx.teacherId,
      activityId,
      action
    );

    if (!result.ok) {
      return sendTeacherApiError(
        res,
        result.status,
        result.code,
        result.message || result.code
      );
    }

    const auditAction = ACTION_AUDIT[action];
    if (auditAction) {
      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: auditAction,
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { activityId, status: result.status },
      });
    }

    return res.status(200).json({
      data: { activityId, status: result.status },
    });
  } catch (err) {
    safeApiLog("teacher/activities/status", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
