import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import {
  buildTeacherClassReportPayload,
  parseTeacherReportClassIdParam,
} from "../../../../../lib/teacher-server/teacher-class-report.server.js";
import {
  parseReportWindowDays,
  resolveTeacherReportDateRange,
} from "../../../../../lib/teacher-server/teacher-report.server.js";
import { requireTeacherApiContext, unknownQueryParams } from "../../../../../lib/teacher-server/teacher-request.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../lib/teacher-server/teacher-session.server.js";

const ALLOWED_QUERY = new Set(["from", "to", "windowDays", "classId"]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;

  const unknown = unknownQueryParams(req.query, ALLOWED_QUERY);
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  if (req.query?.windowDays != null && parseReportWindowDays(req.query.windowDays) == null) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid windowDays");
  }

  const parsedId = parseTeacherReportClassIdParam(req.query?.classId);
  if (!parsedId.ok) {
    return sendTeacherApiError(res, 400, parsedId.code, `Invalid ${parsedId.field}`);
  }

  const range = resolveTeacherReportDateRange(req.query);
  if (!range.ok) {
    return sendTeacherApiError(res, 400, range.code, "Invalid date range");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_class_report_data",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 20,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const built = await buildTeacherClassReportPayload({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      classId: parsedId.classId,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    if (!built.ok) {
      return sendTeacherApiError(res, built.status, built.code, built.code);
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json(built.payload);
  } catch (_e) {
    safeApiLog("teacher_class_report_data_error", { route: "report-data" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
