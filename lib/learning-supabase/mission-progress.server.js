/**
 * Child World Phase 2 — Daily Mission Progress
 *
 * Daily missions and reward amounts come from reward_economy_daily_missions (Admin/DB).
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins.js";
import { getIsraelDateString } from "./israel-calendar.server.js";
import { getDailyMissionsForGradeBand } from "../rewards/server/reward-economy.server.js";
import { EconomyUnavailableError } from "../rewards/economy-errors.js";

export { getIsraelDateString } from "./israel-calendar.server.js";

const MISSION_COIN_REASON = "mission_complete";
const MISSION_COIN_SOURCE_TYPE = "mission_complete";

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Map grade_level key (e.g. "grade_3") to a grade band string.
 */
export function getGradeBand(gradeLevel) {
  const k = String(gradeLevel || "").toLowerCase().trim();
  if (k === "grade_1" || k === "grade_2") return "g12";
  if (k === "grade_5" || k === "grade_6") return "g56";
  return "g34";
}

/** Build a fresh daily state for a given grade band and date string. */
function buildFreshDailyState(gradeBand, date, pool) {
  if (!pool?.length) {
    throw new EconomyUnavailableError(
      "economy_config_missing",
      `משימות יומיות חסרות לרצועת כיתה ${gradeBand}`
    );
  }
  return {
    date,
    missions: pool.map((m) => ({
      id: m.id,
      textHe: m.textHe,
      type: m.type,
      target: m.target,
      progress: 0,
      completed: false,
      coinAwarded: false,
      rewardCoins: Math.floor(Number(m.rewardCoins)),
    })),
    subjectsSeen: [],
  };
}

/**
 * Refresh rewardCoins on unawarded missions when Admin pool changes (forward-only).
 */
export function syncMissionRewardCoinsFromPool(daily, pool) {
  if (!isPlainObject(daily) || !Array.isArray(daily.missions) || !pool?.length) {
    return { daily, changed: false };
  }
  const poolMap = new Map(pool.map((m) => [m.id, m]));
  let changed = false;
  const missions = daily.missions.map((m) => {
    if (m.completed || m.coinAwarded) return m;
    const fromPool = poolMap.get(m.id);
    if (!fromPool) return m;
    const newCoins = Math.floor(Number(fromPool.rewardCoins));
    if (newCoins > 0 && newCoins !== m.rewardCoins) {
      changed = true;
      return { ...m, rewardCoins: newCoins };
    }
    return m;
  });
  return { daily: { ...daily, missions }, changed };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gradeBand
 */
export async function resolveMissionPool(supabase, gradeBand) {
  return getDailyMissionsForGradeBand(supabase, gradeBand);
}

/**
 * Ensure the challenges object contains today's daily missions.
 */
export function ensureTodayMissions(challenges, gradeLevel, today, poolOverride) {
  const ch = isPlainObject(challenges) ? challenges : {};
  const daily = ch.daily;
  const band = getGradeBand(gradeLevel);

  if (
    isPlainObject(daily) &&
    daily.date === today &&
    Array.isArray(daily.missions) &&
    daily.missions.length === 3
  ) {
    if (poolOverride?.length) {
      const synced = syncMissionRewardCoinsFromPool(daily, poolOverride);
      if (synced.changed) {
        return { challenges: { ...ch, daily: synced.daily }, changed: true };
      }
    }
    return { challenges: ch, changed: false };
  }

  const pool = poolOverride;
  return {
    challenges: { ...ch, daily: buildFreshDailyState(band, today, pool) },
    changed: true,
  };
}

/**
 * Apply one completed session's data to today's missions.
 */
export function applySessionToMissions(challenges, gradeLevel, session, today, poolOverride) {
  const { challenges: ch } = ensureTodayMissions(challenges, gradeLevel, today, poolOverride);
  const daily = { ...ch.daily };

  const { totalQuestions = 0, durationSeconds = 0, subject = null } = session;
  const durationMinutes = typeof durationSeconds === "number" && durationSeconds > 0
    ? durationSeconds / 60 : 0;

  const subjectsSeen = Array.isArray(daily.subjectsSeen) ? [...daily.subjectsSeen] : [];
  if (subject && typeof subject === "string" && !subjectsSeen.includes(subject)) {
    subjectsSeen.push(subject);
  }

  const newlyCompleted = [];
  const missions = (Array.isArray(daily.missions) ? daily.missions : []).map((m) => {
    if (m.completed) return m;
    const m2 = { ...m };
    if (m2.type === "questions") {
      m2.progress = Math.min(m2.target, (m2.progress || 0) + (Number(totalQuestions) || 0));
    } else if (m2.type === "minutes") {
      m2.progress = Math.min(m2.target, (m2.progress || 0) + durationMinutes);
    } else if (m2.type === "subjects") {
      m2.progress = Math.min(m2.target, subjectsSeen.length);
    }
    if (m2.progress >= m2.target && !m2.completed) {
      m2.completed = true;
      newlyCompleted.push(m2.id);
    }
    return m2;
  });

  return {
    updatedChallenges: { ...ch, daily: { ...daily, missions, subjectsSeen } },
    newlyCompleted,
  };
}

async function awardMissionCoins(supabase, studentId, date, missionIds, missions) {
  const results = [];
  const missionMap = new Map((missions || []).map((m) => [m.id, m]));
  for (const missionId of missionIds) {
    const mission = missionMap.get(missionId);
    const amount = Math.floor(Number(mission?.rewardCoins));
    if (!Number.isFinite(amount) || amount <= 0) {
      results.push({ missionId, ok: false, reason: "missing_reward_coins" });
      continue;
    }
    const idempotencyKey = `mission_complete_${studentId}_${date}_${missionId}`;
    const r = await applyArcadeCoinMove(supabase, {
      studentId,
      direction: "earn",
      amount,
      idempotencyKey,
      sourceType: MISSION_COIN_SOURCE_TYPE,
      sourceId: missionId,
      metadata: { date, missionId, rewardCoins: amount },
      reason: MISSION_COIN_REASON,
    });
    results.push({ missionId, ok: r.ok, duplicate: r.duplicate === true, balanceAfter: r.balanceAfter });
  }
  return results;
}

export async function ensureDailyMissionsInDb(supabase, studentId, gradeLevel) {
  const today = getIsraelDateString();

  const { data: row } = await supabase
    .from("student_learning_state")
    .select("id,challenges")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!row?.id) return null;

  const existing = isPlainObject(row.challenges) ? row.challenges : {};
  const band = getGradeBand(gradeLevel);
  const pool = await resolveMissionPool(supabase, band);
  const { challenges: updated, changed } = ensureTodayMissions(existing, gradeLevel, today, pool);

  if (!changed) return updated;

  const { error } = await supabase
    .from("student_learning_state")
    .update({ challenges: updated })
    .eq("student_id", studentId);

  if (error) return existing;
  return updated;
}

export async function updateDailyMissionProgress(supabase, {
  studentId,
  gradeLevel,
  totalQuestions,
  durationSeconds,
  subject,
}) {
  try {
    const today = getIsraelDateString();

    const { data: row } = await supabase
      .from("student_learning_state")
      .select("id,challenges")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!row?.id) return { ok: false, reason: "no_state_row" };

    const existing = isPlainObject(row.challenges) ? row.challenges : {};
    const band = getGradeBand(gradeLevel);
    const pool = await resolveMissionPool(supabase, band);
    const { updatedChallenges, newlyCompleted } = applySessionToMissions(
      existing,
      gradeLevel,
      { totalQuestions, durationSeconds, subject },
      today,
      pool
    );

    let awardResults = [];
    if (newlyCompleted.length > 0) {
      awardResults = await awardMissionCoins(
        supabase,
        studentId,
        today,
        newlyCompleted,
        updatedChallenges.daily?.missions
      );

      try {
        const { evaluateAndGrantAcquisitionCards } = await import(
          "../rewards/server/card-acquisition-engine.server.js"
        );
        await evaluateAndGrantAcquisitionCards(supabase, studentId);
      } catch {
        /* card grants are best-effort after mission coins */
      }
    }

    const freshlyAwarded = new Set(
      awardResults.filter((r) => r.ok && !r.duplicate).map((r) => r.missionId)
    );
    const finalMissions = (updatedChallenges.daily?.missions || []).map((m) => ({
      ...m,
      coinAwarded: freshlyAwarded.has(m.id) ? true : m.coinAwarded,
    }));
    const finalChallenges = {
      ...updatedChallenges,
      daily: { ...updatedChallenges.daily, missions: finalMissions },
    };

    const { error: saveErr } = await supabase
      .from("student_learning_state")
      .update({ challenges: finalChallenges })
      .eq("student_id", studentId);

    if (saveErr) {
      return { ok: false, reason: "save_failed", detail: saveErr.message };
    }

    return { ok: true, newlyCompleted, awardResults };
  } catch (err) {
    return { ok: false, reason: "error", detail: err?.message || String(err) };
  }
}
