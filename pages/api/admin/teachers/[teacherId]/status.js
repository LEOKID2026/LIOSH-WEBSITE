import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";
import {
  buildAdminTeacherDetail,
  parseAdminStatusPatchBody,
} from "../../../../../lib/admin-server/admin-teachers.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { loadTeacherLimitsRow } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { assertAdminPrivateTeacherScope } from "../../../../../lib/admin-server/admin-private-teacher-scope.server.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const teacherId = req.query?.teacherId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const scope = await assertAdminPrivateTeacherScope(ctx.serviceRole, String(teacherId));
    if (!scope.ok) {
      return sendAdminApiError(res, scope.status, scope.code, scope.code);
    }

    const parsed = parseAdminStatusPatchBody(req.body);
    if (!parsed.ok) {
      return sendAdminApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
    }

    const beforeRow = await loadTeacherLimitsRow(ctx.serviceRole, String(teacherId));
    if (!beforeRow.ok || !beforeRow.limits) {
      return sendAdminApiError(res, 404, "teacher_limits_missing", "Teacher limits not found");
    }

    const { data, error } = await ctx.serviceRole
      .from("teacher_limits")
      .update({
        is_account_active: parsed.isAccountActive,
        updated_at: new Date().toISOString(),
      })
      .eq("teacher_id", teacherId)
      .select("*")
      .single();

    if (error) {
      return sendAdminApiError(res, 500, "internal_error", "Update failed");
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "teacher",
      targetId: String(teacherId),
      action: parsed.isAccountActive ? "activate_teacher" : "deactivate_teacher",
      beforeState: { is_account_active: beforeRow.limits.is_account_active },
      afterState: { is_account_active: data.is_account_active },
    });

    const emailMap = new Map();
    const { data: authUser } = await ctx.serviceRole.auth.admin.getUserById(String(teacherId));
    if (authUser?.user?.id) emailMap.set(authUser.user.id, authUser.user.email || null);

    const detail = await buildAdminTeacherDetail(ctx.serviceRole, String(teacherId), emailMap);
    if (!detail.ok) {
      return sendAdminApiError(res, detail.status, detail.code, detail.code);
    }

    return res.status(200).json({ data: detail.teacher });
  } catch (_e) {
    safeApiLog("admin_teacher_status_error", { route: "admin/teachers/[teacherId]/status" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
