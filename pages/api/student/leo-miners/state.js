import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";
import { LEO_MINERS_GAME_KEY } from "../../../../lib/leo-miners/leo-miners-constants.js";
import { loadLeoMinersConfig, extractGameplayTuningForClient } from "../../../../lib/leo-miners/server/leo-miners-config.server.js";
import { minersDbNotReadyResult } from "../../../../lib/leo-miners/server/leo-miners-errors.server.js";
import {
  checkLeoMinersDbReady,
  loadMinersStateView,
  sumDailyAccruedPoints,
} from "../../../../lib/leo-miners/server/leo-miners-state.server.js";

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
    const dbReady = await checkLeoMinersDbReady(supabase);

    if (!dbReady) {
      return res.status(503).json(minersDbNotReadyResult());
    }

    const access = await assertStudentCanPlayGame(supabase, auth.studentId, LEO_MINERS_GAME_KEY);
    if (!access.ok) {
      return res.status(access.status || 403).json({
        ok: false,
        error: access.message,
        code: access.code,
      });
    }

    const config = await loadLeoMinersConfig(supabase);
    const view = await loadMinersStateView(supabase, auth.studentId);
    const dailyUsed = await sumDailyAccruedPoints(supabase, auth.studentId);

    return res.status(200).json({
      ...view,
      dbReady: true,
      rewardsEnabled: config.enabled === true && config.isActive === true,
      config: {
        dailyCap: Number(config.dailyCap ?? config.daily_cap ?? 2500),
        offlineCapHours: Number(config.offlineCapHours ?? config.offline_cap_hours ?? 12),
        gameplayTuning: extractGameplayTuningForClient(config),
      },
      dailyUsed,
    });
  } catch (e) {
    console.error("[leo-miners/state]", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
