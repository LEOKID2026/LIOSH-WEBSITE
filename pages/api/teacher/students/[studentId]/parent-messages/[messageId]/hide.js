import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../../../lib/security/production-guard.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import { requireTeacherApiContext, unknownQueryParams } from "../../../../../../../lib/teacher-server/teacher-request.server.js";
import {
  parseTeacherReportStudentIdParam,
} from "../../../../../../../lib/teacher-server/teacher-report.server.js";
import { hideTeacherParentMessage } from "../../../../../../../lib/teacher-server/teacher-parent-messages.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../../../lib/teacher-server/teacher-session.server.js";

const ALLOWED_QUERY = new Set(["studentId", "messageId"]);

function parseMessageIdParam(raw) {
  const id = String(raw || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, code: "validation_failed", field: "messageId" };
  }
  return { ok: true, messageId: id };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const unknown = unknownQueryParams(req.query, ALLOWED_QUERY);
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  const parsedStudent = parseTeacherReportStudentIdParam(req.query?.studentId);
  if (!parsedStudent.ok) {
    return sendTeacherApiError(res, 400, parsedStudent.code, `Invalid ${parsedStudent.field}`);
  }

  const parsedMessage = parseMessageIdParam(req.query?.messageId);
  if (!parsedMessage.ok) {
    return sendTeacherApiError(res, 400, parsedMessage.code, `Invalid ${parsedMessage.field}`);
  }

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_parent_messages_hide",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const hidden = await hideTeacherParentMessage({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: parsedStudent.studentId,
      messageId: parsedMessage.messageId,
    });

    if (!hidden.ok) {
      return sendTeacherApiError(res, hidden.status, hidden.code, hidden.code);
    }

    return res.status(200).json({ data: hidden.data });
  } catch (_e) {
    safeApiLog("teacher_parent_messages_hide_error", {});
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
