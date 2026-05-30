import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  inviteSchoolTeacherByManager,
  listSchoolTeachers,
} from "../../../../lib/school-server/school-teachers.server.js";
import { parseStaffInviteBody } from "../../../../lib/school-server/school-staff-invite.server.js";
import {
  parseCreateStaffBody,
  provisionSchoolTeacherStaff,
} from "../../../../lib/school-server/school-staff-provision.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
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

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const hasInviteTarget =
        (typeof body.teacherUserId === "string" && body.teacherUserId.trim()) ||
        (typeof body.email === "string" && body.email.trim());

      if (!hasInviteTarget) {
        const parsedCreate = parseCreateStaffBody(body);
        if (!parsedCreate.ok) {
          return sendSchoolApiError(res, parsedCreate.status, parsedCreate.code, parsedCreate.code);
        }

        const provisioned = await provisionSchoolTeacherStaff(ctx.serviceRole, {
          schoolId: ctx.schoolId,
          managerId: ctx.managerId,
          displayName: parsedCreate.displayName,
        });
        if (!provisioned.ok) {
          return sendSchoolApiError(res, provisioned.status, provisioned.code, provisioned.code);
        }

        return res.status(201).json({
          data: {
            teacherUserId: provisioned.userId,
            schoolId: provisioned.schoolId,
            staffCode: provisioned.staffCode,
            initialPin: provisioned.initialPin,
            provisionMode: "code_pin",
          },
        });
      }

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
