import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { buildSchoolActivityMonitorPayload } from "../../../../../lib/school-server/school-activity-review.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const activityId = String(req.query?.activityId || "").trim();
  if (!activityId) {
    return sendSchoolApiError(res, 400, "validation_failed", "activityId required");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await buildSchoolActivityMonitorPayload(
      ctx.serviceRole,
      ctx.schoolId,
      activityId
    );

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.message || result.code);
    }

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("school_activity_monitor_error", { route: "school/activities/monitor" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
