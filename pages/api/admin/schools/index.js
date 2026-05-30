import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  createSchoolAccount,
  listAdminSchools,
  parseCreateSchoolBody,
  writeAdminAuditRow,
} from "../../../../lib/admin-server/admin-schools.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const statusFilter =
        typeof req.query?.status === "string" ? req.query.status.trim().toLowerCase() : null;

      const listed = await listAdminSchools(ctx.serviceRole, { statusFilter });
      if (!listed.ok) {
        return sendAdminApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { schools: listed.schools } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = parseCreateSchoolBody(req.body);
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
      }

      const created = await createSchoolAccount(ctx.serviceRole, parsed.payload);
      if (!created.ok) {
        return sendAdminApiError(res, created.status, created.code, created.code);
      }

      await writeAdminAuditRow(ctx.serviceRole, {
        adminUserId: ctx.adminUserId,
        targetType: "school",
        targetId: created.school.id,
        action: "school_created",
        afterState: created.school,
      });

      return res.status(201).json({
        data: {
          school: {
            schoolId: created.school.id,
            name: created.school.name,
            isActive: created.school.is_active !== false,
          },
        },
      });
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_schools_index_error", { route: "admin/schools" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
