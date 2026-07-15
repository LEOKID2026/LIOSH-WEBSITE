import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";
import { LEO_MINERS_GAME_KEY } from "../../../../lib/leo-miners/leo-miners-constants.js";
import { loadLeoMinersConfig, extractGameplayTuningForClient } from "../../../../lib/leo-miners/server/leo-miners-config.server.js";
import { minersDbNotReadyResult } from "../../../../lib/leo-miners/server/leo-miners-errors.server.js";
import { isDbSchemaNotReadyError } from "../../../../lib/teacher-server/teacher-audit.server.js";
import {
  checkLeoMinersDbReady,
  loadMinersStateView,
  sumDailyAccruedPoints,
  sumDailyClaimedCoins,
  sumTotalClaimedCoins,
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
    const [dailyUsed, claimedTodayCoins, claimedTotalCoins] = await Promise.all([
      sumDailyAccruedPoints(supabase, auth.studentId),
      sumDailyClaimedCoins(supabase, auth.studentId),
      sumTotalClaimedCoins(supabase, auth.studentId),
    ]);

    const catalogEnabled = access.catalogRow?.is_enabled === true;
    const gameEnabled =
      config.isActive === true && config.enabled === true && catalogEnabled;
    const economyEnabled =
      gameEnabled &&
      config.economy_enabled === true &&
      (config.claim_enabled === true || config.accrue_enabled === true);

    return res.status(200).json({
      ...view,
      ok: true,
      dbReady: true,
      catalogEnabled,
      gameEnabled,
      economyEnabled,
      rewardsEnabled: economyEnabled,
      config: {
        dailyCap: Number(config.dailyCap ?? config.daily_cap ?? 2500),
        offlineCapHours: Number(config.offlineCapHours ?? config.offline_cap_hours ?? 12),
        gameplayTuning: extractGameplayTuningForClient(config),
      },
      dailyUsed,
      minedTodayPoints: dailyUsed,
      claimedTodayCoins,
      claimedTotalCoins,
    });
  } catch (e) {
    console.error("[leo-miners/state]", e);
    if (isDbSchemaNotReadyError(e)) {
      return res.status(503).json(minersDbNotReadyResult());
    }
    return res.status(500).json({
      ok: false,
      error: "Server error",
      code: "server_error",
      message: "שגיאת שרת - נסו לרענן את הדף.",
    });
  }
}
