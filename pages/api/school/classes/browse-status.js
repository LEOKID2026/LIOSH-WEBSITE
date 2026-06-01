import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { buildSchoolBrowseStatusMaps } from "../../../../lib/school-server/school-browse-status.server.js";
import {
  requireSchoolStudentBrowseApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";
import { unknownQueryParams } from "../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolStudentBrowseApiContext(res, req);
    if (ctx.stopped) return undefined;

    const unknown = unknownQueryParams(req.query, new Set(["gradeLevel"]));
    if (unknown.length) {
      return sendSchoolApiError(res, 400, "validation_failed", "Unknown query parameters");
    }

    const gradeLevel = req.query?.gradeLevel ? String(req.query.gradeLevel).trim() : "";

    const built = await buildSchoolBrowseStatusMaps(ctx.serviceRole, ctx.schoolId, {
      gradeLevel: gradeLevel || undefined,
    });

    if (!built.ok) {
      return sendSchoolApiError(res, built.status, built.code, built.code);
    }

    return res.status(200).json({
      data: {
        physicalByKey: built.physicalByKey,
        gradeStatusByLevel: built.gradeStatusByLevel,
        gradeStatus: built.gradeStatus,
        studentLearningStatusBadges: built.studentLearningStatusBadges || {},
      },
    });
  } catch (_e) {
    safeApiLog("school_classes_browse_status_error", { route: "school/classes/browse-status" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
