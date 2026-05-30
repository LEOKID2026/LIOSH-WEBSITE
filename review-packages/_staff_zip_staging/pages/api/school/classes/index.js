import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listSchoolClasses } from "../../../../lib/school-server/school-classes.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";
import { unknownQueryParams } from "../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    const unknown = unknownQueryParams(req.query, new Set(["teacherId", "subject", "gradeLevel", "isArchived"]));
    if (unknown.length) {
      return sendSchoolApiError(res, 400, "validation_failed", "Unknown query parameters");
    }

    const listed = await listSchoolClasses(ctx.serviceRole, ctx.schoolId, {
      teacherId: req.query?.teacherId ? String(req.query.teacherId) : undefined,
      subject: req.query?.subject ? String(req.query.subject) : undefined,
      gradeLevel: req.query?.gradeLevel ? String(req.query.gradeLevel) : undefined,
      isArchived: req.query?.isArchived === "true" ? true : req.query?.isArchived === "false" ? false : undefined,
    });

    if (!listed.ok) {
      return sendSchoolApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { classes: listed.classes } });
  } catch (_e) {
    safeApiLog("school_classes_list_error", { route: "school/classes" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
