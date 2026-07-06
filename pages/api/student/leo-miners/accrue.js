import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";
import { LEO_MINERS_GAME_KEY } from "../../../../lib/leo-miners/leo-miners-constants.js";
import { processMinersAccrue } from "../../../../lib/leo-miners/server/leo-miners-accrue.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const access = await assertStudentCanPlayGame(supabase, auth.studentId, LEO_MINERS_GAME_KEY);
    if (!access.ok) {
      return res.status(access.status || 403).json({
        ok: false,
        error: access.message,
        code: access.code,
      });
    }

    const body = await readJsonBody(req);
    const result = await processMinersAccrue(supabase, auth.studentId, auth.student || {}, body);

    if (!result.ok) {
      const status =
        result.code === "miners_db_not_ready"
          ? 503
          : result.status || (result.code === "rate_limited" ? 429 : 400);
      return res.status(status).json(result);
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("[leo-miners/accrue]", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
