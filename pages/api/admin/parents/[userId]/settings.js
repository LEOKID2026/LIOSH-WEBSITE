import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";
import {
  formatAdminParentSettings,
  getAdminParentSettings,
  parseParentSettingsPatchBody,
  patchAdminParentSettings,
} from "../../../../../lib/admin-server/admin-parent-settings.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const userId = req.query?.userId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (!isUuid(String(userId))) {
      return sendAdminApiError(res, 400, "validation_failed", "userId must be a UUID");
    }

    if (req.method === "GET") {
      const loaded = await getAdminParentSettings(ctx.serviceRole, String(userId));
      if (!loaded.ok) {
        return sendAdminApiError(res, loaded.status, loaded.code, loaded.code);
      }
      return res.status(200).json({
        data: {
          settings: loaded.settings,
          email: loaded.email,
          isOrphanUnlinked: loaded.isOrphanUnlinked === true,
          hasParentProfile: loaded.hasParentProfile === true,
          entitlementStatus: loaded.entitlementStatus,
          profileCreatedAt: loaded.profileCreatedAt,
        },
      });
    }

    if (req.method === "PATCH") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = parseParentSettingsPatchBody(req.body);
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
      }

      const patched = await patchAdminParentSettings(ctx.serviceRole, String(userId), parsed.patch);
      if (!patched.ok) {
        return sendAdminApiError(res, patched.status, patched.code, patched.code);
      }

      await writeAdminAuditRow(ctx.serviceRole, {
        adminUserId: ctx.adminUserId,
        targetType: "parent_settings",
        targetId: String(userId),
        action: "parent_settings_updated",
        beforeState: formatAdminParentSettings(patched.before),
        afterState: patched.settings,
      });

      return res.status(200).json({ data: { settings: patched.settings } });
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_parent_settings_error", { route: "admin/parents/[userId]/settings" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
