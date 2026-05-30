import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { transitionWorksheetStatus } from "../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

const ACTION_AUDIT = {
  activate: "worksheet_activity_activated",
  close: "worksheet_activity_closed",
  archive: "worksheet_activity_archived",
};

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "PATCH") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const body = readJsonBody(req);
    const action = String(body.action || body.status || "").trim().toLowerCase();
    if (!["activate", "close", "archive"].includes(action)) {
      return sendTeacherApiError(res, 400, "validation_failed", "invalid action");
    }

    const result = await transitionWorksheetStatus(ctx.serviceRole, ctx.teacherId, worksheetId, action);
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.message || result.code);
    }

    const auditAction = ACTION_AUDIT[action];
    if (auditAction) {
      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: auditAction,
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { worksheetId, status: result.status },
      });
    }

    return res.status(200).json({ data: { worksheetId, status: result.status } });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/status", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
