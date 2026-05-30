import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { buildActivityStudentAnswersPayload } from "../../../../../../../lib/teacher-server/teacher-activities.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const activityId = req.query?.activityId;
  const studentId = req.query?.studentId;

  if (req.method !== "GET") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    const result = await buildActivityStudentAnswersPayload(
      ctx.serviceRole,
      ctx.teacherId,
      activityId,
      studentId
    );

    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.message || result.code);
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ data: result });
  } catch (err) {
    safeApiLog("teacher/activities/student-answers", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
