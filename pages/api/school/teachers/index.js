import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listSchoolTeachers } from "../../../../lib/school-server/school-teachers.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const listed = await listSchoolTeachers(ctx.serviceRole, ctx.schoolId);
    if (!listed.ok) {
      return sendSchoolApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { teachers: listed.teachers } });
  } catch (_e) {
    safeApiLog("school_teachers_list_error", { route: "school/teachers" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
