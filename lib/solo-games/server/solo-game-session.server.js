import { randomUUID } from "node:crypto";
import { isValidSoloDifficulty, isValidSoloGameKey } from "../solo-game-registry.js";

const MIN_PLAY_MS = 5000;
const MAX_PLAY_MS = 60 * 60 * 1000;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ studentId: string, gameKey: string, difficulty?: string|null }} params
 */
export async function createSoloGameSession(supabase, { studentId, gameKey, difficulty = null }) {
  if (!isValidSoloGameKey(gameKey)) {
    return { ok: false, code: "invalid_game", message: "משחק לא תקין" };
  }
  if (difficulty != null && !isValidSoloDifficulty(difficulty)) {
    return { ok: false, code: "invalid_difficulty", message: "רמת קושי לא תקינה" };
  }

  const id = randomUUID();
  const { data, error } = await supabase
    .from("solo_game_sessions")
    .insert({
      id,
      student_id: studentId,
      game_key: gameKey,
      difficulty: difficulty || null,
      status: "active",
    })
    .select("id, started_at, game_key, difficulty")
    .single();

  if (error || !data?.id) {
    return { ok: false, code: "db_error", message: error?.message || "לא ניתן לפתוח משחק" };
  }

  return {
    ok: true,
    sessionId: data.id,
    startedAt: data.started_at,
    gameKey: data.game_key,
    difficulty: data.difficulty,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} sessionId
 * @param {string} studentId
 */
export async function loadActiveSoloGameSession(supabase, sessionId, studentId) {
  const { data, error } = await supabase
    .from("solo_game_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data?.id) {
    return { ok: false, code: "not_found", message: "משחק לא נמצא" };
  }
  if (data.status !== "active") {
    return { ok: false, code: "session_closed", message: "המשחק כבר הסתיים" };
  }
  return { ok: true, session: data };
}

/**
 * @param {Date|string} startedAt
 * @param {Date|string} [finishedAt]
 */
export function computeServerDurationMs(startedAt, finishedAt = new Date()) {
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

/**
 * @param {number} durationMs
 */
export function validatePlayDurationMs(durationMs) {
  if (durationMs < MIN_PLAY_MS) {
    return { ok: false, code: "too_short", message: "המשחק קצר מדי" };
  }
  if (durationMs > MAX_PLAY_MS) {
    return { ok: false, code: "too_long", message: "המשחק ארוך מדי" };
  }
  return { ok: true };
}

export { MIN_PLAY_MS, MAX_PLAY_MS };
