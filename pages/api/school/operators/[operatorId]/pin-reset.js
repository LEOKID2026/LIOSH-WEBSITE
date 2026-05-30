import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { resetSchoolStaffPin } from "../../../../../lib/school-server/school-staff-management.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const operatorId = req.query?.operatorId;
  if (!isUuid(String(operatorId || ""))) {
    return sendSchoolApiError(res, 400, "validation_failed", "validation_failed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await resetSchoolStaffPin(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      managerId: ctx.managerId,
      userId: String(operatorId),
    });
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({
      data: { staffCode: result.staffCode, initialPin: result.initialPin },
    });
  } catch (_e) {
    safeApiLog("school_operator_pin_reset_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
