import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  isAdminManualCoinCreditEnabled,
  adminManualCoinCreditDisabledResponse,
} from "../../../../lib/admin-server/admin-manual-coin-credit.flags.js";
import {
  lookupAdminParentStudentsByEmail,
  parseParentLookupEmail,
} from "../../../../lib/admin-server/admin-manual-coin-credit.server.js";

function guardManualCoinCreditApi(res) {
  if (!isAdminManualCoinCreditEnabled()) {
    res.status(404).json(adminManualCoinCreditDisabledResponse());
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!guardManualCoinCreditApi(res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const emailRaw = req.query?.email;
    const parsed = parseParentLookupEmail(
      typeof emailRaw === "string" ? emailRaw : Array.isArray(emailRaw) ? emailRaw[0] : ""
    );
    if (!parsed.ok) {
      return sendAdminApiError(res, 400, parsed.code, "Invalid email");
    }

    const result = await lookupAdminParentStudentsByEmail(ctx.serviceRole, parsed.email);
    if (!result.ok) {
      if (result.status === 404) {
        return sendAdminApiError(res, 404, result.code, "Parent not found");
      }
      return sendAdminApiError(res, result.status || 500, result.code || "internal_error");
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      data: {
        parent: result.parent,
        students: result.students,
      },
    });
  } catch (_e) {
    safeApiLog("admin_parent_by_email_error", { route: "admin/parents/by-email" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
