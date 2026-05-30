import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import {
  getStudentSchoolAssignment,
  updateStudentSchoolAssignment,
} from "../../../../../lib/school-server/school-physical-classes.server.js";
import {
  requireSchoolClassAdminApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  const studentId = req.query?.studentId;

  try {
    const ctx = await requireSchoolClassAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    const actorId = ctx.actorUserId || ctx.managerId;

    if (req.method === "GET") {
      const result = await getStudentSchoolAssignment(ctx.serviceRole, ctx.schoolId, String(studentId));
      if (!result.ok) {
        return sendSchoolApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({ data: { assignment: result.assignment } });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await updateStudentSchoolAssignment(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        studentId: String(studentId),
        managerId: actorId,
        toGradeLevel: body.toGradeLevel ?? body.gradeLevel,
        toPhysicalClassName: body.toPhysicalClassName ?? body.physicalClassName,
        fromGradeLevel: body.fromGradeLevel ?? null,
        fromPhysicalClassName: body.fromPhysicalClassName ?? null,
      });

      if (!result.ok) {
        return sendSchoolApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({ data: { assignment: result } });
    }

    res.setHeader("Allow", "GET, PATCH, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_student_assignment_error", { route: "school/students/assignment" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
