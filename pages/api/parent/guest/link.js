import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import {
  transferGuestCoinsAndCards,
  findActiveGuestByLeoNumber,
} from "../../../../lib/guest/guest-transfer.server.js";
import { normalizeLeoNumber } from "../../../../lib/guest/guest-leo-number.server.js";
import {
  checkGuestLinkRateLimit,
  recordGuestLinkAttempt,
  hashIpForGuestLink,
  hashLeoNumberForGuestLink,
} from "../../../../lib/guest/guest-link-rate-limit.server.js";
import { clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";

const GENERIC_LINK_ERROR = "לא ניתן לקשר את מספר האורח. בדקו את המספר ונסו שוב.";
const RATE_LIMIT_ERROR = "בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const leoNumber = normalizeLeoNumber(req.body?.leoNumber);
  const targetStudentId = String(
    req.body?.targetStudentId || req.body?.studentId || ""
  ).trim();

  if (!leoNumber) {
    return res.status(400).json({ ok: false, error: GENERIC_LINK_ERROR });
  }
  if (!targetStudentId) {
    return res
      .status(400)
      .json({ ok: false, error: "מזהה ילד/ה חסר", code: "missing_student_id" });
  }

  try {
    const ctx = await requireParentApiContext(
      res,
      req.headers.authorization || ""
    );
    if (ctx.stopped) return undefined;

    const ip = clientIpFromRequest(req);
    const ipHash = hashIpForGuestLink(ip);
    const leoHash = hashLeoNumberForGuestLink(leoNumber);

    // Rate limit check — must happen before any guest DB lookup.
    const rl = await checkGuestLinkRateLimit(ctx.serviceRole, ctx.parentUserId);
    if (!rl.allowed) {
      // Await so the block row is written before we return.
      await recordGuestLinkAttempt(ctx.serviceRole, {
        parentUserId: ctx.parentUserId,
        ipHash,
        leoNumberHash: leoHash,
        outcome: "blocked",
        shouldBlock: rl.shouldBlock === true,
      });
      return res.status(429).json({ ok: false, error: RATE_LIMIT_ERROR });
    }

    const guest = await findActiveGuestByLeoNumber(ctx.serviceRole, leoNumber);

    // Determine the guest state without exposing enumeration hints.
    let guestOutcome = null;
    if (!guest?.id) {
      guestOutcome = "not_found";
    } else if (guest.guest_status === "linked") {
      guestOutcome = "already_linked";
    } else if (guest.guest_status !== "active" || guest.is_active !== true) {
      guestOutcome = "not_found";
    }

    if (guestOutcome) {
      await recordGuestLinkAttempt(ctx.serviceRole, {
        parentUserId: ctx.parentUserId,
        ipHash,
        leoNumberHash: leoHash,
        outcome: guestOutcome,
      });
      return res.status(404).json({ ok: false, error: GENERIC_LINK_ERROR });
    }

    const result = await transferGuestCoinsAndCards(ctx.serviceRole, {
      guestStudentId: guest.id,
      targetStudentId,
      parentId: ctx.parentUserId,
      leoNumber,
    });

    if (!result.ok) {
      await recordGuestLinkAttempt(ctx.serviceRole, {
        parentUserId: ctx.parentUserId,
        ipHash,
        leoNumberHash: leoHash,
        outcome: "error",
      });
      return res
        .status(result.status || 500)
        .json({ ok: false, error: GENERIC_LINK_ERROR });
    }

    await recordGuestLinkAttempt(ctx.serviceRole, {
      parentUserId: ctx.parentUserId,
      ipHash,
      leoNumberHash: leoHash,
      outcome: "success",
    });

    return res.status(200).json({
      ok: true,
      message: result.messageHe,
      coinsTransferred: result.coinsTransferred,
      cardsTransferred: result.cardsTransferred,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "אירעה שגיאה זמנית. נסו שוב מאוחר יותר." });
  }
}
