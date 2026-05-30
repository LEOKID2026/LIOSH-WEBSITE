import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import { maybeWriteOperatorCredentialAudit } from "../../../../../../../lib/school-server/school-operator.server.js";
import {
  requireSchoolCredentialAdminApiContext,
  sendSchoolApiError,
} from "../../../../../../../lib/school-server/school-request.server.js";
import { rotateSchoolStudentPin } from "../../../../../../../lib/school-server/school-account-management.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const studentId = req.query?.studentId;
  const accessId = req.body?.accessId;
  if (!accessId) return sendSchoolApiError(res, 400, "validation_failed", "accessId required");

  try {
    const ctx = await requireSchoolCredentialAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    const actorId = ctx.actorUserId || ctx.managerId;
    const result = await rotateSchoolStudentPin({
      serviceRole: ctx.serviceRole,
      schoolId: ctx.schoolId,
      managerId: actorId,
      studentId: String(studentId),
      accessId: String(accessId),
    });
    if (!result.ok) return sendSchoolApiError(res, result.status, result.code, result.code);

    await maybeWriteOperatorCredentialAudit(ctx, {
      studentId: String(studentId),
      actionType: "credential_reset_student_pin",
    });

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_student_reset_pin_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
