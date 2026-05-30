import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  inviteSchoolOperator,
  listSchoolOperators,
} from "../../../../lib/school-server/school-operator.server.js";
import { parseStaffInviteBody } from "../../../../lib/school-server/school-staff-invite.server.js";
import {
  parseCreateStaffBody,
  provisionSchoolOperatorStaff,
} from "../../../../lib/school-server/school-staff-provision.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const result = await listSchoolOperators(ctx.serviceRole, ctx.schoolId);
      if (!result.ok) {
        return sendSchoolApiError(res, result.status, result.code, result.code);
      }
      return res.status(200).json({ data: { operators: result.operators } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const hasInviteTarget =
        (typeof body.operatorUserId === "string" && body.operatorUserId.trim()) ||
        (typeof body.email === "string" && body.email.trim());

      if (!hasInviteTarget) {
        const parsedCreate = parseCreateStaffBody(body);
        if (!parsedCreate.ok) {
          return sendSchoolApiError(res, parsedCreate.status, parsedCreate.code, parsedCreate.code);
        }

        const provisioned = await provisionSchoolOperatorStaff(ctx.serviceRole, {
          schoolId: ctx.schoolId,
          managerId: ctx.managerId,
          displayName: parsedCreate.displayName,
        });
        if (!provisioned.ok) {
          return sendSchoolApiError(res, provisioned.status, provisioned.code, provisioned.code);
        }

        return res.status(201).json({
          data: {
            operatorUserId: provisioned.userId,
            schoolId: provisioned.schoolId,
            staffCode: provisioned.staffCode,
            initialPin: provisioned.initialPin,
            provisionMode: "code_pin",
          },
        });
      }

      const parsed = await parseStaffInviteBody(ctx.serviceRole, body, {
        userIdKey: "operatorUserId",
      });
      if (!parsed.ok) {
        return sendSchoolApiError(res, parsed.status, parsed.code, parsed.code);
      }

      let displayName = null;
      if (body.displayName != null) {
        if (typeof body.displayName !== "string") {
          return sendSchoolApiError(res, 400, "validation_failed", "displayName must be a string");
        }
        displayName = body.displayName.trim() || null;
      }

      const invited = await inviteSchoolOperator(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        managerId: ctx.managerId,
        operatorUserId: parsed.userId,
        displayName,
      });
      if (!invited.ok) {
        return sendSchoolApiError(res, invited.status, invited.code, invited.code);
      }

      return res.status(201).json({
        data: {
          operatorUserId: invited.operatorUserId,
          schoolId: invited.schoolId,
        },
      });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_operators_index_error", { route: "school/operators" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
