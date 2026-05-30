import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { requireTeacherApiContext, unknownQueryParams } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { getTeacherWorksheetPdfUrl } from "../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "GET") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const unknown = unknownQueryParams(req.query, new Set(["worksheetId", "fileRole"]));
    if (unknown.length) {
      return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
    }

    const fileRole = req.query?.fileRole != null ? String(req.query.fileRole).trim() : "worksheet";
    const result = await getTeacherWorksheetPdfUrl(ctx.serviceRole, ctx.teacherId, worksheetId, fileRole);
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({
      data: { signedUrl: result.signedUrl, expiresIn: result.expiresIn },
    });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/pdf-url", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
