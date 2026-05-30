import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { countTeacherSchoolMessagesUnread } from "../../../../lib/school-server/school-messaging.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await countTeacherSchoolMessagesUnread(ctx.serviceRole, ctx.teacherId);
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("teacher_school_messages_unread_count_error", {
      route: "teacher/school-messages/unread-count",
    });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
