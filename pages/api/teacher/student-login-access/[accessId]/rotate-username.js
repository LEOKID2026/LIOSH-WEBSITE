import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { rotateTeacherStudentLoginUsername } from "../../../../../lib/teacher-server/teacher-student-login-access.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;

  try {
    const accessId = String(req.query?.accessId || "").trim();
    const result = await rotateTeacherStudentLoginUsername({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      accessId,
    });
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }
    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("teacher_student_login_access_rotate_username_error", {});
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
