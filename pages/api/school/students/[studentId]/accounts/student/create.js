import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import { rejectIfTeacherPortalDisabled } from "../../../../../../../lib/teacher-server/teacher-session.server.js";
import { maybeWriteOperatorCredentialAudit } from "../../../../../../../lib/school-server/school-operator.server.js";
import {
  requireSchoolCredentialAdminApiContext,
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
    if (rejectIfTeacherPortalDisabled(res)) return undefined;

    const ctx = await requireSchoolCredentialAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    const actorId = ctx.actorUserId || ctx.managerId;
    const result = await createSchoolStudentAccess({
      serviceRole: ctx.serviceRole,
      schoolId: ctx.schoolId,
      managerId: actorId,
      studentId: String(studentId),
    });
    if (!result.ok) return sendSchoolApiError(res, result.status, result.code, result.code);

    await maybeWriteOperatorCredentialAudit(ctx, {
      studentId: String(studentId),
      actionType: "credential_create_student",
    });

    return res.status(201).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_student_access_create_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
