import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  isAdminManualCoinCreditEnabled,
  adminManualCoinCreditDisabledResponse,
} from "../../../../../lib/admin-server/admin-manual-coin-credit.flags.js";
import { getAdminStudentCoinInfo } from "../../../../../lib/admin-server/admin-manual-coin-credit.server.js";

function guardManualCoinCreditApi(res) {
  if (!isAdminManualCoinCreditEnabled()) {
    res.status(404).json(adminManualCoinCreditDisabledResponse());
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!guardManualCoinCreditApi(res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = req.query?.studentId;
  if (!isUuid(String(studentId))) {
    return sendAdminApiError(res, 400, "validation_failed", "studentId must be a UUID");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const result = await getAdminStudentCoinInfo(ctx.serviceRole, String(studentId));
    if (!result.ok) {
      if (result.status === 404) {
        return sendAdminApiError(res, 404, result.code, "Student not found");
      }
      return sendAdminApiError(res, result.status || 500, result.code || "internal_error");
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      data: {
        studentId: result.student.id,
        studentName: result.student.fullName,
        gradeLevel: result.student.gradeLevel,
        isActive: result.student.isActive,
        balance: result.balance,
        lifetimeEarned: result.lifetimeEarned,
        lifetimeSpent: result.lifetimeSpent,
      },
    });
  } catch (_e) {
    safeApiLog("admin_manual_coin_info_error", { route: "admin/students/[studentId]/coin-info" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
