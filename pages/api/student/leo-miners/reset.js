import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";
import { LEO_MINERS_GAME_KEY } from "../../../../lib/leo-miners/leo-miners-constants.js";
import { assertMinersDbReady } from "../../../../lib/leo-miners/server/leo-miners-guards.server.js";
import {
  loadMinersStateView,
  resetMinersState,
} from "../../../../lib/leo-miners/server/leo-miners-state.server.js";

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

    const body = await readJsonBody(req);
    if (body?.confirm !== true) {
      return res.status(400).json({ ok: false, error: "נדרש אישור איפוס" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const dbCheck = await assertMinersDbReady(supabase);
    if (!dbCheck.ok) {
      return res.status(503).json(dbCheck);
    }

    const access = await assertStudentCanPlayGame(supabase, auth.studentId, LEO_MINERS_GAME_KEY);
    if (!access.ok) {
      return res.status(access.status || 403).json({
        ok: false,
        error: access.message,
        code: access.code,
      });
    }

    await resetMinersState(supabase, auth.studentId);
    const view = await loadMinersStateView(supabase, auth.studentId);
    return res.status(200).json({ ok: true, dbReady: true, state: view.state });
  } catch (e) {
    console.error("[leo-miners/reset]", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
