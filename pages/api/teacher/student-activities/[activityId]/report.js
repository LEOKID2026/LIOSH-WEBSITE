import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { buildStudentActivityReportPayload } from "../../../../../lib/teacher-server/student-activity.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  if (req.method !== "GET") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "individual_activities")) return undefined;

    const report = await buildStudentActivityReportPayload(
      ctx.serviceRole,
      ctx.teacherId,
      activityId
    );

    if (!report.ok) {
      return sendTeacherApiError(res, report.status, report.code, report.message || report.code);
    }

    return res.status(200).json({ data: report });
  } catch (err) {
    safeApiLog("teacher/student-activities/report", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
