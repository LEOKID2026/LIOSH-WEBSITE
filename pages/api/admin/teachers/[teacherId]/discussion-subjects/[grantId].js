import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import { writeAdminAuditRow } from "../../../../../../lib/admin-server/admin-audit.server.js";
import { revokePrivateTeacherSubject } from "../../../../../../lib/admin-server/admin-private-teacher-subjects.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const teacherId = req.query?.teacherId;
  const grantId = req.query?.grantId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const revoked = await revokePrivateTeacherSubject(
      ctx.serviceRole,
      String(teacherId),
      String(grantId)
    );
    if (!revoked.ok) {
      return sendAdminApiError(res, revoked.status, revoked.code, revoked.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "teacher",
      targetId: String(teacherId),
      action: "private_teacher_discussion_subject_revoked",
      beforeState: { subject: revoked.row.subject },
      afterState: null,
    });

    return res.status(200).json({ data: { revoked: true } });
  } catch (_e) {
    safeApiLog("admin_discussion_subject_revoke_error", {
      route: "admin/teachers/[teacherId]/discussion-subjects/[grantId]",
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
