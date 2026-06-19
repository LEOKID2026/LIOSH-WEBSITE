import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { guardCardRewardsApi } from "../../../../../lib/rewards/guards.server.js";
import { getShopListing } from "../../../../../lib/rewards/server/reward-shop.server.js";
import { getStudentCoinBalance } from "../../../../../lib/rewards/server/reward-coins.server.js";
import { isCardRewardsSystemEnabledInDb } from "../../../../../lib/rewards/server/reward-settings.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!guardCardRewardsApi(res)) return;

  const auth = await getAuthenticatedStudentSession(req);
  if (!auth) {
    clearStudentSessionCookie(res);
    return res.status(401).json({ ok: false, error: "Student session expired" });
  }

  const supabase = getLearningSupabaseServiceRoleClient();
  if (!(await isCardRewardsSystemEnabledInDb(supabase))) {
    return res.status(404).json({ ok: false, error: "feature_disabled" });
  }

  const balance = await getStudentCoinBalance(supabase, auth.studentId);
  const items = await getShopListing(supabase, auth.studentId, balance);
  return res.status(200).json({ ok: true, balance, items });
}
