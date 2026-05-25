import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import {
  createStudentActivity,
  listTeacherStudentActivities,
  parseCreateStudentActivityBody,
} from "../../../../lib/teacher-server/student-activity.server.js";
import {
  parseBooleanQuery,
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireTeacherApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "individual_activities")) return undefined;

    if (req.method === "GET") {
      const unknown = unknownQueryParams(req.query, new Set(["studentId", "status", "includeArchived"]));
      if (unknown.length) {
        return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
      }

      const studentId = req.query?.studentId != null ? String(req.query.studentId).trim() : undefined;
      const status = req.query?.status != null ? String(req.query.status).trim() : undefined;
      const includeArchived = parseBooleanQuery(req.query?.includeArchived, false);

      const result = await listTeacherStudentActivities(ctx.serviceRole, ctx.teacherId, {
        studentId,
        status,
        includeArchived: includeArchived === true,
      });

      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({ data: { activities: result.activities } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_student_activity_create",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 30,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
        }
      }

      const body = readJsonBody(req);
      const parsed = parseCreateStudentActivityBody(body);
      if (!parsed.ok) {
        const status = parsed.status || 400;
        return sendTeacherApiError(res, status, parsed.code, parsed.message || parsed.code);
      }

      const created = await createStudentActivity(ctx.serviceRole, ctx.teacherId, parsed);
      if (!created.ok) {
        return sendTeacherApiError(res, created.status, created.code, created.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "activity_created",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: {
          scope: "student",
          activityId: created.activityId,
          studentId: parsed.payload.studentId,
          mode: parsed.payload.mode,
          questionCount: parsed.payload.questionCount,
        },
      });

      return res.status(201).json({
        data: { activityId: created.activityId },
      });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/student-activities", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
