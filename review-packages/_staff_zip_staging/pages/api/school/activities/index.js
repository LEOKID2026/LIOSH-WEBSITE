import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listSchoolActivities } from "../../../../lib/school-server/school-reports.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";
import { unknownQueryParams } from "../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const unknown = unknownQueryParams(req.query, new Set(["teacherId", "classId", "subject", "status", "limit"]));
    if (unknown.length) {
      return sendSchoolApiError(res, 400, "validation_failed", "Unknown query parameters");
    }

    const listed = await listSchoolActivities(ctx.serviceRole, ctx.schoolId, {
      teacherId: req.query?.teacherId ? String(req.query.teacherId) : undefined,
      classId: req.query?.classId ? String(req.query.classId) : undefined,
      subject: req.query?.subject ? String(req.query.subject) : undefined,
      status: req.query?.status ? String(req.query.status) : undefined,
      limit: req.query?.limit ? Number(req.query.limit) : undefined,
    });

    if (!listed.ok) {
      return sendSchoolApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { activities: listed.activities } });
  } catch (_e) {
    safeApiLog("school_activities_list_error", { route: "school/activities" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
