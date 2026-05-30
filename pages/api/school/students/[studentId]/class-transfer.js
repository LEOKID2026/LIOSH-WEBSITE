import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { transferStudentBetweenSections } from "../../../../../lib/school-server/school-operations.server.js";
import {
  requireSchoolClassAdminApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = req.query?.studentId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolClassAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    const actorId = ctx.actorUserId || ctx.managerId;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fromPhysicalClass =
      typeof body.fromPhysicalClass === "string" ? body.fromPhysicalClass.trim() : "";
    const toPhysicalClass =
      typeof body.toPhysicalClass === "string" ? body.toPhysicalClass.trim() : "";
    const gradeLevel = body.gradeLevel != null ? String(body.gradeLevel).trim() : "";

    if (!fromPhysicalClass || !toPhysicalClass || !gradeLevel) {
      return sendSchoolApiError(res, 400, "validation_failed", "validation_failed");
    }

    const result = await transferStudentBetweenSections(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      studentId: String(studentId),
      fromPhysicalClass,
      toPhysicalClass,
      gradeLevel,
      managerId: actorId,
    });

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("school_class_transfer_error", { route: "school/students/class-transfer" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
