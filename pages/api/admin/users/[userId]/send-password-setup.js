import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendUserPasswordSetupEmail } from "../../../../../lib/auth/auth-password-setup.server.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const userId = req.query?.userId;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (!isUuid(String(userId))) {
    return sendAdminApiError(res, 400, "validation_failed", "userId must be a UUID");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const portal = body.portal === "parent" ? "parent" : "teacher";

    const passwordSetup = await sendUserPasswordSetupEmail(ctx.serviceRole, String(userId), {
      portal,
    });
    if (!passwordSetup.ok && passwordSetup.code === "user_not_found") {
      return sendAdminApiError(res, 404, passwordSetup.code, passwordSetup.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "password_setup_email",
      targetId: String(userId),
      action: passwordSetup.ok ? "sent" : "send_failed",
      beforeState: null,
      afterState: {
        ok: passwordSetup.ok,
        sentAt: passwordSetup.sentAt || null,
        code: passwordSetup.code || null,
      },
      notes: null,
    });

    return res.status(200).json({ data: { passwordSetup } });
  } catch (_e) {
    safeApiLog("admin_send_password_setup_error", {
      route: "admin/users/[userId]/send-password-setup",
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
