import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  createSchoolPhysicalClass,
  listSchoolPhysicalClasses,
} from "../../../../lib/school-server/school-physical-classes.server.js";
import {
  requireSchoolClassAdminApiContext,
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const ctx = await requireSchoolClassAdminApiContext(res, req);
      if (ctx.stopped) return undefined;

      const listed = await listSchoolPhysicalClasses(ctx.serviceRole, ctx.schoolId);
      if (!listed.ok) {
        return sendSchoolApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { physicalClasses: listed.physicalClasses } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const ctx = await requireSchoolManagerApiContext(res, req);
      if (ctx.stopped) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const created = await createSchoolPhysicalClass(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        managerId: ctx.managerId,
        name: body.name,
        gradeLevel: body.gradeLevel,
      });

      if (!created.ok) {
        return sendSchoolApiError(res, created.status, created.code, created.code);
      }

      return res.status(201).json({ data: { physicalClass: created } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_physical_classes_error", { route: "school/physical-classes" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
