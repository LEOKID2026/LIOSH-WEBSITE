import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../../lib/teacher-server/teacher-audit.server.js";
import { revokeSchoolTeacherSubject } from "../../../../../../lib/school-server/school-subjects.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const subjectId = req.query?.subjectId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const revoked = await revokeSchoolTeacherSubject(
      ctx.serviceRole,
      ctx.schoolId,
      String(subjectId)
    );
    if (!revoked.ok) {
      return sendSchoolApiError(res, revoked.status, revoked.code, revoked.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.managerId,
      action: "school_subject_revoked",
      actorRole: "teacher",
      actorId: ctx.managerId,
      metadata: {
        school_id: ctx.schoolId,
        target_teacher_id: revoked.row.teacher_id,
        subject: revoked.row.subject,
        subject_permission_id: subjectId,
      },
    });

    return res.status(200).json({ data: { removed: true } });
  } catch (_e) {
    safeApiLog("school_subject_revoke_error", { route: "school/teachers/subjects/[subjectId]" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
