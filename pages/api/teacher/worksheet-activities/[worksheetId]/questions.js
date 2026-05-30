import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { upsertWorksheetQuestions } from "../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "POST") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const body = readJsonBody(req);
    const questions = Array.isArray(body?.questions) ? body.questions : [];
    const result = await upsertWorksheetQuestions(
      ctx.serviceRole,
      ctx.teacherId,
      worksheetId,
      questions
    );
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: { questionCount: result.questionCount } });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/questions", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
