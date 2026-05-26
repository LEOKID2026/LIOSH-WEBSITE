import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { buildTeacherClassReportPayload } from "../../../../../lib/teacher-server/teacher-class-report.server.js";
import { loadSchoolClassInScope } from "../../../../../lib/school-server/school-classes.server.js";
import { writeSchoolClassViewedAudit } from "../../../../../lib/school-server/school-reports.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { resolveTeacherReportDateRange } from "../../../../../lib/teacher-server/teacher-report.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

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

    return res.status(200).json(report.payload);
  } catch (_e) {
    safeApiLog("school_class_report_error", { route: "school/classes/report-data" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
