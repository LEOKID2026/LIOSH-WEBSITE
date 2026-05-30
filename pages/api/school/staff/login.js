import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { staffLogin } from "../../../../lib/school-server/school-staff-login.server.js";
import {
  setStaffSessionCookie,
} from "../../../../lib/school-server/school-staff-session.server.js";
import { sendSchoolApiError } from "../../../../lib/school-server/school-request.server.js";
import { rejectIfTeacherPortalDisabled } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const staffCode = body.staffCode ?? body.code;
  const pin = body.pin;

  try {
    const result = await staffLogin({ staffCode, pin, req });
    if (!result.ok) {
      if (result.retryAfterSec) {
        res.setHeader("Retry-After", String(result.retryAfterSec));
      }
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    setStaffSessionCookie(res, result.sessionToken, result.cookieMaxAgeSec);
    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_staff_login_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
