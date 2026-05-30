import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listAdminTeachers } from "../../../../lib/admin-server/admin-teachers.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const statusFilter =
      typeof req.query?.status === "string" ? req.query.status.trim().toLowerCase() : null;

    const listed = await listAdminTeachers(ctx.serviceRole, { statusFilter });
    if (!listed.ok) {
      return sendAdminApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { teachers: listed.teachers } });
  } catch (_e) {
    safeApiLog("admin_teachers_list_error", { route: "admin/teachers" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
