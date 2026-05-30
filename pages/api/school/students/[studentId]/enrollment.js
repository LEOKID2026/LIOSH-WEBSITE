import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { unenrollStudentFromSchool } from "../../../../../lib/school-server/school-students.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = req.query?.studentId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await unenrollStudentFromSchool(
      ctx.serviceRole,
      ctx.schoolId,
      String(studentId)
    );
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.managerId,
      studentId: String(studentId),
      action: "school_student_unenrolled",
      actorRole: "teacher",
      actorId: ctx.managerId,
      metadata: { school_id: ctx.schoolId },
    });

    return res.status(200).json({ data: { removed: true } });
  } catch (_e) {
    safeApiLog("school_unenroll_error", { route: "school/students/enrollment" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
