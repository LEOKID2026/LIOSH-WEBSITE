import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";
import { adminAdjustDiamonds } from "../../../../../../lib/rewards/server/diamond-ledger.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = String(req.query?.studentId || "").trim();
  if (!studentId) {
    return sendAdminApiError(res, 400, "bad_request", "studentId required");
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const signedAmount = Number(body.amount);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const clientRequestId =
    typeof body.clientRequestId === "string" ? body.clientRequestId.trim() : "";

  if (!Number.isFinite(signedAmount) || signedAmount === 0 || !Number.isInteger(signedAmount)) {
    return sendAdminApiError(res, 400, "invalid_amount", "invalid_amount");
  }
  if (!note) {
    return sendAdminApiError(res, 400, "invalid_note", "invalid_note");
  }
  if (!clientRequestId) {
    return sendAdminApiError(res, 400, "invalid_client_request_id", "invalid_client_request_id");
  }

  try {
    const result = await adminAdjustDiamonds(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      studentId,
      signedAmount,
      note,
      clientRequestId,
    });

    if (!result.ok) {
      return sendAdminApiError(res, result.status || 500, result.code || "diamond_failed", result.message);
    }

    return res.status(200).json({ ok: true, ...result });
  } catch {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
