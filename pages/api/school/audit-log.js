import { safeApiLog } from "../../../lib/security/safe-log.js";
import { setSensitiveReportNoStoreHeaders } from "../../../lib/security/sensitive-report-response.server.js";
import { listSchoolAuditLog } from "../../../lib/school-server/school-operations.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const limit = req.query?.limit;
    const offset = req.query?.offset;
    const action = req.query?.action;

    const result = await listSchoolAuditLog(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      limit: limit != null ? Number(limit) : 50,
      offset: offset != null ? Number(offset) : 0,
      action: action != null ? String(action) : null,
    });

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json({
      data: {
        entries: result.entries,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (_e) {
    safeApiLog("school_audit_log_error", { route: "school/audit-log" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
