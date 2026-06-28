import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { transferGuestCoinsAndCards, findActiveGuestByLeoNumber } from "../../../../lib/guest/guest-transfer.server.js";
import { normalizeLeoNumber } from "../../../../lib/guest/guest-leo-number.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const leoNumber = normalizeLeoNumber(req.body?.leoNumber);
  const targetStudentId = String(req.body?.targetStudentId || req.body?.studentId || "").trim();

  if (!leoNumber) {
    return res.status(400).json({ ok: false, error: "מספר ליאו לא תקין", code: "invalid_leo_number" });
  }
  if (!targetStudentId) {
    return res.status(400).json({ ok: false, error: "studentId is required", code: "missing_student_id" });
  }

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const guest = await findActiveGuestByLeoNumber(ctx.serviceRole, leoNumber);
    if (!guest?.id) {
      return res.status(404).json({ ok: false, error: "מספר לא נמצא", code: "guest_not_found" });
    }
    if (guest.guest_status === "linked") {
      return res.status(409).json({ ok: false, error: "המספר כבר שויך להורה", code: "guest_already_linked" });
    }
    if (guest.guest_status !== "active" || guest.is_active !== true) {
      return res.status(404).json({ ok: false, error: "מספר לא נמצא", code: "guest_not_found" });
    }

    const result = await transferGuestCoinsAndCards(ctx.serviceRole, {
      guestStudentId: guest.id,
      targetStudentId,
      parentId: ctx.parentUserId,
      leoNumber,
    });

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.message || result.code,
        code: result.code,
      });
    }

    return res.status(200).json({
      ok: true,
      message: result.messageHe,
      coinsTransferred: result.coinsTransferred,
      cardsTransferred: result.cardsTransferred,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
