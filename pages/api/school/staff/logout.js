import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { setSensitiveReportNoStoreHeaders } from "../../../../lib/security/sensitive-report-response.server.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  clearStaffSessionCookie,
  staffLogout,
} from "../../../../lib/school-server/school-staff-session.server.js";
import { sendSchoolApiError } from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    await staffLogout(req);
    clearStaffSessionCookie(res);
    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json({ data: { loggedOut: true } });
  } catch (_e) {
    safeApiLog("school_staff_logout_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
