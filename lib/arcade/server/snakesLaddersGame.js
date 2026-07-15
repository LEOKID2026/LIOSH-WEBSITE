import crypto from "node:crypto";
import {
  createInitialPositions,
  moveAfterRoll,
  resolveTurnAfterRoll,
} from "../snakes-ladders/snakesLaddersEngine";
import { fetchArcadeGameRow } from "./arcade-games-query";

async function ensureResultsNotWritten(supabase, gameSessionId) {
  const { count, error } = await supabase
    .from("arcade_results")
    .select("*", { count: "exact", head: true })
    .eq("game_session_id", gameSessionId);

  if (error) return { error };
  if ((count || 0) > 0) return { exists: true };
  return { exists: false };
}

function rollDiceSecure() {
  return crypto.randomInt(1, 7);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 * @param {number} seatIndex
 */
async function studentIdForSeat(supabase, roomId, seatIndex) {
  const { data } = await supabase
    .from("arcade_room_players")
    .select("student_id")
    .eq("room_id", roomId)
    .eq("seat_index", seatIndex)
    .is("left_at", null)
    .maybeSingle();
  return data?.student_id ? String(data.student_id) : null;
}

export async function maybeStartSnakesAndLaddersSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "snakes-and-ladders" || room.status !== "waiting") return { skipped: true };

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  const gameLookup = await fetchArcadeGameRow(supabase, room.game_key);
  if (gameLookup.error || !gameLookup.game) return { skipped: true };
  const minP = Math.max(1, Math.floor(Number(gameLookup.game.min_players ?? 1)));
  const maxCap = Math.max(minP, Math.floor(Number(room.max_players ?? 1)));
  if (pErr || !players || players.length < minP || players.length > maxCap) return { skipped: true };

  const { data: existing } = await supabase.from("arcade_game_sessions").select("id").eq("room_id", roomId).maybeSingle();
  if (existing?.id) return { skipped: true, already: true };

  const activeSeats = players.map((p) => Number(p.seat_index)).sort((a, b) => a - b);
  const { positions } = createInitialPositions(activeSeats.length);
  const turnSeat = activeSeats[0];
  const firstPlayer = players.find((p) => Number(p.seat_index) === turnSeat);
  if (!firstPlayer?.student_id) return { skipped: true };

  const state = {
    phase: "playing",
    winnerSeat: null,
    board: {
      turnSeat,
      activeSeats,
      positions,
      lastRoll: null,
    },
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "snakes-and-ladders",
      status: "active",
      current_turn_student_id: firstPlayer.student_id,
      state,
      revision: 0,
    })
    .select("*")
    .single();

  if (ins.error || !ins.data) {
    return { error: { code: "session_start_failed", message: ins.error?.message || "שגיאה" } };
  }

  const sessionRow = ins.data;

  const upd = await supabase
    .from("arcade_rooms")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      start_window_started_at: null,
    })
    .eq("id", roomId)
    .eq("status", "waiting")
    .select("id");

  const activated = Array.isArray(upd.data) ? upd.data.length > 0 : Boolean(upd.data?.id);

  if (upd.error || !activated) {
    await supabase.from("arcade_game_sessions").delete().eq("id", sessionRow.id);
    return {
      error: {
        code: "room_activate_failed",
        message: upd.error?.message || "לא ניתן להפעיל את החדר לאחר יצירת המשחק",
      },
    };
  }

  return { ok: true, session: sessionRow };
}

export async function finalizeSnakesAndLaddersOutcome(supabase, params) {
  const { roomId, gameSessionId, winnerSeat } = params;

  const check = await ensureResultsNotWritten(supabase, gameSessionId);
  if (check.error) return { error: check.error };
  if (check.exists) return { ok: true, duplicate: true };

  const { data: players } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null);

  await supabase
    .from("arcade_rooms")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  const list = players || [];
  const loserOrdered = list
    .filter((p) => Number(p.seat_index) !== winnerSeat)
    .sort((a, b) => Number(a.seat_index) - Number(b.seat_index));
  /** @type {Map<string, number>} */
  const placementByStudent = new Map();
  loserOrdered.forEach((p, i) => {
    placementByStudent.set(String(p.student_id), 2 + i);
  });

  const rows = list.map((p) => {
    const seat = Number(p.seat_index);
    const isWin = seat === winnerSeat;
    return {
      room_id: roomId,
      game_session_id: gameSessionId,
      student_id: p.student_id,
      result_type: isWin ? "win" : "loss",
      placement: isWin ? 1 : placementByStudent.get(String(p.student_id)) ?? null,
      score: null,
      reward_amount: 0,
      metadata: {},
    };
  });

  const ins = await supabase.from("arcade_results").insert(rows);
  if (ins.error) return { error: ins.error };

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   roomId: string,
 *   studentId: string,
 *   action: string,
 *   expectedRevision: number|null,
 * }} params
 */
export async function applySnakesAndLaddersAction(supabase, params) {
  const { roomId, studentId, action: rawAction, expectedRevision } = params;
  const action = String(rawAction || "").trim().toLowerCase();

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "snakes-and-ladders") {
    return { error: { code: "invalid_action", message: "החדר אינו נחשים וסולמות", status: 400 } };
  }

  const { data: membership } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return { error: { code: "not_in_room", message: "לא רשום בחדר", status: 403 } };
  }

  const mySeat = Number(membership.seat_index);

  const { data: session, error: sErr } = await supabase.from("arcade_game_sessions").select("*").eq("room_id", roomId).maybeSingle();
  if (sErr || !session) {
    return { error: { code: "game_not_ready", message: "אין משחק פעיל", status: 409 } };
  }

  if (room.status !== "active") {
    return { error: { code: "game_not_ready", message: "החדר לא במצב משחק", status: 409 } };
  }

  if (session.status !== "active") {
    return { error: { code: "game_finished", message: "המשחק הסתיים", status: 409 } };
  }

  const rev = session.revision != null ? Number(session.revision) : 0;
  if (expectedRevision != null && Number(expectedRevision) !== rev) {
    return {
      error: {
        code: "revision_conflict",
        message: "גרסה לא עדכנית - רענן",
        revision: rev,
        status: 409,
      },
    };
  }

  const state = session.state && typeof session.state === "object" ? /** @type {Record<string, unknown>} */ (session.state) : {};
  if (String(state.phase || "") === "finished") {
    return { error: { code: "game_finished", message: "המשחק הסתיים", status: 409 } };
  }

  const board = /** @type {Record<string, unknown>} */ (
    state.board && typeof state.board === "object" ? state.board : {}
  );
  const turnSeat = board.turnSeat != null ? Number(board.turnSeat) : null;

  if (turnSeat !== mySeat) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }
  if (String(session.current_turn_student_id || "") !== String(studentId)) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }

  if (action !== "roll") {
    return { error: { code: "invalid_action", message: "פעולה לא נתמכת", status: 400 } };
  }

  const positions = Array.isArray(board.positions) ? board.positions.map((x) => Number(x)) : [];
  const activeSeats = Array.isArray(board.activeSeats)
    ? board.activeSeats.map((x) => Number(x)).sort((a, b) => a - b)
    : [];

  const roll = rollDiceSecure();
  const prevSix = board.consecutiveSixes != null ? Number(board.consecutiveSixes) : 0;
  const thirdConsecutiveSixNoMove = roll === 6 && prevSix >= 2;
  const moved = thirdConsecutiveSixNoMove
    ? { positions: positions.slice(), reachedGoal: false }
    : moveAfterRoll(positions, activeSeats, mySeat, roll);

  if (moved.reachedGoal) {
    const newState = {
      ...state,
      phase: "finished",
      winnerSeat: mySeat,
      board: {
        ...board,
        positions: moved.positions,
        lastRoll: roll,
        turnSeat: mySeat,
        consecutiveSixes: 0,
      },
    };

    const { data: updated, error: uErr } = await supabase
      .from("arcade_game_sessions")
      .update({
        status: "finished",
        state: newState,
        revision: rev + 1,
        finished_at: new Date().toISOString(),
        current_turn_student_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("revision", rev)
      .select("*");

    if (uErr || !updated?.length) {
      return { error: { code: "revision_conflict", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
    }

    const fin = await finalizeSnakesAndLaddersOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: mySeat,
    });
    if (fin.error) {
      return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
    }

    return { ok: true, gameSession: updated[0] };
  }

  const { nextSeat, consecutiveSixes } = resolveTurnAfterRoll({
    roll,
    activeSeats,
    currentSeat: mySeat,
    prevConsecutiveSixes: prevSix,
  });
  const nextStudent = nextSeat != null ? await studentIdForSeat(supabase, roomId, nextSeat) : null;

  const newState = {
    ...state,
    phase: "playing",
    board: {
      ...board,
      positions: moved.positions,
      lastRoll: roll,
      turnSeat: nextSeat,
      consecutiveSixes,
    },
  };

  const { data: updated, error: uErr } = await supabase
    .from("arcade_game_sessions")
    .update({
      state: newState,
      revision: rev + 1,
      current_turn_student_id: nextStudent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("revision", rev)
    .select("*");

  if (uErr || !updated?.length) {
    return { error: { code: "revision_conflict", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
  }

  return { ok: true, gameSession: updated[0] };
}
