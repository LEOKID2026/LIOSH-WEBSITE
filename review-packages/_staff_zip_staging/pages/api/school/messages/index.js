import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  listSchoolMessages,
  sendSchoolMessage,
} from "../../../../lib/school-server/school-messaging.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const result = await listSchoolMessages(ctx.serviceRole, ctx.schoolId, {
        limit: req.query?.limit,
        cursor: req.query?.cursor,
        offset: req.query?.offset,
        audienceType: req.query?.audienceType,
        messageType: req.query?.messageType,
        includeHidden: req.query?.includeHidden === "true",
        days: req.query?.days,
        sentAfter: req.query?.sentAfter,
        sentBefore: req.query?.sentBefore,
        allTime: req.query?.allTime === "true",
      });

      if (!result.ok) {
        return sendSchoolApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({ data: result.data });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const sent = await sendSchoolMessage({
        serviceRole: ctx.serviceRole,
        schoolId: ctx.schoolId,
        authorId: ctx.managerId,
        audienceType: body.audienceType,
        audienceScope: body.audienceScope,
        messageType: body.messageType,
        subject: body.subject,
        body: body.body,
        hasAttachment: body.hasAttachment,
        attachmentUrl: body.attachmentUrl,
      });

      if (!sent.ok) {
        return sendSchoolApiError(res, sent.status, sent.code, sent.code);
      }

      return res.status(201).json({ data: sent.data });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_messages_index_error", { route: "school/messages" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
