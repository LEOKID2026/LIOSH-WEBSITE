import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { runStudentHomeAchievementGrants } from "../../../../lib/learning-supabase/student-home-profile-load.server.js";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const achievementGrants = await runStudentHomeAchievementGrants(supabase, auth.studentId);

    return res.status(200).json({
      ok: true,
      studentId: auth.studentId,
      achievementGrants,
      skipped: achievementGrants?.skipped === true,
      skipReason: achievementGrants?.skipReason ?? null,
      cooldownMsRemaining: achievementGrants?.cooldownMsRemaining ?? null,
    });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    console.error("[student-home-profile/achievement-grants] unexpected error", msg.slice(0, 200));
    return res.status(500).json({ ok: false, error: "אירעה שגיאה זמנית. נסו שוב מאוחר יותר." });
  }
}
