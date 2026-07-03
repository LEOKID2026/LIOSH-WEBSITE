/**
 * מדיניות התחלה לארקייד — משחקים עם יותר משני מקומות (ludo, bingo, snakes-and-ladders):
 * מלא → התחלה מיידית; בין min ל-max → חלון 60 שניות או עד שמתמלא.
 */

import { refundArcadeEntry } from "./arcade-coins";
import { fetchArcadeGameRow } from "./arcade-games-query";
import { maybeStartFourlineSession } from "./fourline-game";
import { maybeStartLudoSession } from "./ludo-game";
import { maybeStartSnakesAndLaddersSession } from "./snakesLaddersGame";
import { maybeStartCheckersSession } from "./checkers-game";
import { maybeStartBingoSession } from "./bingo-game";
import { maybeStartChessSession } from "./chess-game";
import { maybeStartDominoesSession } from "./dominoes-game";
import { effectiveRoomPlayerCap } from "./arcade-game-policy";

/** משחקים עם חלון המתנה (לא מתחילים מיד בשני שחקנים כש-max גדול מ-min) */
export const FLEX_START_GAME_KEYS = new Set(["ludo", "bingo", "snakes-and-ladders"]);

export const FLEX_START_WAIT_MS = 60_000;

/**
 * @param {string} gameKey
 */
export function isFlexStartGameKey(gameKey) {
  return FLEX_START_GAME_KEYS.has(String(gameKey || ""));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 * @param {string} roomId
 */
async function dispatchMaybeStart(supabase, gameKey, roomId) {
  const g = String(gameKey || "");
  if (g === "fourline") return maybeStartFourlineSession(supabase, roomId);
  if (g === "ludo") return maybeStartLudoSession(supabase, roomId);
  if (g === "snakes-and-ladders") return maybeStartSnakesAndLaddersSession(supabase, roomId);
  if (g === "checkers") return maybeStartCheckersSession(supabase, roomId);
  if (g === "bingo") return maybeStartBingoSession(supabase, roomId);
  if (g === "chess") return maybeStartChessSession(supabase, roomId);
  if (g === "dominoes") return maybeStartDominoesSession(supabase, roomId);
  return { skipped: true };
}

/**
 * מסנכרן את start_window_started_at: מתאפס מתחת ל-min; נשמר (COALESCE) בין min אל max 1.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 */
export async function syncArcadeFlexStartWindow(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return;
  if (room.status !== "waiting" || !isFlexStartGameKey(room.game_key)) return;

  const gameLookup = await fetchArcadeGameRow(supabase, String(room.game_key));
  if (gameLookup.error || !gameLookup.game) return;

  const game = gameLookup.game;
  const minP = Math.max(1, Math.floor(Number(game.min_players ?? 1)));
  const maxP = Math.max(minP, Math.floor(Number(room.max_players ?? 1)));

  const { count, error: cErr } = await supabase
    .from("arcade_room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .is("left_at", null);

  if (cErr) return;
  const n = count || 0;

  if (n < minP) {
    await supabase
      .from("arcade_rooms")
      .update({ start_window_started_at: null })
      .eq("id", roomId)
      .eq("status", "waiting");
    return;
  }

  if (n >= maxP) {
    return;
  }

  const nowIso = new Date().toISOString();
  const prev = room.start_window_started_at;
  await supabase
    .from("arcade_rooms")
    .update({ start_window_started_at: prev || nowIso })
    .eq("id", roomId)
    .eq("status", "waiting");
}

/**
 * @param {Record<string, unknown>} room
 * @param {Record<string, unknown>} game
 * @param {number} activeCount
 */
function shouldAttemptSessionStart(room, game, activeCount) {
  const minP = Math.max(1, Math.floor(Number(game.min_players ?? 1)));
  const gk = String(room.game_key || "");
  const maxP = Math.max(minP, effectiveRoomPlayerCap(gk, room.max_players));

  if (activeCount < minP) return false;

  if (!isFlexStartGameKey(gk)) {
    return activeCount >= maxP;
  }

  if (activeCount >= maxP) return true;

  const startedAt = room.start_window_started_at;
  if (!startedAt) return false;
  const elapsed = Date.now() - new Date(String(startedAt)).getTime();
  return elapsed >= FLEX_START_WAIT_MS;
}

/**
 * הערכת התחלת סשן לאחר join / leave / קריאת snapshot (טיימר 60ש).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 * @param {{ triggeringStudentId?: string, triggeringPlayerRowId?: string } | null} joinRefundCtx
 * @returns {Promise<{ ok?: boolean, skipped?: boolean, already?: boolean, error?: Record<string, unknown> }>}
 */
export async function evaluateArcadeRoomSessionStart(supabase, roomId, joinRefundCtx = null) {
  const { data: room0, error: r0Err } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (r0Err || !room0 || room0.status !== "waiting") {
    return { skipped: true };
  }

  const gameLookup = await fetchArcadeGameRow(supabase, room0.game_key);
  if (gameLookup.error || !gameLookup.game) return { skipped: true };

  const game = gameLookup.game;

  if (isFlexStartGameKey(room0.game_key)) {
    await syncArcadeFlexStartWindow(supabase, roomId);
  }

  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room || room.status !== "waiting") return { skipped: true };

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("id")
    .eq("room_id", roomId)
    .is("left_at", null);

  if (pErr) return { skipped: true };
  const activeCount = (players || []).length;

  const { data: existing } = await supabase.from("arcade_game_sessions").select("id").eq("room_id", roomId).maybeSingle();
  if (existing?.id) {
    return { skipped: true, already: true };
  }

  if (!shouldAttemptSessionStart(room, game, activeCount)) {
    return { skipped: true };
  }

  const start = await dispatchMaybeStart(supabase, String(room.game_key), roomId);

  if (start.error) {
    if (
      joinRefundCtx?.triggeringStudentId &&
      joinRefundCtx?.triggeringPlayerRowId &&
      room.entry_cost != null
    ) {
      await supabase
        .from("arcade_room_players")
        .update({ left_at: new Date().toISOString() })
        .eq("id", joinRefundCtx.triggeringPlayerRowId);
      await refundArcadeEntry(
        supabase,
        joinRefundCtx.triggeringStudentId,
        room.entry_cost,
        `arcade:refund:session_start_failed:${roomId}:${joinRefundCtx.triggeringStudentId}`,
        { sourceId: roomId },
      );
    }
    return { error: start.error };
  }

  if (start.skipped === true) {
    return { skipped: true, already: start.already === true };
  }

  return { ok: true };
}
