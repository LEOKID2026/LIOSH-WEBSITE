import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { getSchoolStudentBrowseSummary } from "../../../../lib/school-server/school-students.server.js";
import {
  requireSchoolStudentBrowseApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolStudentBrowseApiContext(res, req);
    if (ctx.stopped) return undefined;

    const summary = await getSchoolStudentBrowseSummary(ctx.serviceRole, ctx.schoolId);
    if (!summary.ok) {
      return sendSchoolApiError(res, summary.status, summary.code, summary.code);
    }

    return res.status(200).json({ data: { summary } });
  } catch (_e) {
    safeApiLog("school_students_browse_summary_error", { route: "school/students/browse-summary" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
