import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { buildSchoolActivityStudentAnswersPayload } from "../../../../../../../lib/school-server/school-activity-review.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const activityId = String(req.query?.activityId || "").trim();
  const studentId = String(req.query?.studentId || "").trim();
  if (!activityId || !studentId) {
    return sendSchoolApiError(res, 400, "validation_failed", "activityId and studentId required");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await buildSchoolActivityStudentAnswersPayload(
      ctx.serviceRole,
      ctx.schoolId,
      activityId,
      studentId
    );

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.message || result.code);
    }

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("school_activity_student_answers_error", {
      route: "school/activities/students/answers",
    });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
