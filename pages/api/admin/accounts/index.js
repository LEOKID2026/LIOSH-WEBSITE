import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listAllAdminAccounts } from "../../../../lib/admin-server/admin-all-accounts.server.js";
import {
  requireMainAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireMainAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    const listed = await listAllAdminAccounts(ctx.serviceRole, ctx.adminUserId, ctx.user);
    if (!listed.ok) {
      return res.status(listed.status || 503).json({
        error: {
          code: listed.code,
          message: listed.code,
          authListError: listed.authListError || null,
          dbUserIdCount: listed.dbUserIdCount ?? null,
        },
      });
    }

    return res.status(200).json({
      data: {
        accounts: listed.accounts,
        total: listed.total,
        actorIsMainAdmin: listed.actorIsMainAdmin,
        actorEmail: listed.actorEmail || null,
        fullDeleteConfigured: listed.fullDeleteConfigured,
        listMeta: listed.listMeta || null,
      },
    });
  } catch (e) {
    safeApiLog("admin_all_accounts_list_error", {
      route: "admin/accounts",
      detail: String(e?.message || "unknown").slice(0, 120),
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
