/**
 * Shared auth + guards for split student cards API routes.
 */
import { getLearningSupabaseServiceRoleClient } from "../../learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../learning-supabase/student-auth";
import { guardCardRewardsApi } from "../guards.server.js";
import { isCardRewardsSystemEnabledInDb } from "./reward-settings.server.js";
import { assertGuestCardsAllowed } from "../../guest/guest-economy-guard.server.js";

/**
 * @param {import("next").NextApiRequest} req
 * @param {import("next").NextApiResponse} res
 * @param {(ctx: { supabase: import("@supabase/supabase-js").SupabaseClient, studentId: string }) => Promise<void>} handler
 */
export async function withStudentCardsApi(req, res, handler) {
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

  const { data: studentRow } = await supabase
    .from("students")
    .select("account_kind")
    .eq("id", auth.studentId)
    .maybeSingle();
  const guestCardsGuard = await assertGuestCardsAllowed(supabase, studentRow || {});
  if (!guestCardsGuard.ok) {
    return res.status(guestCardsGuard.status || 403).json({
      ok: false,
      error: guestCardsGuard.message,
      code: guestCardsGuard.code,
    });
  }

  try {
    await handler({ supabase, studentId: auth.studentId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "cards_load_failed" });
  }
}
