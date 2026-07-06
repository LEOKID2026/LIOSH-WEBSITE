import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";
import { guardCardRewardsApi } from "../../../../../lib/rewards/guards.server.js";
import { isCardRewardsSystemEnabledInDb } from "../../../../../lib/rewards/server/reward-settings.server.js";
import { purchaseShopCard } from "../../../../../lib/rewards/server/reward-shop.server.js";
import { assertGuestShopAllowed, assertGuestCardsAllowed } from "../../../../../lib/guest/guest-economy-guard.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!guardCardRewardsApi(res)) return;
  if (guardCookieMutationOrigin(req, res)) return;

  const auth = await getAuthenticatedStudentSession(req);
  if (!auth) {
    clearStudentSessionCookie(res);
    return res.status(401).json({ ok: false, error: "Student session expired" });
  }

  const cardId = req.body?.cardId;
  if (!cardId || typeof cardId !== "string") {
    return res.status(400).json({ ok: false, error: "missing_card_id" });
  }

  const supabase = getLearningSupabaseServiceRoleClient();
  if (!(await isCardRewardsSystemEnabledInDb(supabase))) {
    return res.status(404).json({ ok: false, error: "feature_disabled" });
  }

  const shopGuard = await assertGuestShopAllowed(supabase, auth.student);
  if (!shopGuard.ok) {
    return res.status(shopGuard.status || 403).json({ ok: false, error: shopGuard.message, code: shopGuard.code });
  }

  const cardsGuard = await assertGuestCardsAllowed(supabase, auth.student);
  if (!cardsGuard.ok) {
    return res.status(cardsGuard.status || 403).json({ ok: false, error: cardsGuard.message, code: cardsGuard.code });
  }

  const result = await purchaseShopCard(supabase, auth.studentId, cardId);
  if (!result.ok) {
    const status = result.code === "insufficient_coins" ? 400 : 409;
    return res.status(status).json(result);
  }
  return res.status(200).json(result);
}
