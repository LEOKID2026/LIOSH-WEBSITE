import crypto from "node:crypto";
import {
  applyMove,
  createInitialBoard,
  listMovablePieces,
  nextTurnSeat,
} from "../ludo/ludoEngine";
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
 * When no piece can move after a roll — advance turn (classic pass).
 */
function advanceTurnAfterForcedPass(board, rolledValue) {
  const b = JSON.parse(JSON.stringify(board));
  b.dice = null;
  b.lastDice = rolledValue;
  b.extraTurn = false;
  const seats = b.activeSeats || [];
  const idx = seats.indexOf(b.turnSeat);
  if (idx < 0) return b;
  const nextIdx = (idx + 1) % seats.length;
  b.turnSeat = seats[nextIdx];
  return b;
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

export async function maybeStartLudoSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "ludo" || room.status !== "waiting") return { skipped: true };

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
  const board = createInitialBoard(activeSeats);
  const firstSeat = board.turnSeat;
  const firstPlayer = players.find((p) => Number(p.seat_index) === firstSeat);
  if (!firstPlayer?.student_id) return { skipped: true };

  const state = {
    phase: "playing",
    board,
    winnerSeat: null,
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "ludo",
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

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, gameSessionId: string, winnerSeat: number }} params
 */
export async function finalizeLudoOutcome(supabase, params) {
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
 *   pieceIndex?: number|null,
 *   expectedRevision: number|null,
 * }} params
 */
export async function applyLudoAction(supabase, params) {
  const { roomId, studentId, action: rawAction, pieceIndex: rawPiece, expectedRevision } = params;
  const action = String(rawAction || "").trim().toLowerCase();

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "ludo") {
    return { error: { code: "invalid_action", message: "החדר אינו משחק לודו", status: 400 } };
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
  if (!Number.isInteger(mySeat) || mySeat < 0 || mySeat > 3) {
    return { error: { code: "invalid_action", message: "מושב לא חוקי", status: 400 } };
  }

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

  const board =
    state.board && typeof state.board === "object"
      ? JSON.parse(JSON.stringify(state.board))
      : /** @type {Record<string, unknown>} */ ({});
  const turnSeat = board.turnSeat != null ? Number(board.turnSeat) : null;

  if (turnSeat !== mySeat) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }
  if (String(session.current_turn_student_id || "") !== String(studentId)) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }

  if (action === "roll") {
    if (board.dice != null && board.dice !== "") {
      return { error: { code: "invalid_action", message: "כבר הוגל הקוביה", status: 400 } };
    }

    const diceVal = rollDiceSecure();
    const movable = listMovablePieces(board, mySeat, diceVal);

    if (movable.length === 0) {
      let nextBoard = advanceTurnAfterForcedPass(board, diceVal);
      const nextSeat = nextBoard.turnSeat;
      const nextStudent = nextSeat != null ? await studentIdForSeat(supabase, roomId, nextSeat) : null;

      const newState = {
        ...state,
        phase: "playing",
        board: nextBoard,
        winnerSeat: state.winnerSeat ?? null,
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

    const nextBoard = JSON.parse(JSON.stringify(board));
    nextBoard.dice = diceVal;

    const newState = {
      ...state,
      phase: "playing",
      board: nextBoard,
      winnerSeat: state.winnerSeat ?? null,
    };

    const { data: updated, error: uErr } = await supabase
      .from("arcade_game_sessions")
      .update({
        state: newState,
        revision: rev + 1,
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

  if (action === "move") {
    const pi = rawPiece != null ? Math.floor(Number(rawPiece)) : NaN;
    if (!Number.isInteger(pi) || pi < 0 || pi > 3) {
      return { error: { code: "invalid_action", message: "חסר אינדקס כלי", status: 400 } };
    }

    const diceNow = board.dice != null ? Number(board.dice) : null;
    if (diceNow == null || Number.isNaN(diceNow)) {
      return { error: { code: "invalid_action", message: "יש להטיל קוביה קודם", status: 400 } };
    }

    const r = applyMove(board, mySeat, pi, diceNow);
    if (!r.ok || !r.board) {
      return { error: { code: "invalid_move", message: "מהלך לא חוקי", status: 400 } };
    }

    let newBoard = r.board;

    if (newBoard.winner != null && newBoard.winner !== "") {
      const winnerSeat = Number(newBoard.winner);
      const newState = {
        ...state,
        phase: "finished",
        winnerSeat,
        board: newBoard,
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

      const fin = await finalizeLudoOutcome(supabase, {
        roomId,
        gameSessionId: session.id,
        winnerSeat,
      });
      if (fin.error) {
        return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
      }

      return { ok: true, gameSession: updated[0] };
    }

    const nextSeatValue = nextTurnSeat(newBoard);
    newBoard = JSON.parse(JSON.stringify(newBoard));
    newBoard.turnSeat = nextSeatValue;

    const nextStudent =
      nextSeatValue != null ? await studentIdForSeat(supabase, roomId, nextSeatValue) : null;

    const newState = {
      ...state,
      phase: "playing",
      board: newBoard,
      winnerSeat: state.winnerSeat ?? null,
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

  return { error: { code: "invalid_action", message: "פעולה לא נתמכת", status: 400 } };
}
