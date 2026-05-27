import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listGuardianSchoolMessages } from "../../../../lib/school-server/school-messaging.server.js";
import {
  isSchoolLinkedGuardianAccess,
  requireGuardianApiContext,
  sendGuardianApiError,
} from "../../../../lib/guardian-server/guardian-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireGuardianApiContext(req, res);
    if (ctx.stopped) return undefined;

    if (!isSchoolLinkedGuardianAccess(ctx.accessRow)) {
      return sendGuardianApiError(res, 403, "not_school_guardian", "not_school_guardian");
    }

    const result = await listGuardianSchoolMessages(ctx.serviceRole, ctx.guardianAccessId, {
      limit: req.query?.limit,
      days: req.query?.days || 30,
    });

    if (!result.ok) {
      return sendGuardianApiError(res, result.status, result.code, result.code);
    }

    return res.status(200).json({ data: result.data });
  } catch (_e) {
    safeApiLog("guardian_school_messages_index_error", { route: "guardian/school-messages" });
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
