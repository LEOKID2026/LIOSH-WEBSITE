import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { loadStudentActivityBatchMonitor } from "../../../../../lib/teacher-server/student-activity.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const batchId = String(req.query?.batchId || "").trim();

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "individual_activities")) return undefined;

    if (req.method === "GET") {
      const result = await loadStudentActivityBatchMonitor(
        ctx.serviceRole,
        ctx.teacherId,
        batchId
      );
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({ data: result });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/student-activities/batch/[batchId]", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
