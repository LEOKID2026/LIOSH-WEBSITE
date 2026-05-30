import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { hideSchoolMessage } from "../../../../../lib/school-server/school-messaging.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const messageId = String(req.query?.messageId || "").trim();
    const result = await hideSchoolMessage(ctx.serviceRole, ctx.schoolId, messageId, ctx.managerId);
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_message_hide_error", { route: "school/messages/[messageId]/hide" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
