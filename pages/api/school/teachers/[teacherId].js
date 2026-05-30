import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { getSchoolTeacherDetail } from "../../../../lib/school-server/school-teachers.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const teacherId = req.query?.teacherId;

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const detail = await getSchoolTeacherDetail(ctx.serviceRole, ctx.schoolId, String(teacherId));
    if (!detail.ok) {
      return sendSchoolApiError(res, detail.status, detail.code, detail.code);
    }

    return res.status(200).json({ data: { teacher: detail.teacher } });
  } catch (_e) {
    safeApiLog("school_teacher_detail_error", { route: "school/teachers/[teacherId]" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
