import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";
import { guardCardRewardsApi } from "../../../../../lib/rewards/guards.server.js";
import { convertDuplicates } from "../../../../../lib/rewards/server/duplicate-conversion.server.js";
import { isCardRewardsSystemEnabledInDb } from "../../../../../lib/rewards/server/reward-settings.server.js";

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

  const result = await convertDuplicates(supabase, auth.studentId, cardId);
  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
}
