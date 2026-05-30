import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  inviteSchoolTeacherByManager,
  listSchoolTeachers,
} from "../../../../lib/school-server/school-teachers.server.js";
import { parseStaffInviteBody } from "../../../../lib/school-server/school-staff-invite.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const listed = await listSchoolTeachers(ctx.serviceRole, ctx.schoolId);
      if (!listed.ok) {
        return sendSchoolApiError(res, listed.status, listed.code, listed.code);
      }

      return res.status(200).json({ data: { teachers: listed.teachers } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = await parseStaffInviteBody(ctx.serviceRole, req.body, {
        userIdKey: "teacherUserId",
      });
      if (!parsed.ok) {
        return sendSchoolApiError(res, parsed.status, parsed.code, parsed.code);
      }

      const invited = await inviteSchoolTeacherByManager(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        managerId: ctx.managerId,
        teacherUserId: parsed.userId,
      });
      if (!invited.ok) {
        return sendSchoolApiError(res, invited.status, invited.code, invited.code);
      }

      return res.status(201).json({
        data: { teacherUserId: invited.teacherId, schoolId: invited.schoolId },
      });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_teachers_error", { route: "school/teachers" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
