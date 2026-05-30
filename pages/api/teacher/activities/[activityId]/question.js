import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { setLiveLessonQuestionIndex } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody, normalizeOptionalInteger } from "../../../../../lib/learning-supabase/learning-activity.js";

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  if (req.method !== "PATCH") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    const body = readJsonBody(req);
    const idx = normalizeOptionalInteger(body.currentQuestionIdx, 0, 49);
    if (idx == null) {
      return sendTeacherApiError(res, 400, "validation_failed", "currentQuestionIdx required");
    }

    const result = await setLiveLessonQuestionIndex(
      ctx.serviceRole,
      ctx.teacherId,
      activityId,
      idx
    );

    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.message || result.code);
    }

    return res.status(200).json({
      data: { activityId, currentQuestionIdx: result.currentQuestionIdx },
    });
  } catch (err) {
    safeApiLog("teacher/activities/question", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
