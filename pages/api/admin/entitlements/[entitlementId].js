import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import { writeAdminAuditRow } from "../../../../lib/admin-server/admin-audit.server.js";
import {
  formatAdminEntitlement,
  parseEntitlementStatusPatchBody,
  patchAdminEntitlementStatus,
} from "../../../../lib/admin-server/admin-entitlements.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const entitlementId = req.query?.entitlementId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (!isUuid(String(entitlementId))) {
      return sendAdminApiError(res, 400, "validation_failed", "entitlementId must be a UUID");
    }

    const parsed = parseEntitlementStatusPatchBody(req.body);
    if (!parsed.ok) {
      return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
    }

    const patched = await patchAdminEntitlementStatus(
      ctx.serviceRole,
      String(entitlementId),
      ctx.adminUserId,
      { status: parsed.status, reason: parsed.reason }
    );
    if (!patched.ok) {
      return sendAdminApiError(res, patched.status, patched.code, patched.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "entitlement",
      targetId: String(entitlementId),
      action: `entitlement_${parsed.status}`,
      beforeState: formatAdminEntitlement(patched.before),
      afterState: formatAdminEntitlement(patched.after),
    });

    return res.status(200).json({ data: { entitlement: formatAdminEntitlement(patched.after) } });
  } catch (_e) {
    safeApiLog("admin_entitlement_patch_error", { route: "admin/entitlements/[entitlementId]" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
