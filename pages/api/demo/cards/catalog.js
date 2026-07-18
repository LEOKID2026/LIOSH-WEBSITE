import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import { getDemoCardsCatalogView } from "../../../../lib/rewards/server/reward-cards.server.js";
import { normalizePracticeGradeKey } from "../../../../lib/learning-supabase/practice-grade-resolution.js";
import { guardCardRewardsApi } from "../../../../lib/rewards/guards.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!guardCardRewardsApi(res)) return;

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

  try {
    const gradeLevel =
      normalizePracticeGradeKey(String(req.query.gradeLevel || "g3")) || "g3";
    const supabase = getLearningSupabaseServiceRoleClient();
    const view = await getDemoCardsCatalogView(supabase, gradeLevel);
    return res.status(200).json({ ok: true, ...view });
  } catch (_err) {
    return res.status(500).json({ ok: false, error: "demo_catalog_load_failed" });
  }
}
