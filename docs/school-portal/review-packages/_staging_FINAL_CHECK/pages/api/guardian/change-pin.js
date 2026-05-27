import { safeApiLog } from "../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import {
  isSchoolLinkedGuardianAccess,
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../lib/guardian-server/guardian-session.server.js";
import { guardianChangePin } from "../../../lib/school-server/school-account-management.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (!isSchoolLinkedGuardianAccess(ctx.accessRow)) {
      return sendGuardianApiError(res, 403, "not_school_guardian", "not_school_guardian");
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await guardianChangePin({
      serviceRole: ctx.serviceRole,
      guardianAccessId: ctx.guardianAccessId,
      currentPin: body.currentPin,
      newPin: body.newPin,
    });

    if (!result.ok) {
      return sendGuardianApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("guardian_change_pin_error", {});
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
