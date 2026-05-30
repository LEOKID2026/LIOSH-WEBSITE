import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { buildTeacherClassReportPayload } from "../../../../../lib/teacher-server/teacher-class-report.server.js";
import { loadSchoolClassInScope } from "../../../../../lib/school-server/school-classes.server.js";
import { writeSchoolClassViewedAudit } from "../../../../../lib/school-server/school-reports.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { resolveTeacherReportDateRange } from "../../../../../lib/teacher-server/teacher-report.server.js";
import { stripInternalReportPayloadFields } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { setSensitiveReportNoStoreHeaders } from "../../../../../lib/security/sensitive-report-response.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "school_class_report_data",
        keys: [`ip:${ip}`, `manager:${ctx.managerId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendSchoolApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const inScope = await loadSchoolClassInScope(ctx.serviceRole, ctx.schoolId, String(classId));
    if (!inScope.ok) {
      return sendSchoolApiError(res, inScope.status, inScope.code, inScope.code);
    }

    const range = resolveTeacherReportDateRange(req.query);
    if (!range.ok) {
      return sendSchoolApiError(res, 400, range.code, range.code);
    }

    const report = await buildTeacherClassReportPayload({
      serviceRole: ctx.serviceRole,
      teacherId: inScope.classRow.teacher_id,
      classId: String(classId),
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    if (!report.ok) {
      return sendSchoolApiError(res, report.status, report.code, report.code);
    }

    await writeSchoolClassViewedAudit(ctx.serviceRole, ctx.managerId, ctx.schoolId, String(classId));

    const classIdStr = String(classId);
    const [{ count: classroomActivityCount }, { data: recentClassroomActivities }] = await Promise.all([
      ctx.serviceRole
        .from("classroom_activities")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classIdStr)
        .neq("status", "archived"),
      ctx.serviceRole
        .from("classroom_activities")
        .select("id, title, subject, mode, status, created_at, activated_at, closed_at")
        .eq("class_id", classIdStr)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json({
      ...stripInternalReportPayloadFields(report.payload),
      schoolManagerExtras: {
        classroomActivityCount: classroomActivityCount ?? 0,
        recentClassroomActivities: recentClassroomActivities || [],
      },
    });
  } catch (_e) {
    safeApiLog("school_class_report_error", { route: "school/classes/report-data" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
