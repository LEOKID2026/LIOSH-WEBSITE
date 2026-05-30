import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { buildActivityMonitorPayload } from "../../../../../lib/teacher-server/teacher-activities.server.js";
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
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    const result = await buildActivityMonitorPayload(
      ctx.serviceRole,
      ctx.teacherId,
      activityId
    );

    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ data: result });
  } catch (err) {
    safeApiLog("teacher/activities/monitor", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
