import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { listSchoolMessageUnreadRecipients } from "../../../../../lib/school-server/school-messaging.server.js";
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
    const recipientType = req.query?.recipientType ? String(req.query.recipientType).trim() : null;

    const result = await listSchoolMessageUnreadRecipients(
      ctx.serviceRole,
      ctx.schoolId,
      messageId,
      recipientType === "parent" || recipientType === "teacher" ? recipientType : null
    );

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_message_unread_recipients_error", {
      route: "school/messages/[messageId]/unread-recipients",
    });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
