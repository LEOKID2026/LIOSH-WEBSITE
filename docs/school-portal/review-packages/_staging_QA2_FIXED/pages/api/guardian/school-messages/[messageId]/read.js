import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { markGuardianSchoolMessageRead } from "../../../../../lib/school-server/school-messaging.server.js";
import {
  isSchoolLinkedGuardianAccess,
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../../../lib/guardian-server/guardian-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (!isSchoolLinkedGuardianAccess(ctx.accessRow)) {
      return sendGuardianApiError(res, 403, "not_school_guardian", "not_school_guardian");
    }

    const messageId = String(req.query?.messageId || "").trim();
    const result = await markGuardianSchoolMessageRead(ctx.serviceRole, ctx.guardianAccessId, messageId);
    if (!result.ok) {
      return sendGuardianApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("guardian_school_message_read_error", { route: "guardian/school-messages/[messageId]/read" });
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
