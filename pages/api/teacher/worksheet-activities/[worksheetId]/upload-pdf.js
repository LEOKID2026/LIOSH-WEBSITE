import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { parseWorksheetUploadPayload } from "../../../../../lib/worksheet-activities/worksheet-storage.server.js";
import { uploadWorksheetPdfForActivity } from "../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "POST") {
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    let jsonBody = null;
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("application/json")) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      try {
        jsonBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return sendTeacherApiError(res, 400, "validation_failed", "Invalid JSON");
      }
    }

    const parsed = await parseWorksheetUploadPayload(req, jsonBody);
    if (!parsed.ok) {
      return sendTeacherApiError(res, parsed.status || 400, parsed.code, parsed.message || parsed.code);
    }

    const result = await uploadWorksheetPdfForActivity(ctx.serviceRole, ctx.teacherId, worksheetId, {
      buffer: parsed.buffer,
      originalFilename: parsed.originalFilename,
      fileRole: parsed.fileRole,
    });

    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      action: "worksheet_pdf_uploaded",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { worksheetId, fileId: result.fileId, fileRole: parsed.fileRole },
    });

    return res.status(201).json({
      data: { fileId: result.fileId, originalFilename: result.originalFilename },
    });
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/upload-pdf", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
