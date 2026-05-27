import { safeApiLog } from "../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { buildGuardianStudentReportPayload } from "../../../lib/guardian-server/guardian-report.server.js";
import {
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../lib/guardian-server/guardian-session.server.js";
import { resolveStudentPhysicalClass } from "../../../lib/school-server/school-messaging.server.js";
import { parseTeacherReportStudentIdParam, parseReportWindowDays, resolveTeacherReportDateRange } from "../../../lib/teacher-server/teacher-report.server.js";
import { unknownQueryParams } from "../../../lib/teacher-server/teacher-request.server.js";

const ALLOWED_QUERY = new Set(["studentId", "windowDays", "from", "to"]);

function buildMiniReportFromPayload(built, physicalClassName) {
  const report = built.payload?.report || {};
  const student = built.payload?.student || report.student || {};
  const subjects = report.subjects && typeof report.subjects === "object" ? report.subjects : {};

  const subjectSummary = Object.entries(subjects)
    .filter(([, value]) => value && typeof value === "object" && Number(value.answers) > 0)
    .map(([subjectKey, value]) => ({
      subjectKey,
      accuracy: value.accuracy ?? 0,
      answers: value.answers ?? 0,
    }))
    .sort((a, b) => b.answers - a.answers)
    .slice(0, 4);

  const parentFacing =
    report.parentFacing && typeof report.parentFacing === "object" ? report.parentFacing : {};

  return {
    childName: student.full_name ?? null,
    gradeLevel: student.grade_level ?? null,
    physicalClass: physicalClassName,
    subjectSummary,
    strengths: (parentFacing.insights || []).slice(0, 3),
    areasForPractice: (parentFacing.homeRecommendations || []).slice(0, 2),
    lastTeacherMessages: (parentFacing.teacherMessages || []).slice(0, 3),
    lastUpdated: new Date().toISOString(),
    range: built.payload?.range || null,
  };
}

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

  const parsedId =
    req.query?.studentId != null && String(req.query.studentId).trim() !== ""
      ? parseTeacherReportStudentIdParam(req.query.studentId)
      : { ok: true, studentId: null };

  if (!parsedId.ok) {
    return sendGuardianApiError(res, 400, parsedId.code, `Invalid ${parsedId.field}`);
  }

  const rangeQuery =
    req.query?.from || req.query?.to
      ? req.query
      : { windowDays: req.query?.windowDays ?? 30 };
  const range = resolveTeacherReportDateRange(rangeQuery);
  if (!range.ok) {
    return sendGuardianApiError(res, 400, range.code, "Invalid date range");
  }

  try {
    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (!ctx.accessRow?.created_by_school_id) {
      return sendGuardianApiError(res, 403, "not_school_guardian", "not_school_guardian");
    }

    const studentId = parsedId.studentId || ctx.studentId;
    if (studentId !== ctx.studentId) {
      return sendGuardianApiError(res, 403, "student_scope_violation", "student_scope_violation");
    }

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "guardian_mini_report",
        keys: [`ip:${ip}`, `access:${ctx.guardianAccessId}`],
        maxAttempts: 30,
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
      requestedStudentId: studentId,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    if (!built.ok) {
      return sendGuardianApiError(res, built.status, built.code, built.code);
    }

    let physicalClassName = null;
    if (ctx.accessRow?.created_by_school_id) {
      const physical = await resolveStudentPhysicalClass(
        ctx.serviceRole,
        ctx.accessRow.created_by_school_id,
        studentId
      );
      if (physical.ok) {
        physicalClassName = physical.physicalClassName;
      }
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const miniReport = buildMiniReportFromPayload(built, physicalClassName);
    return res.status(200).json({ data: { miniReport } });
  } catch (_e) {
    safeApiLog("parent_mini_report_error", { route: "parent/mini-report" });
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
