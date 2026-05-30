import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { sendHomeroomTeacherMessage } from "../../../../lib/school-server/school-messaging.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sent = await sendHomeroomTeacherMessage({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      audienceType: body.audienceType,
      audienceScope: body.audienceScope,
      messageType: body.messageType,
      subject: body.subject,
      body: body.body,
      hasAttachment: body.hasAttachment,
      attachmentUrl: body.attachmentUrl,
    });

    if (!sent.ok) {
      return sendTeacherApiError(res, sent.status, sent.code, sent.code);
    }

    return res.status(201).json({ data: sent.data });
  } catch (_e) {
    safeApiLog("teacher_school_messages_send_error", { route: "teacher/school-messages/send" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
