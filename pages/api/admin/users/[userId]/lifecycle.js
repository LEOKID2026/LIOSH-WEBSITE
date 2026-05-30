import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";
import {
  applyAdminUserLifecycle,
  getAdminUserLifecycleSnapshot,
  parseAdminLifecycleBody,
} from "../../../../../lib/admin-server/admin-lifecycle.server.js";
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
      const snapshot = await getAdminUserLifecycleSnapshot(ctx.serviceRole, String(userId));
      if (!snapshot.ok) {
        return sendAdminApiError(res, snapshot.status, snapshot.code, snapshot.code);
      }
      return res.status(200).json({
        data: {
          entitlements: snapshot.entitlements,
          parentSettings: snapshot.parentSettings,
          teacherIsAccountActive: snapshot.teacherIsAccountActive,
        },
      });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = parseAdminLifecycleBody(req.body);
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
      }

      const result = await applyAdminUserLifecycle(
        ctx.serviceRole,
        ctx.adminUserId,
        String(userId),
        parsed.persona,
        parsed.action,
        parsed.reason
      );
      if (!result.ok) {
        return sendAdminApiError(res, result.status, result.code, result.code);
      }

      await writeAdminAuditRow(ctx.serviceRole, {
        adminUserId: ctx.adminUserId,
        targetType: "user_lifecycle",
        targetId: String(userId),
        action: `${parsed.persona}_${parsed.action}`,
        beforeState: null,
        afterState: {
          persona: parsed.persona,
          action: parsed.action,
          entitlement: result.entitlement,
          settings: result.settings || null,
          isAccountActive: result.isAccountActive ?? null,
        },
        notes: parsed.reason,
      });

      return res.status(200).json({ data: result });
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_user_lifecycle_error", { route: "admin/users/[userId]/lifecycle" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
