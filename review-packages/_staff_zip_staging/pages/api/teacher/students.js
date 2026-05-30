import { safeApiLog } from "../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import {
  parseBooleanQuery,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../lib/teacher-server/teacher-request.server.js";
import { listTeacherStudents } from "../../../lib/teacher-server/teacher-students.server.js";
import { sendTeacherApiError } from "../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const unknown = unknownQueryParams(req.query, new Set(["includeArchived"]));
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  const includeArchived = parseBooleanQuery(req.query?.includeArchived, false);
  if (includeArchived === null) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid includeArchived");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_students_list",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const listed = await listTeacherStudents(ctx.serviceRole, ctx.teacherId, {
      includeArchived,
      planCode: ctx.limits.planCode,
      studentLimit: ctx.limits.studentLimit,
    });

    if (!listed.ok) {
      return sendTeacherApiError(
        res,
        listed.status,
        listed.code,
        listed.code === "db_schema_not_ready"
          ? "teacher_portal schema not yet applied"
          : "Unexpected server error"
      );
    }

    return res.status(200).json({ data: { students: listed.students, limits: listed.limits } });
  } catch (_e) {
    safeApiLog("teacher_students_list_error", { route: "students" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
