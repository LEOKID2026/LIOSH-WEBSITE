import {
  applyDrop,
  boardFull,
  emptyBoardCells,
  hasFourConnected,
  parseCellsFromState,
} from "../fourline/fourlineEngine";
import { earnArcadeReward, refundArcadeEntry } from "./arcade-coins";
import { resolveArcadeWinnerPot } from "./arcade-payout.server.js";

/**
 * When the second player joins a Fourline waiting room, open game session (seat 0 starts).
 */
export async function maybeStartFourlineSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "fourline" || room.status !== "waiting") return { skipped: true };

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  if (pErr || !players || players.length < room.max_players) return { skipped: true };

  const { data: existing } = await supabase.from("arcade_game_sessions").select("id").eq("room_id", roomId).maybeSingle();
  if (existing?.id) return { skipped: true, already: true };

  const p0 = players.find((p) => p.seat_index === 0);
  const p1 = players.find((p) => p.seat_index === 1);
  if (!p0 || !p1) return { skipped: true };

  const cells = emptyBoardCells();
  const state = {
    phase: "playing",
    board: {
      turnSeat: 0,
      cells,
      lastMove: null,
    },
    winnerSeat: null,
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "fourline",
      status: "active",
      current_turn_student_id: p0.student_id,
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

async function ensureResultsNotWritten(supabase, gameSessionId) {
  const { count, error } = await supabase
    .from("arcade_results")
    .select("*", { count: "exact", head: true })
    .eq("game_session_id", gameSessionId);

  if (error) return { error };
  if ((count || 0) > 0) return { exists: true };
  return { exists: false };
}

/**
 * סיום משחק כשיריב יצא / נעלם: זוכה מקבל קופה, מפסיד נרשם בלי זיכוי.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, gameSessionId: string, winnerSeat: 0|1, loserStudentId: string }} params
 */
export async function finalizeFourlineWalkawayOutcome(supabase, params) {
  const { roomId, gameSessionId, winnerSeat, loserStudentId } = params;

  const check = await ensureResultsNotWritten(supabase, gameSessionId);
  if (check.error) return { error: check.error };
  if (check.exists) return { ok: true, duplicate: true };

  const { data: roomRow } = await supabase.from("arcade_rooms").select("entry_cost").eq("id", roomId).maybeSingle();
  const entryCost = Math.max(0, Math.floor(Number(roomRow?.entry_cost ?? 0)));
  const { data: activePlayers } = await supabase
    .from("arcade_room_players")
    .select("id")
    .eq("room_id", roomId)
    .is("left_at", null);
  const potAmount = await resolveArcadeWinnerPot(
    supabase,
    "fourline",
    entryCost,
    activePlayers?.length || 2
  );

  const { data: winnerMembership } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null)
    .maybeSingle();

  if (
    !winnerMembership?.student_id ||
    Number(winnerMembership.seat_index) !== winnerSeat
  ) {
    return { error: { message: "שחקן מנצח לא תואם לחדר" } };
  }

  if (String(winnerMembership.student_id) === String(loserStudentId)) {
    return { error: { message: "סתירה במזהה שחקנים" } };
  }

  if (potAmount > 0) {
    const pay = await earnArcadeReward(
      supabase,
      winnerMembership.student_id,
      potAmount,
      `arcade:fourline:win_reward:${gameSessionId}`,
      { sourceId: gameSessionId, roomId, gameKey: "fourline", walkaway: true },
    );
    if (!pay.ok) {
      return { error: { message: pay.message || "שגיאת זיכוי מטבעות" } };
    }
  }

  await supabase
    .from("arcade_rooms")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  const rows = [
    {
      room_id: roomId,
      game_session_id: gameSessionId,
      student_id: winnerMembership.student_id,
      result_type: "win",
      placement: 1,
      score: null,
      reward_amount: potAmount,
      metadata: { walkaway: true },
    },
    {
      room_id: roomId,
      game_session_id: gameSessionId,
      student_id: loserStudentId,
      result_type: "loss",
      placement: 2,
      score: null,
      reward_amount: 0,
      metadata: { walkaway: true },
    },
  ];

  const ins = await supabase.from("arcade_results").insert(rows);
  if (ins.error) return { error: ins.error };

  return { ok: true };
}

/**
 * נקרא אחרי שחקן עזב חדר במצב active — המשחק נסגר, הנותר מנצח בנטישה.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 * @param {string} walkerStudentId — מי שיצא (כבר סומן left_at)
 */
export async function resolveFourlineWalkawayOnLeave(supabase, roomId, walkerStudentId) {
  const { data: session, error: sErr } = await supabase
    .from("arcade_game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  if (sErr || !session || session.status !== "active") {
    return { skipped: true };
  }

  const state = session.state && typeof session.state === "object" ? /** @type {Record<string, unknown>} */ (session.state) : {};
  if (String(state.phase || "") === "finished") {
    return { skipped: true };
  }

  const { data: activePlayers } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null);

  const stillIn = activePlayers || [];
  if (stillIn.length !== 1) {
    return { skipped: true };
  }

  const winnerRow = stillIn[0];
  const ws = Number(winnerRow.seat_index);
  if (ws !== 0 && ws !== 1) {
    return { skipped: true };
  }
  if (String(winnerRow.student_id) === String(walkerStudentId)) {
    return { skipped: true };
  }

  const rev = session.revision != null ? Number(session.revision) : 0;
  const board = state.board && typeof state.board === "object" ? /** @type {Record<string, unknown>} */ (state.board) : {};

  const newState = {
    ...state,
    phase: "finished",
    winnerSeat: ws,
    walkaway: true,
    board: {
      ...board,
      winner: ws,
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
    return { error: { message: uErr?.message || "עדכון משחק נכשל" } };
  }

  const fin = await finalizeFourlineWalkawayOutcome(supabase, {
    roomId,
    gameSessionId: session.id,
    winnerSeat: /** @type {0|1} */ (ws),
    loserStudentId: walkerStudentId,
  });

  if (fin.error) {
    return { error: fin.error };
  }

  return { ok: true, gameSession: updated[0] };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, gameSessionId: string, winnerSeat: null|0|1 }} params
 */
export async function finalizeFourlineOutcome(supabase, params) {
  const { roomId, gameSessionId, winnerSeat } = params;

  const check = await ensureResultsNotWritten(supabase, gameSessionId);
  if (check.error) return { error: check.error };
  if (check.exists) return { ok: true, duplicate: true };

  const { data: roomRow } = await supabase.from("arcade_rooms").select("entry_cost").eq("id", roomId).maybeSingle();
  const entryCost = Math.max(0, Math.floor(Number(roomRow?.entry_cost ?? 0)));

  const { data: players } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null);

  const potAmount = await resolveArcadeWinnerPot(
    supabase,
    "fourline",
    entryCost,
    players?.length || 2
  );

  if (winnerSeat === 0 || winnerSeat === 1) {
    const winner = (players || []).find((p) => p.seat_index === winnerSeat);
    if (winner?.student_id && potAmount > 0) {
      const pay = await earnArcadeReward(
        supabase,
        winner.student_id,
        potAmount,
        `arcade:fourline:win_reward:${gameSessionId}`,
        { sourceId: gameSessionId, roomId, gameKey: "fourline" },
      );
      if (!pay.ok) {
        return { error: { message: pay.message || "שגיאת זיכוי מטבעות" } };
      }
    }
  } else {
    for (const p of players || []) {
      if (!p?.student_id || entryCost <= 0) continue;
      const ref = await refundArcadeEntry(
        supabase,
        p.student_id,
        entryCost,
        `arcade:fourline:draw_refund:${gameSessionId}:${p.student_id}`,
        { sourceId: gameSessionId, roomId, gameKey: "fourline" },
      );
      if (!ref.ok) {
        return { error: { message: ref.message || "שגיאת החזר מטבעות (תיקו)" } };
      }
    }
  }

  await supabase
    .from("arcade_rooms")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  const rows = [];
  for (const p of players || []) {
    let resultType = "draw";
    /** @type {number|null} */
    let placement = null;
    /** @type {number} */
    let rewardAmount = 0;
    if (winnerSeat === 0 || winnerSeat === 1) {
      resultType = p.seat_index === winnerSeat ? "win" : "loss";
      placement = p.seat_index === winnerSeat ? 1 : 2;
      rewardAmount = p.seat_index === winnerSeat ? potAmount : 0;
    } else {
      resultType = "draw";
      placement = null;
      rewardAmount = entryCost;
    }
    rows.push({
      room_id: roomId,
      game_session_id: gameSessionId,
      student_id: p.student_id,
      result_type: resultType,
      placement,
      score: null,
      reward_amount: rewardAmount,
      metadata: {},
    });
  }

  if (rows.length > 0) {
    const ins = await supabase.from("arcade_results").insert(rows);
    if (ins.error) return { error: ins.error };
  }

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, studentId: string, column: number, expectedRevision: number|null }} params
 */
export async function applyFourlinePlayColumn(supabase, params) {
  const { roomId, studentId, column, expectedRevision } = params;
  const col = Math.floor(Number(column));

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "ROOM_NOT_FOUND", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "fourline") {
    return { error: { code: "WRONG_GAME", message: "החדר אינו Fourline", status: 400 } };
  }
  if (room.status !== "active") {
    return { error: { code: "ROOM_NOT_ACTIVE", message: "החדר לא במשחק פעיל", status: 400 } };
  }

  const { data: membership } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return { error: { code: "NOT_IN_ROOM", message: "לא רשום בחדר", status: 403 } };
  }

  const { data: session, error: sErr } = await supabase.from("arcade_game_sessions").select("*").eq("room_id", roomId).maybeSingle();
  if (sErr || !session) {
    return { error: { code: "NO_SESSION", message: "אין משחק פעיל", status: 400 } };
  }
  if (session.status !== "active") {
    return { error: { code: "GAME_NOT_PLAYING", message: "המשחק לא פעיל", status: 400 } };
  }

  const rev = session.revision != null ? Number(session.revision) : 0;
  if (expectedRevision != null && Number(expectedRevision) !== rev) {
    return {
      error: {
        code: "REVISION_MISMATCH",
        message: "גרסה לא עדכנית - רענן",
        revision: rev,
        status: 409,
      },
    };
  }

  const state = session.state && typeof session.state === "object" ? /** @type {Record<string, unknown>} */ (session.state) : {};
  if (String(state.phase || "") !== "playing") {
    return { error: { code: "GAME_NOT_PLAYING", message: "המשחק לא במצב משחק", status: 400 } };
  }

  const mySeat = membership.seat_index;
  if (mySeat !== 0 && mySeat !== 1) {
    return { error: { code: "NO_SEAT", message: "אין מושב", status: 400 } };
  }

  const board = /** @type {Record<string, unknown>} */ (state.board && typeof state.board === "object" ? state.board : {});
  const turnSeat = Number(board.turnSeat);
  if (turnSeat !== mySeat) {
    return { error: { code: "NOT_YOUR_TURN", message: "לא התור שלך", status: 400 } };
  }

  if (String(session.current_turn_student_id || "") !== String(studentId)) {
    return { error: { code: "NOT_YOUR_TURN", message: "לא התור שלך", status: 400 } };
  }

  const cells = parseCellsFromState(board.cells);
  const seat = /** @type {0|1} */ (mySeat);
  const drop = applyDrop(cells, col, seat);
  if (!drop.ok || !drop.newCells || drop.placedRow === null) {
    const code = drop.error === "BAD_COLUMN" ? "BAD_COLUMN" : "ILLEGAL_MOVE";
    const msg = drop.error === "BAD_COLUMN" ? "עמודה לא חוקית" : "מהלך לא חוקי";
    return { error: { code, message: msg, status: 400 } };
  }

  const newCells = drop.newCells;
  const placedRow = drop.placedRow;
  const won = hasFourConnected(newCells, placedRow, col, seat);

  if (won) {
    const newState = {
      ...state,
      phase: "finished",
      winnerSeat: seat,
      board: {
        ...board,
        turnSeat,
        cells: newCells,
        lastMove: { row: placedRow, col },
        winner: seat,
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
      return { error: { code: "REVISION_MISMATCH", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
    }

    const fin = await finalizeFourlineOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: seat,
    });
    if (fin.error) {
      return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
    }

    return { ok: true, gameSession: updated[0] };
  }

  if (boardFull(newCells)) {
    const newState = {
      ...state,
      phase: "finished",
      winnerSeat: null,
      board: {
        ...board,
        turnSeat,
        cells: newCells,
        lastMove: { row: placedRow, col },
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
      return { error: { code: "REVISION_MISMATCH", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
    }

    const fin = await finalizeFourlineOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: null,
    });
    if (fin.error) {
      return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
    }

    return { ok: true, gameSession: updated[0] };
  }

  const otherSeat = seat === 0 ? 1 : 0;
  const { data: others } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null);

  const other = (others || []).find((p) => p.seat_index === otherSeat);
  if (!other?.student_id) {
    const { data: leaverRow } = await supabase
      .from("arcade_room_players")
      .select("student_id")
      .eq("room_id", roomId)
      .eq("seat_index", otherSeat)
      .not("left_at", "is", null)
      .order("left_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!leaverRow?.student_id) {
      return { error: { code: "INTERNAL", message: "חסר שחקן יריב", status: 500 } };
    }

    const newStateWalkaway = {
      ...state,
      phase: "finished",
      winnerSeat: seat,
      walkaway: true,
      board: {
        ...board,
        turnSeat,
        cells: newCells,
        lastMove: { row: placedRow, col },
        winner: seat,
      },
    };

    const { data: updatedWa, error: uWaErr } = await supabase
      .from("arcade_game_sessions")
      .update({
        status: "finished",
        state: newStateWalkaway,
        revision: rev + 1,
        finished_at: new Date().toISOString(),
        current_turn_student_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("revision", rev)
      .select("*");

    if (uWaErr || !updatedWa?.length) {
      return { error: { code: "REVISION_MISMATCH", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
    }

    const finWa = await finalizeFourlineWalkawayOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: seat,
      loserStudentId: leaverRow.student_id,
    });
    if (finWa.error) {
      return { error: { code: "finish_failed", message: finWa.error.message || "שגיאת סיום", status: 500 } };
    }

    return { ok: true, gameSession: updatedWa[0] };
  }

  const newState = {
    ...state,
    board: {
      ...board,
      turnSeat: otherSeat,
      cells: newCells,
      lastMove: { row: placedRow, col },
    },
  };

  const { data: updated, error: uErr } = await supabase
    .from("arcade_game_sessions")
    .update({
      state: newState,
      revision: rev + 1,
      current_turn_student_id: other.student_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("revision", rev)
    .select("*");

  if (uErr || !updated?.length) {
    return { error: { code: "REVISION_MISMATCH", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
  }

  return { ok: true, gameSession: updated[0] };
}
