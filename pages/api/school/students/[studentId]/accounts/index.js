import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import {
  requireSchoolCredentialAdminApiContext,
  sendSchoolApiError,
} from "../../../../../../lib/school-server/school-request.server.js";
import { listSchoolStudentAccounts } from "../../../../../../lib/school-server/school-account-management.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = req.query?.studentId;

  try {
    const ctx = await requireSchoolCredentialAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    const result = await listSchoolStudentAccounts(ctx.serviceRole, ctx.schoolId, String(studentId));
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_accounts_list_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
