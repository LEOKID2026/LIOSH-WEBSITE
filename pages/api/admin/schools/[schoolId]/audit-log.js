import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import {
  listAdminAuditForSchool,
} from "../../../../../lib/admin-server/admin-schools.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const schoolId = req.query?.schoolId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const listed = await listAdminAuditForSchool(ctx.serviceRole, String(schoolId));
    if (!listed.ok) {
      return sendAdminApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { entries: listed.entries } });
  } catch (_e) {
    safeApiLog("admin_school_audit_log_error", { route: "admin/schools/audit-log" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
