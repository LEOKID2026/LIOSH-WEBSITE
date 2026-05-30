import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { transitionStudentActivityStatus } from "../../../../../lib/teacher-server/student-activity.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";

const ACTION_AUDIT = {
  activate: "activity_activated",
  close: "activity_closed",
  archive: "activity_archived",
};

export default async function handler(req, res) {
  const activityId = req.query?.activityId;

  if (req.method !== "PATCH") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "individual_activities")) return undefined;

    const body = readJsonBody(req);
    const action = String(body.action || "").trim().toLowerCase();
    if (!action || !["activate", "close", "archive"].includes(action)) {
      return sendTeacherApiError(res, 400, "validation_failed", "invalid action");
    }

    const result = await transitionStudentActivityStatus(
      ctx.serviceRole,
      ctx.teacherId,
      activityId,
      action
    );

    if (!result.ok) {
      return sendTeacherApiError(
        res,
        result.status,
        result.code,
        result.message || result.code
      );
    }

    const auditAction = ACTION_AUDIT[action];
    if (auditAction) {
      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: auditAction,
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { scope: "student", activityId, status: result.status },
      });
    }

    return res.status(200).json({
      data: { activityId, status: result.status },
    });
  } catch (err) {
    safeApiLog("teacher/student-activities/status", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
