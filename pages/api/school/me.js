import { safeApiLog } from "../../../lib/security/safe-log.js";
import { setSensitiveReportNoStoreHeaders } from "../../../lib/security/sensitive-report-response.server.js";
import { buildSchoolDashboardStats } from "../../../lib/school-server/school-session.server.js";
import { teacherHasActiveAssignments } from "../../../lib/school-server/school-membership.server.js";
import {
  requireSchoolPortalMeContext,
  sendSchoolApiError,
} from "../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolPortalMeContext(res, req);
    if (ctx.stopped) return undefined;

    if (ctx.portalRole === "school_operator") {
      setSensitiveReportNoStoreHeaders(res);
      return res.status(200).json({
        data: {
          portalRole: "school_operator",
          school: {
            schoolId: ctx.school.id,
            name: ctx.school.name,
            city: ctx.school.city,
            contactEmail: ctx.school.contact_email,
            isActive: ctx.school.is_active !== false,
          },
          operator: {
            operatorUserId: ctx.operatorUserId,
            grants: {
              studentAccessAdmin: ctx.grants?.student_access_admin === true,
              studentDataViewer: ctx.grants?.student_data_viewer === true,
            },
          },
          hasTeacherActivity: false,
        },
      });
    }

    const stats = await buildSchoolDashboardStats(ctx.serviceRole, ctx.schoolId);
    if (!stats.ok) {
      return sendSchoolApiError(res, stats.status, stats.code, stats.code);
    }

    const activity = await teacherHasActiveAssignments(ctx.serviceRole, ctx.managerId);

    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json({
      data: {
        portalRole: "school_manager",
        school: {
          schoolId: ctx.school.id,
          name: ctx.school.name,
          city: ctx.school.city,
          contactEmail: ctx.school.contact_email,
          isActive: ctx.school.is_active !== false,
        },
        manager: {
          managerId: ctx.managerId,
          role: ctx.membership.role,
        },
        stats: stats.stats,
        hasTeacherActivity: activity.ok ? activity.hasTeacherActivity : false,
      },
    });
  } catch (_e) {
    safeApiLog("school_me_error", { route: "school/me" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
