import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { getSchoolWorksheetReport } from "../../../../../lib/worksheet-activities/worksheet-school.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { setSensitiveReportNoStoreHeaders } from "../../../../../lib/security/sensitive-report-response.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await getSchoolWorksheetReport(ctx.serviceRole, ctx.schoolId, worksheetId);
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json({ data: { summary: result.summary } });
  } catch (_e) {
    safeApiLog("school_worksheet_report_error", { route: "school/worksheet-activities/report" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
