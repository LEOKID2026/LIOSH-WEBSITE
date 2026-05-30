import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  deleteDraftActivity,
  getTeacherActivityDetail,
} from "../../../../lib/teacher-server/teacher-activities.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    if (req.method === "GET") {
      const detail = await getTeacherActivityDetail(ctx.serviceRole, ctx.teacherId, activityId);
      if (!detail.ok) {
        return sendTeacherApiError(res, detail.status, detail.code, detail.code);
      }
      return res.status(200).json({ data: detail });
    }

    if (req.method === "DELETE") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const deleted = await deleteDraftActivity(ctx.serviceRole, ctx.teacherId, activityId);
      if (!deleted.ok) {
        return sendTeacherApiError(res, deleted.status, deleted.code, deleted.message || deleted.code);
      }
      return res.status(204).end();
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/activities/[activityId]", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
