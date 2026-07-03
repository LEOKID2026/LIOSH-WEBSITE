import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_MISSIONS = [
  { game_key: "fourline", description_he: "שחק 3 משחקי ארבע בשורה", goal_type: "play", goal_count: 3, reward_coins: 50 },
  { game_key: "ludo", description_he: "נצח פעמיים בלודו", goal_type: "win", goal_count: 2, reward_coins: 75 },
  { game_key: null, description_he: "הצטרף לחדר ציבורי", goal_type: "join", goal_count: 1, reward_coins: 30 },
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function ensureDefaultMissions(supabase) {
  const { count } = await supabase
    .from("arcade_daily_missions")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  if ((count || 0) > 0) return;

  for (const m of DEFAULT_MISSIONS) {
    await supabase.from("arcade_daily_missions").insert({ ...m, active: true });
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getTodayMissions(supabase, studentId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "missions");
  if (!feature.ok) return { ok: true, missions: [], featureLocked: true };

  await ensureDefaultMissions(supabase);
  const date = todayDateStr();

  const { data: missions } = await supabase
    .from("arcade_daily_missions")
    .select("*")
    .eq("active", true)
    .limit(3);

  const out = [];
  for (const m of missions || []) {
    const { data: prog } = await supabase
      .from("arcade_player_mission_progress")
      .select("progress, completed_at")
      .eq("student_id", studentId)
      .eq("mission_id", m.id)
      .eq("date", date)
      .maybeSingle();

    out.push({
      missionId: m.id,
      descriptionHe: m.description_he,
      gameKey: m.game_key,
      goalType: m.goal_type,
      goalCount: m.goal_count,
      rewardCoins: m.reward_coins,
      progress: prog?.progress ?? 0,
      completed: Boolean(prog?.completed_at),
    });
  }

  return { ok: true, missions: out, featureLocked: false };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ goalType: string, gameKey?: string, increment?: number }} params
 */
export async function bumpMissionProgress(supabase, studentId, params) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "missions");
  if (!feature.ok) return;

  await ensureDefaultMissions(supabase);
  const date = todayDateStr();
  const goalType = String(params.goalType || "").trim();
  const gameKey = params.gameKey ? String(params.gameKey).trim() : null;
  const increment = Math.max(1, Number(params.increment) || 1);

  let query = supabase.from("arcade_daily_missions").select("*").eq("active", true).eq("goal_type", goalType);
  if (gameKey) query = query.eq("game_key", gameKey);
  else query = query.is("game_key", null);

  const { data: missions } = await query;
  for (const m of missions || []) {
    const { data: existing } = await supabase
      .from("arcade_player_mission_progress")
      .select("*")
      .eq("student_id", studentId)
      .eq("mission_id", m.id)
      .eq("date", date)
      .maybeSingle();

    if (existing?.completed_at) continue;

    const progress = (existing?.progress || 0) + increment;
    const completed = progress >= m.goal_count;
    const row = {
      student_id: studentId,
      mission_id: m.id,
      date,
      progress,
      completed_at: completed ? new Date().toISOString() : null,
    };

    await supabase.from("arcade_player_mission_progress").upsert(row, {
      onConflict: "student_id,mission_id,date",
    });

    if (completed && m.reward_coins > 0) {
      const { applyArcadeCoinMove } = await import("../server/arcade-coins.js");
      await applyArcadeCoinMove(supabase, {
        studentId,
        direction: "earn",
        amount: m.reward_coins,
        idempotencyKey: `mission:${m.id}:${studentId}:${date}`,
        sourceType: "arcade_mission",
        sourceId: m.id,
        metadata: { missionId: m.id, date },
        reason: "arcade_mission_reward",
      });
    }
  }
}

const DEFAULT_ACHIEVEMENTS = [
  {
    key: "first_game",
    name_he: "שחקן ראשון",
    description_he: "שחק משחק ארקייד אחד",
    condition_type: "games_played",
    condition_value: 1,
  },
  {
    key: "ten_wins",
    name_he: "10 ניצחונות",
    description_he: "נצח 10 פעמים",
    condition_type: "wins",
    condition_value: 10,
  },
  {
    key: "fifty_games",
    name_he: "50 משחקים",
    description_he: "שחק 50 משחקי ארקייד",
    condition_type: "games_played",
    condition_value: 50,
  },
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function ensureDefaultAchievements(supabase) {
  const { count } = await supabase
    .from("arcade_achievements")
    .select("*", { count: "exact", head: true });

  if ((count || 0) > 0) return;

  for (const a of DEFAULT_ACHIEVEMENTS) {
    await supabase.from("arcade_achievements").insert({ ...a });
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function unlockArcadeAchievements(supabase, studentId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "missions");
  if (!feature.ok) return;

  await ensureDefaultAchievements(supabase);

  const { data: profile } = await supabase
    .from("arcade_player_profiles")
    .select("total_wins, total_games")
    .eq("student_id", studentId)
    .maybeSingle();

  const totalWins = profile?.total_wins ?? 0;
  const totalGames = profile?.total_games ?? 0;

  const { data: achievements } = await supabase.from("arcade_achievements").select("*");
  const { data: unlocked } = await supabase
    .from("arcade_player_achievements")
    .select("achievement_id")
    .eq("student_id", studentId);

  const unlockedSet = new Set((unlocked || []).map((u) => u.achievement_id));

  for (const a of achievements || []) {
    if (unlockedSet.has(a.id)) continue;
    let met = false;
    if (a.condition_type === "wins") met = totalWins >= a.condition_value;
    if (a.condition_type === "games_played") met = totalGames >= a.condition_value;
    if (!met) continue;

    await supabase.from("arcade_player_achievements").insert({
      student_id: studentId,
      achievement_id: a.id,
      unlocked_at: new Date().toISOString(),
    });
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function listAchievements(supabase, studentId) {
  await ensureDefaultAchievements(supabase);
  const { data: achievements } = await supabase.from("arcade_achievements").select("*");
  const { data: unlocked } = await supabase
    .from("arcade_player_achievements")
    .select("achievement_id, unlocked_at")
    .eq("student_id", studentId);

  const unlockedSet = new Set((unlocked || []).map((u) => u.achievement_id));

  return {
    ok: true,
    achievements: (achievements || []).map((a) => ({
      id: a.id,
      key: a.key,
      nameHe: a.name_he,
      descriptionHe: a.description_he,
      unlocked: unlockedSet.has(a.id),
    })),
  };
}
