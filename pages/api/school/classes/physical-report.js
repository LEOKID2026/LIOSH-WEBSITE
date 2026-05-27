import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { buildSchoolPhysicalClassReportPayload } from "../../../../lib/school-server/school-physical-class-report.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { resolveTeacherReportDateRange } from "../../../../lib/teacher-server/teacher-report.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const gradeLevel = req.query?.gradeLevel;
  const physicalClassName = req.query?.physicalClassName;

  if (!gradeLevel || !String(gradeLevel).trim()) {
    return sendSchoolApiError(res, 400, "validation_failed", "gradeLevel is required");
  }
  if (!physicalClassName || !String(physicalClassName).trim()) {
    return sendSchoolApiError(res, 400, "validation_failed", "physicalClassName is required");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const range = resolveTeacherReportDateRange(req.query);
    if (!range.ok) {
      return sendSchoolApiError(res, 400, range.code, range.code);
    }

    const report = await buildSchoolPhysicalClassReportPayload({
      serviceRole: ctx.serviceRole,
      schoolId: ctx.schoolId,
      gradeLevel: String(gradeLevel).trim(),
      physicalClassName: decodeURIComponent(String(physicalClassName).trim()),
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    if (!report.ok) {
      return sendSchoolApiError(res, report.status, report.code, report.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.managerId,
      action: "school_class_viewed",
      actorRole: "teacher",
      actorId: ctx.managerId,
      metadata: {
        school_id: ctx.schoolId,
        source: "physical_class_report",
        grade_level: String(gradeLevel).trim(),
        physical_class_name: decodeURIComponent(String(physicalClassName).trim()),
      },
    });

    return res.status(200).json(report.payload);
  } catch (_e) {
    safeApiLog("school_physical_class_report_error", { route: "school/classes/physical-report" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
