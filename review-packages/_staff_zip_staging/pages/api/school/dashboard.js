import { safeApiLog } from "../../../lib/security/safe-log.js";
import { listSchoolTeachers } from "../../../lib/school-server/school-teachers.server.js";
import { buildSchoolDashboardStats } from "../../../lib/school-server/school-session.server.js";
import { listSchoolActivities } from "../../../lib/school-server/school-reports.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const [stats, teachers, activities] = await Promise.all([
      buildSchoolDashboardStats(ctx.serviceRole, ctx.schoolId),
      listSchoolTeachers(ctx.serviceRole, ctx.schoolId),
      listSchoolActivities(ctx.serviceRole, ctx.schoolId, { limit: 10 }),
    ]);

    if (!stats.ok) return sendSchoolApiError(res, stats.status, stats.code, stats.code);
    if (!teachers.ok) return sendSchoolApiError(res, teachers.status, teachers.code, teachers.code);
    if (!activities.ok) {
      return sendSchoolApiError(res, activities.status, activities.code, activities.code);
    }

    return res.status(200).json({
      data: {
        schoolName: ctx.schoolName,
        stats: stats.stats,
        teachers: teachers.teachers.slice(0, 8),
        recentActivities: activities.activities,
      },
    });
  } catch (_e) {
    safeApiLog("school_dashboard_error", { route: "school/dashboard" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
