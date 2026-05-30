import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../../../lib/teacher-server/teacher-session.server.js";
import { publishStudentWorksheetResult } from "../../../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();
  const studentId = String(req.query?.studentId || "").trim();

  if (req.method !== "POST") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await publishStudentWorksheetResult(
      ctx.serviceRole,
      ctx.teacherId,
      worksheetId,
      studentId
    );
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      action: "worksheet_result_published",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { worksheetId, studentId, finalScorePct: result.finalScorePct },
    });

    return res.status(200).json({ data: { finalScorePct: result.finalScorePct } });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/student/publish", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
