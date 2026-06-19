import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  isAdminManualCoinCreditEnabled,
  adminManualCoinCreditDisabledResponse,
} from "../../../../../lib/admin-server/admin-manual-coin-credit.flags.js";
import {
  creditAdminManualCoins,
  parseManualCoinClientRequestId,
  parseManualCoinCreditAmount,
  parseManualCoinCreditCategory,
  parseManualCoinCreditNote,
} from "../../../../../lib/admin-server/admin-manual-coin-credit.server.js";

function guardManualCoinCreditApi(res) {
  if (!isAdminManualCoinCreditEnabled()) {
    res.status(404).json(adminManualCoinCreditDisabledResponse());
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!guardManualCoinCreditApi(res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const studentId = req.query?.studentId;
  if (!isUuid(String(studentId))) {
    return sendAdminApiError(res, 400, "validation_failed", "studentId must be a UUID");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};

    const amountParsed = parseManualCoinCreditAmount(body.amount);
    if (!amountParsed.ok) {
      return sendAdminApiError(res, 400, amountParsed.code, "Invalid amount");
    }

    const categoryParsed = parseManualCoinCreditCategory(body.category);
    if (!categoryParsed.ok) {
      return sendAdminApiError(res, 400, categoryParsed.code, "Invalid category");
    }

    const noteParsed = parseManualCoinCreditNote(body.note);
    if (!noteParsed.ok) {
      return sendAdminApiError(res, 400, noteParsed.code, "Invalid note");
    }

    const requestIdParsed = parseManualCoinClientRequestId(body.clientRequestId);
    if (!requestIdParsed.ok) {
      return sendAdminApiError(res, 400, requestIdParsed.code, "Invalid clientRequestId");
    }

    const result = await creditAdminManualCoins(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      studentId: String(studentId),
      amount: amountParsed.amount,
      category: categoryParsed.category,
      note: noteParsed.note,
      clientRequestId: requestIdParsed.clientRequestId,
    });

    if (!result.ok) {
      if (result.status === 404) {
        return sendAdminApiError(res, 404, result.code, "Student not found");
      }
      return sendAdminApiError(res, result.status || 500, result.code || "internal_error", result.message);
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      duplicate: result.duplicate === true,
      data: {
        studentId: result.studentId,
        studentName: result.studentName,
        amountCredited: result.amountCredited,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        transactionId: result.transactionId,
        category: result.category,
      },
    });
  } catch (_e) {
    safeApiLog("admin_manual_coin_credit_error", { route: "admin/students/[studentId]/coin-credit" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
