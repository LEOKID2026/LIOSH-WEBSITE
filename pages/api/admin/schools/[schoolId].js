import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  getAdminSchoolDetail,
  parseUpdateSchoolBody,
  writeAdminAuditRow,
} from "../../../../lib/admin-server/admin-schools.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const schoolId = req.query?.schoolId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const detail = await getAdminSchoolDetail(ctx.serviceRole, String(schoolId));
      if (!detail.ok) {
        return sendAdminApiError(res, detail.status, detail.code, detail.code);
      }
      return res.status(200).json({
        data: {
          school: detail.school,
          teachers: detail.teachers,
          registrationRequest: detail.registrationRequest || null,
        },
      });
    }

    if (req.method === "PATCH") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const before = await getAdminSchoolDetail(ctx.serviceRole, String(schoolId));
      if (!before.ok) {
        return sendAdminApiError(res, before.status, before.code, before.code);
      }

      const parsed = parseUpdateSchoolBody(req.body);
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
      }

      const { data, error } = await ctx.serviceRole
        .from("school_accounts")
        .update(parsed.patch)
        .eq("id", schoolId)
        .select("id, name, country_code, contact_email, city, max_teachers, is_active, created_at, updated_at")
        .single();

      if (error) {
        return sendAdminApiError(res, 500, "internal_error", "Update failed");
      }

      await writeAdminAuditRow(ctx.serviceRole, {
        adminUserId: ctx.adminUserId,
        targetType: "school",
        targetId: String(schoolId),
        action: "school_updated",
        beforeState: before.school,
        afterState: data,
      });

      const after = await getAdminSchoolDetail(ctx.serviceRole, String(schoolId));
      return res.status(200).json({
        data: {
          school: after.ok ? after.school : null,
          teachers: after.ok ? after.teachers : [],
        },
      });
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_school_detail_error", { route: "admin/schools/[schoolId]" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
