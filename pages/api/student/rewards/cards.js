import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { guardCardRewardsApi } from "../../../../lib/rewards/guards.server.js";
import { getStudentCardsView } from "../../../../lib/rewards/server/reward-cards.server.js";
import { isCardRewardsSystemEnabledInDb } from "../../../../lib/rewards/server/reward-settings.server.js";

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
  const systemEnabled = await isCardRewardsSystemEnabledInDb(supabase);
  if (!systemEnabled) {
    return res.status(404).json({ ok: false, error: "feature_disabled" });
  }

  try {
    const view = await getStudentCardsView(supabase, auth.studentId);
    return res.status(200).json({ ok: true, ...view });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "cards_load_failed" });
  }
}
