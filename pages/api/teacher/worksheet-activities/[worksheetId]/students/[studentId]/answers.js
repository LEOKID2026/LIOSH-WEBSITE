import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { requireTeacherApiContext } from "../../../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../../../lib/teacher-server/teacher-session.server.js";
import { getStudentWorksheetAnswersForTeacher } from "../../../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();
  const studentId = String(req.query?.studentId || "").trim();

  if (req.method !== "GET") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await getStudentWorksheetAnswersForTeacher(
      ctx.serviceRole,
      ctx.teacherId,
      worksheetId,
      studentId
    );
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({
      data: {
        status: result.status,
        questions: result.questions,
        answers: result.answers,
      },
    });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/student/answers", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
