import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { buildAdminTeacherDetail } from "../../../../lib/admin-server/admin-teachers.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server.js";

async function loadEmailMap(serviceRole, teacherId) {
  const map = new Map();
  const { data, error } = await serviceRole.auth.admin.getUserById(teacherId);
  if (!error && data?.user?.id) {
    map.set(data.user.id, data.user.email || null);
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const teacherId = req.query?.teacherId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const serviceRole = getLearningSupabaseServiceRoleClient();
    const emailMap = await loadEmailMap(serviceRole, String(teacherId));
    const detail = await buildAdminTeacherDetail(serviceRole, String(teacherId), emailMap);
    if (!detail.ok) {
      return sendAdminApiError(res, detail.status, detail.code, detail.code);
    }

    return res.status(200).json({ data: detail.teacher });
  } catch (_e) {
    safeApiLog("admin_teacher_detail_error", { route: "admin/teachers/[teacherId]" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
