/**
 * Parent-assigned activity completion rewards (coins + daily missions).
 * Idempotent per activityId; never writes to answers/learning_sessions.
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins.js";
import { calculateSessionCoinsFromSettings, requireSessionCoinSettings } from "../rewards/server/economy-config.server.js";
import { updateDailyMissionProgress } from "./mission-progress.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import { summarizeParentActivityAttempts } from "./parent-activity-learning-credit.server.js";

export const PARENT_ACTIVITY_COIN_SOURCE_TYPE = "parent_assigned_activity";
export const PARENT_ACTIVITY_COIN_REASON = "parent_assigned_activity";

function isSessionCoinAwardEnabled() {
  return process.env.ENABLE_SESSION_COIN_AWARDS === "true";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   activityId: string,
 *   subject?: string|null,
 *   gradeLevel?: string|null,
 *   answersCount: number,
 *   correctCount: number,
 *   durationSeconds: number,
 *   accuracy: number,
 * }} params
 */
export async function awardParentActivityCompletionRewards(supabase, params) {
  const {
    studentId,
    activityId,
    subject = null,
    gradeLevel = null,
    answersCount,
    correctCount,
    durationSeconds,
    accuracy,
  } = params;

  if (!studentId || !activityId) {
    return { ok: true, skipped: true, reason: "missing_ids" };
  }
  if (!Number.isFinite(answersCount) || answersCount <= 0) {
    return { ok: true, skipped: true, reason: "no_answered_questions" };
  }

  const idempotencyKey = `coin_parent_activity_${activityId}`;
  let coinResult = { ok: true, skipped: true, reason: "feature_disabled" };

  if (isSessionCoinAwardEnabled()) {
    let sessionSettings;
    try {
      sessionSettings = await requireSessionCoinSettings(supabase);
    } catch {
      return { ok: false, reason: "economy_unavailable" };
    }
    const rawCoins = calculateSessionCoinsFromSettings(accuracy, durationSeconds, sessionSettings);
    if (rawCoins > 0) {
      coinResult = await applyArcadeCoinMove(supabase, {
        studentId,
        direction: "earn",
        amount: rawCoins,
        idempotencyKey,
        sourceType: PARENT_ACTIVITY_COIN_SOURCE_TYPE,
        sourceId: activityId,
        metadata: {
          subject,
          rawCoins,
          durationSeconds,
          accuracy,
          answersCount,
          correctCount,
        },
        reason: PARENT_ACTIVITY_COIN_REASON,
      });
      if (coinResult?.ok) {
        coinResult.coinsAwarded = rawCoins;
      }
    } else {
      coinResult = { ok: true, skipped: true, reason: "zero_coins_calculated" };
    }
  }

  const missionResult = await updateDailyMissionProgress(supabase, {
    studentId,
    gradeLevel,
    totalQuestions: answersCount,
    durationSeconds,
    subject,
  });

  try {
    const { evaluateAndGrantAchievementCards } = await import(
      "../rewards/server/achievement-evaluator.server.js"
    );
    await evaluateAndGrantAchievementCards(supabase, studentId);
  } catch {
    // Non-fatal — parent activity rewards must not fail
  }

  try {
    const { syncIncrementalMonthlyPersistenceRewards } = await import(
      "./monthly-persistence-reward.server.js"
    );
    await syncIncrementalMonthlyPersistenceRewards(supabase, studentId);
  } catch {
    // Non-fatal — parent activity completion must not fail
  }

  return {
    ok: true,
    coins: coinResult,
    missions: missionResult,
    idempotencyKey,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} activityId
 * @param {{ subject?: string|null, gradeLevel?: string|null }} meta
 */
export async function syncParentActivityCompletionRewards(supabase, studentId, activityId, meta = {}) {
  const { data: attempts, error } = await supabase
    .from("parent_activity_attempts")
    .select("is_correct, time_spent_ms, question_snapshot")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  if (error) {
    if (isDbSchemaNotReadyError(error) || isMissingColumnError(error)) {
      return { ok: false, reason: "db_schema_not_ready" };
    }
    return { ok: false, reason: "attempts_load_failed" };
  }

  const summary = summarizeParentActivityAttempts(attempts || []);
  const rewardResult = await awardParentActivityCompletionRewards(supabase, {
    studentId,
    activityId,
    subject: meta.subject ?? null,
    gradeLevel: meta.gradeLevel ?? null,
    ...summary,
  });

  return { ok: true, summary, rewards: rewardResult };
}
