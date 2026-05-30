import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { markTeacherSchoolMessageRead } from "../../../../../lib/school-server/school-messaging.server.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const messageId = String(req.query?.messageId || "").trim();
    const result = await markTeacherSchoolMessageRead(ctx.serviceRole, ctx.teacherId, messageId);
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("teacher_school_message_read_error", { route: "teacher/school-messages/[messageId]/read" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
