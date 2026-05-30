import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { previewSchoolMessageAudience } from "../../../../lib/school-server/school-messaging.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const audienceType = String(req.query?.audienceType || "").trim();
    if (!audienceType) {
      return sendSchoolApiError(res, 400, "validation_failed", "validation_failed");
    }

    const audienceScope = {
      gradeLevel: req.query?.gradeLevel,
      physicalClassName: req.query?.physicalClassName,
      subjectKey: req.query?.subjectKey,
      teacherId: req.query?.teacherId,
      guardianAccessId: req.query?.guardianAccessId,
      studentId: req.query?.studentId,
    };

    const result = await previewSchoolMessageAudience(
      ctx.serviceRole,
      ctx.schoolId,
      audienceType,
      audienceScope
    );

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_messages_audience_preview_error", { route: "school/messages/audience-preview" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
