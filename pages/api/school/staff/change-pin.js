import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { staffChangePin } from "../../../../lib/school-server/school-staff-change-pin.server.js";
import {
  getStaffSessionCookie,
  resolveStaffSession,
  staffRequestMeta,
} from "../../../../lib/school-server/school-staff-session.server.js";
import { sendSchoolApiError } from "../../../../lib/school-server/school-request.server.js";
import { rejectIfTeacherPortalDisabled } from "../../../../lib/teacher-server/teacher-session.server.js";
import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const token = getStaffSessionCookie(req);
  if (!token) {
    return sendSchoolApiError(res, 401, "not_authenticated", "not_authenticated");
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const session = await resolveStaffSession(serviceRole, token);
  if (!session.ok) {
    return sendSchoolApiError(res, session.status, session.code, session.code);
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const meta = staffRequestMeta(req);

  try {
    const result = await staffChangePin(serviceRole, {
      userId: session.userId,
      schoolId: session.schoolId,
      staffAccessId: session.staffAccessId,
      sessionId: session.sessionId,
      currentPin: body.currentPin,
      newPin: body.newPin,
      confirmPin: body.confirmPin,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    });

    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("school_staff_change_pin_error", {});
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
