import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { archiveSchoolClass } from "../../../../../lib/school-server/school-operations.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await archiveSchoolClass(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      classId: String(classId),
      managerId: ctx.managerId,
    });

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("school_class_archive_error", { route: "school/classes/archive" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
