import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import { writeAdminAuditRow } from "../../../../../../lib/admin-server/admin-audit.server.js";
import {
  grantPrivateTeacherSubject,
  listPrivateTeacherSubjects,
} from "../../../../../../lib/admin-server/admin-private-teacher-subjects.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const teacherId = req.query?.teacherId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const listed = await listPrivateTeacherSubjects(ctx.serviceRole, String(teacherId));
      if (!listed.ok) {
        return sendAdminApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { subjects: listed.subjects } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const granted = await grantPrivateTeacherSubject(ctx.serviceRole, {
        teacherId: String(teacherId),
        subject: body.subject,
        grantedBy: ctx.adminUserId,
      });

      if (!granted.ok) {
        return sendAdminApiError(res, granted.status, granted.code, granted.code);
      }

      await writeAdminAuditRow(ctx.serviceRole, {
        adminUserId: ctx.adminUserId,
        targetType: "teacher",
        targetId: String(teacherId),
        action: "private_teacher_discussion_subject_granted",
        beforeState: null,
        afterState: {
          subject: granted.row.subject,
        },
      });

      return res.status(201).json({ data: { subject: granted.row } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_discussion_subjects_error", {
      route: "admin/teachers/[teacherId]/discussion-subjects",
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
