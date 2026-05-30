import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { reassignClassTeacher } from "../../../../../lib/school-server/school-operations.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const teacherId =
      typeof body.teacherId === "string"
        ? body.teacherId.trim()
        : typeof body.newTeacherId === "string"
          ? body.newTeacherId.trim()
          : "";

    if (!isUuid(teacherId)) {
      return sendSchoolApiError(res, 400, "validation_failed", "validation_failed");
    }

    const result = await reassignClassTeacher(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      classId: String(classId),
      newTeacherId: teacherId,
      managerId: ctx.managerId,
    });

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("school_assign_teacher_error", { route: "school/classes/assign-teacher" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
