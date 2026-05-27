import { safeApiLog } from "../../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../../lib/security/same-origin.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../../../lib/school-server/school-request.server.js";
import { linkSchoolParentByUsername } from "../../../../../../../lib/school-server/school-account-management.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const studentId = req.query?.studentId;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!body.loginUsername) {
    return sendSchoolApiError(res, 400, "validation_failed", "loginUsername required");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const result = await linkSchoolParentByUsername({
      serviceRole: ctx.serviceRole,
      schoolId: ctx.schoolId,
      managerId: ctx.managerId,
      studentId: String(studentId),
      loginUsername: String(body.loginUsername).trim(),
      guardianRelation: body.guardianRelation,
      guardianDisplayLabel: body.guardianDisplayLabel,
    });
    if (!result.ok) return sendSchoolApiError(res, result.status, result.code, result.code);
    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_parent_link_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
