import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../../lib/security/production-guard.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../../../lib/teacher-server/teacher-request.server.js";
import {
  parseTeacherReportStudentIdParam,
  teacherHasReportAccessToStudent,
} from "../../../../../../lib/teacher-server/teacher-report.server.js";
import {
  createTeacherParentMessage,
  listTeacherParentMessages,
  parseParentMessageBody,
} from "../../../../../../lib/teacher-server/teacher-parent-messages.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../../lib/teacher-server/teacher-session.server.js";

const ALLOWED_QUERY = new Set(["studentId"]);

export default async function handler(req, res) {
  if (rejectIfTeacherPortalDisabled(res)) return undefined;

  const unknown = unknownQueryParams(req.query, ALLOWED_QUERY);
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  const parsedId = parseTeacherReportStudentIdParam(req.query?.studentId);
  if (!parsedId.ok) {
    return sendTeacherApiError(res, 400, parsedId.code, `Invalid ${parsedId.field}`);
  }

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;
  if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "parent_messaging")) return undefined;

  if (req.method === "GET") {
    try {
      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_parent_messages_list",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 60,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
        }
      }

      const access = await teacherHasReportAccessToStudent(
        ctx.serviceRole,
        ctx.teacherId,
        parsedId.studentId
      );
      if (!access.ok) {
        return sendTeacherApiError(res, access.status || 500, access.code || "internal_error", access.code);
      }
      if (!access.allowed) {
        return sendTeacherApiError(res, 403, "student_not_linked", "student_not_linked");
      }

      const listed = await listTeacherParentMessages(ctx.serviceRole, parsedId.studentId, {
        limit: 50,
        includeHidden: true,
        teacherId: ctx.teacherId,
      });
      if (!listed.ok) {
        return sendTeacherApiError(res, listed.status || 500, listed.code || "internal_error", listed.code);
      }

      return res.status(200).json({ data: { messages: listed.messages } });
    } catch (_e) {
      safeApiLog("teacher_parent_messages_list_error", {});
      return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
    }
  }

  if (req.method === "POST") {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    try {
      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_parent_messages_create",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 20,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
        }
      }

      const parsed = parseParentMessageBody(req.body);
      if (!parsed.ok) {
        return sendTeacherApiError(res, 400, parsed.code, parsed.code);
      }

      const created = await createTeacherParentMessage({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        studentId: parsedId.studentId,
        message: parsed.message,
      });

      if (!created.ok) {
        return sendTeacherApiError(res, created.status, created.code, created.code);
      }

      return res.status(201).json({ data: created.data });
    } catch (_e) {
      safeApiLog("teacher_parent_messages_create_error", {});
      return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
    }
  }

  res.setHeader("Allow", "GET, POST");
  return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
}
