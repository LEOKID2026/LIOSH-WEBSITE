import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { getTeacherSchoolMessage } from "../../../../../lib/school-server/school-messaging.server.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const messageId = String(req.query?.messageId || "").trim();
    const result = await getTeacherSchoolMessage(ctx.serviceRole, ctx.teacherId, messageId);
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("teacher_school_message_detail_error", { route: "teacher/school-messages/[messageId]" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
