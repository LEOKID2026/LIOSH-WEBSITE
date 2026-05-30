import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { suspendSchoolStaffAccess } from "../../../../../lib/school-server/school-staff-management.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const teacherId = req.query?.teacherId;
  if (!isUuid(String(teacherId || ""))) {
    return sendSchoolApiError(res, 400, "validation_failed", "validation_failed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await suspendSchoolStaffAccess(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      managerId: ctx.managerId,
      userId: String(teacherId),
    });
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: { suspended: true } });
  } catch (_e) {
    safeApiLog("school_teacher_suspend_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
