import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import {
  archiveWorksheetActivity,
  getTeacherWorksheetDetail,
  patchWorksheetActivity,
} from "../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const result = await getTeacherWorksheetDetail(ctx.serviceRole, ctx.teacherId, worksheetId);
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({
        data: {
          worksheet: result.worksheet,
          files: result.files,
          questions: result.questions,
        },
      });
    }

    if (req.method === "PATCH") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
      const body = readJsonBody(req);
      const result = await patchWorksheetActivity(ctx.serviceRole, ctx.teacherId, worksheetId, body);
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({ data: { ok: true } });
    }

    if (req.method === "DELETE") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
      const result = await archiveWorksheetActivity(ctx.serviceRole, ctx.teacherId, worksheetId);
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({ data: { status: result.status } });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/detail", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
