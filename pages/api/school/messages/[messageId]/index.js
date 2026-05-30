import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { getSchoolMessageDetail } from "../../../../../lib/school-server/school-messaging.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const messageId = String(req.query?.messageId || "").trim();
    const result = await getSchoolMessageDetail(ctx.serviceRole, ctx.schoolId, messageId);
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_message_detail_error", { route: "school/messages/[messageId]" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
