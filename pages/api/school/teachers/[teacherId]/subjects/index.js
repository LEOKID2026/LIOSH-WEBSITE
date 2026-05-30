import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../../lib/teacher-server/teacher-audit.server.js";
import { verifyTeacherMembershipInSchool } from "../../../../../../lib/school-server/school-membership.server.js";
import {
  grantSchoolTeacherSubject,
  listSchoolTeacherSubjects,
} from "../../../../../../lib/school-server/school-subjects.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  const teacherId = req.query?.teacherId;

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const verified = await verifyTeacherMembershipInSchool(
      ctx.serviceRole,
      ctx.schoolId,
      String(teacherId)
    );
    if (!verified.ok) {
      return sendSchoolApiError(res, verified.status, verified.code, verified.code);
    }

    if (req.method === "GET") {
      const listed = await listSchoolTeacherSubjects(
        ctx.serviceRole,
        ctx.schoolId,
        String(teacherId)
      );
      if (!listed.ok) {
        return sendSchoolApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { subjects: listed.subjects } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const granted = await grantSchoolTeacherSubject(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        teacherId: String(teacherId),
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        grantedBy: ctx.managerId,
      });

      if (!granted.ok) {
        return sendSchoolApiError(res, granted.status, granted.code, granted.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.managerId,
        action: "school_subject_granted",
        actorRole: "teacher",
        actorId: ctx.managerId,
        metadata: {
          school_id: ctx.schoolId,
          target_teacher_id: teacherId,
          subject: granted.row.subject,
          grade_level: granted.row.grade_level,
        },
      });

      return res.status(201).json({ data: { subject: granted.row } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_teacher_subjects_error", { route: "school/teachers/subjects" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
