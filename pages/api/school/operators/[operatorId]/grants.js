import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { updateSchoolOperatorGrants } from "../../../../../lib/school-server/school-operator.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const operatorId = req.query?.operatorId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (!isUuid(String(operatorId))) {
      return sendSchoolApiError(res, 400, "validation_failed", "operatorId must be a UUID");
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const input = {
      schoolId: ctx.schoolId,
      managerId: ctx.managerId,
      operatorUserId: String(operatorId),
    };

    if (Object.prototype.hasOwnProperty.call(body, "studentAccessAdmin")) {
      if (typeof body.studentAccessAdmin !== "boolean") {
        return sendSchoolApiError(res, 400, "validation_failed", "studentAccessAdmin must be a boolean");
      }
      input.studentAccessAdmin = body.studentAccessAdmin;
    }

    if (Object.prototype.hasOwnProperty.call(body, "studentDataViewer")) {
      if (typeof body.studentDataViewer !== "boolean") {
        return sendSchoolApiError(res, 400, "validation_failed", "studentDataViewer must be a boolean");
      }
      input.studentDataViewer = body.studentDataViewer;
    }

    if (
      !Object.prototype.hasOwnProperty.call(body, "studentAccessAdmin") &&
      !Object.prototype.hasOwnProperty.call(body, "studentDataViewer")
    ) {
      return sendSchoolApiError(res, 400, "validation_failed", "At least one grant field is required");
    }

    const result = await updateSchoolOperatorGrants(ctx.serviceRole, input);
    if (!result.ok) {
      return sendSchoolApiError(res, result.status, result.code, result.code);
    }

    const g = result.grants;
    return res.status(200).json({
      data: {
        grants: {
          studentAccessAdmin: g?.student_access_admin === true,
          studentDataViewer: g?.student_data_viewer === true,
          updatedBy: g?.updated_by || null,
          updatedAt: g?.updated_at || null,
        },
      },
    });
  } catch (_e) {
    safeApiLog("school_operator_grants_error", { route: "school/operators/[operatorId]/grants" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
