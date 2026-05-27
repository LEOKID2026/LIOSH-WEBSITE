import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../../../lib/school-server/school-request.server.js";
import { createSchoolStudentAccess } from "../../../../../../../lib/school-server/school-account-management.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const studentId = req.query?.studentId;
  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const result = await createSchoolStudentAccess({
      serviceRole: ctx.serviceRole,
      schoolId: ctx.schoolId,
      managerId: ctx.managerId,
      studentId: String(studentId),
    });
    if (!result.ok) return sendSchoolApiError(res, result.status, result.code, result.code);
    return res.status(201).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_student_access_create_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
