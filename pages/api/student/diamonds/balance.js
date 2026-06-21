import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import {
  getDiamondSettings,
  getStudentDiamondBalance,
} from "../../../../lib/rewards/server/diamond-ledger.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const [settings, balance] = await Promise.all([
      getDiamondSettings(supabase),
      getStudentDiamondBalance(supabase, auth.studentId),
    ]);

    return res.status(200).json({
      ok: true,
      systemEnabled: settings.system_enabled !== false,
      balance: balance.balance,
      lifetimeEarned: balance.lifetimeEarned,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
