import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import {
  buildGuardianStudentReportPayload,
  resolveTeacherReportDateRange,
} from "../../../../../lib/guardian-server/guardian-report.server.js";
import {
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../../../lib/guardian-server/guardian-session.server.js";
import { parseTeacherReportStudentIdParam, parseReportWindowDays } from "../../../../../lib/teacher-server/teacher-report.server.js";
import { unknownQueryParams } from "../../../../../lib/teacher-server/teacher-request.server.js";

const ALLOWED_QUERY = new Set(["from", "to", "windowDays", "studentId"]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const unknown = unknownQueryParams(req.query, ALLOWED_QUERY);
  if (unknown.length) {
    return sendGuardianApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  if (req.query?.windowDays != null && parseReportWindowDays(req.query.windowDays) == null) {
    return sendGuardianApiError(res, 400, "validation_failed", "Invalid windowDays");
  }

  const parsedId = parseTeacherReportStudentIdParam(req.query?.studentId);
  if (!parsedId.ok) {
    return sendGuardianApiError(res, 400, parsedId.code, `Invalid ${parsedId.field}`);
  }

  const range = resolveTeacherReportDateRange(req.query);
  if (!range.ok) {
    return sendGuardianApiError(res, 400, range.code, "Invalid date range");
  }

  try {
    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "guardian_student_report",
        keys: [`ip:${ip}`, `access:${ctx.guardianAccessId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendGuardianApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const built = await buildGuardianStudentReportPayload({
      serviceRole: ctx.serviceRole,
      guardianAccessId: ctx.guardianAccessId,
      boundStudentId: ctx.studentId,
      requestedStudentId: parsedId.studentId,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    if (!built.ok) {
      return sendGuardianApiError(res, built.status, built.code, built.code);
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json(built.payload);
  } catch (_e) {
    safeApiLog("guardian_student_report_error", {});
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
