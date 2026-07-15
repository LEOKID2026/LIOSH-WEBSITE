import { Chess } from "chess.js";
import { earnArcadeReward, refundArcadeEntry } from "./arcade-coins";
import { resolveArcadeWinnerPot } from "./arcade-payout.server.js";

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
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 */
export async function maybeStartChessSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "chess" || room.status !== "waiting") return { skipped: true };

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  if (pErr || !players || players.length < room.max_players) return { skipped: true };

  const { data: existing } = await supabase.from("arcade_game_sessions").select("id").eq("room_id", roomId).maybeSingle();
  if (existing?.id) return { skipped: true, already: true };

  const p0 = players.find((p) => Number(p.seat_index) === 0);
  const p1 = players.find((p) => Number(p.seat_index) === 1);
  if (!p0 || !p1) return { skipped: true };

  const game = new Chess();
  const state = {
    phase: "playing",
    winnerSeat: null,
    chess: {
      fen: game.fen(),
      lastMove: null,
    },
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "chess",
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

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, gameSessionId: string, winnerSeat: null|0|1 }} params
 */
export async function finalizeChessOutcome(supabase, params) {
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
    "chess",
    entryCost,
    Math.max((players || []).length, 2)
  );

  if (winnerSeat === 0 || winnerSeat === 1) {
    const winner = (players || []).find((p) => Number(p.seat_index) === winnerSeat);
    if (winner?.student_id && potAmount > 0) {
      const pay = await earnArcadeReward(
        supabase,
        winner.student_id,
        potAmount,
        `arcade:chess:win_reward:${gameSessionId}`,
        { sourceId: gameSessionId, roomId, gameKey: "chess" },
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
        `arcade:chess:draw_refund:${gameSessionId}:${p.student_id}`,
        { sourceId: gameSessionId, roomId, gameKey: "chess" },
      );
      if (!ref.ok) {
        return { error: { message: ref.message || "שגיאת החזר (תיקו)" } };
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
      resultType = Number(p.seat_index) === winnerSeat ? "win" : "loss";
      placement = Number(p.seat_index) === winnerSeat ? 1 : 2;
      rewardAmount = Number(p.seat_index) === winnerSeat ? potAmount : 0;
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
 * @param {{
 *   roomId: string,
 *   studentId: string,
 *   fromSquare: string,
 *   toSquare: string,
 *   promotion: string|null|undefined,
 *   expectedRevision: number|null,
 * }} params
 */
export async function applyChessAction(supabase, params) {
  const { roomId, studentId, fromSquare, toSquare, promotion, expectedRevision } = params;

  const from = typeof fromSquare === "string" ? fromSquare.trim().toLowerCase() : "";
  const to = typeof toSquare === "string" ? toSquare.trim().toLowerCase() : "";
  if (!from || !to || from.length < 2 || to.length < 2) {
    return { error: { code: "invalid_move", message: "מהלך לא תקין", status: 400 } };
  }

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "chess") {
    return { error: { code: "wrong_game", message: "החדר אינו שחמט", status: 400 } };
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
  if (mySeat !== 0 && mySeat !== 1) {
    return { error: { code: "bad_seat", message: "מושב לא תקין", status: 400 } };
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

  const chessWrap = state.chess && typeof state.chess === "object" ? /** @type {Record<string, unknown>} */ (state.chess) : {};
  const fenRaw = typeof chessWrap.fen === "string" ? chessWrap.fen : "";

  let game;
  try {
    game = new Chess(fenRaw || undefined);
  } catch {
    return { error: { code: "bad_state", message: "מצב לוח פגום", status: 500 } };
  }

  const turnSeat = game.turn() === "w" ? 0 : 1;
  if (turnSeat !== mySeat) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }
  if (String(session.current_turn_student_id || "") !== String(studentId)) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }

  /** @type {{ from: string, to: string, promotion?: string }} */
  const moveOpts = { from, to };
  const prom =
    promotion != null && String(promotion).trim()
      ? String(promotion).trim().toLowerCase().charAt(0)
      : undefined;
  if (prom && "qrnb".includes(prom)) {
    moveOpts.promotion = prom;
  }

  const fenStart = fenRaw || new Chess().fen();

  /** @param {{ from: string, to: string, promotion?: string }} opts */
  function tryPlay(opts) {
    const g = new Chess(fenStart);
    const m = g.move(opts);
    return m ? { played: m, game: g } : null;
  }

  let trial = tryPlay(moveOpts);
  if (!trial && !moveOpts.promotion) {
    trial = tryPlay({ from, to, promotion: "q" });
  }

  if (!trial) {
    return { error: { code: "illegal_move", message: "מהלך לא חוקי", status: 400 } };
  }

  const { played, game: gameAfter } = trial;

  const finished = gameAfter.isGameOver();

  /** @type {null|0|1} */
  let outcomeWinnerSeat = null;
  if (finished) {
    if (gameAfter.isCheckmate()) {
      outcomeWinnerSeat = gameAfter.turn() === "w" ? 1 : 0;
    } else {
      outcomeWinnerSeat = null;
    }
  }

  const { data: players } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  let nextStudentId = session.current_turn_student_id;
  if (!finished) {
    const nextSeat = gameAfter.turn() === "w" ? 0 : 1;
    const np = (players || []).find((p) => Number(p.seat_index) === nextSeat);
    nextStudentId = np?.student_id ?? null;
  } else {
    nextStudentId = null;
  }

  const newChessState = {
    fen: gameAfter.fen(),
    lastMove: {
      from: played.from,
      to: played.to,
      san: played.san,
    },
  };

  const newState = {
    ...state,
    phase: finished ? "finished" : "playing",
    winnerSeat:
      finished && (outcomeWinnerSeat === 0 || outcomeWinnerSeat === 1) ? outcomeWinnerSeat : null,
    chess: newChessState,
  };

  const { data: updated, error: uErr } = await supabase
    .from("arcade_game_sessions")
    .update({
      status: finished ? "finished" : "active",
      state: newState,
      revision: rev + 1,
      finished_at: finished ? new Date().toISOString() : null,
      current_turn_student_id: nextStudentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("revision", rev)
    .select("*");

  if (uErr || !updated?.length) {
    return { error: { code: "revision_conflict", message: "נכשל עדכון - נסה שוב", revision: rev, status: 409 } };
  }

  if (finished) {
    const fin = await finalizeChessOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: outcomeWinnerSeat === 0 || outcomeWinnerSeat === 1 ? outcomeWinnerSeat : null,
    });
    if (fin.error) {
      return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
    }
  }

  return { ok: true, gameSession: updated[0] };
}
