/**
 * When one player leaves an active arcade room, the remaining player wins by walkaway.
 * Updates session state to finished so polling clients show the win UI.
 */

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 * @param {string} walkerStudentId — player who left (already marked left_at)
 * @param {(supabase: import("@supabase/supabase-js").SupabaseClient, params: { roomId: string, gameSessionId: string, winnerSeat: number }) => Promise<{ ok?: boolean, error?: { message?: string }, skipped?: boolean }>} finalizeOutcome
 */
export async function resolveArcadeWalkawayOnLeave(supabase, roomId, walkerStudentId, finalizeOutcome) {
  const { data: session, error: sErr } = await supabase
    .from("arcade_game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  if (sErr || !session || session.status !== "active") {
    return { skipped: true };
  }

  const state =
    session.state && typeof session.state === "object"
      ? /** @type {Record<string, unknown>} */ (session.state)
      : {};
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
  if (!Number.isFinite(ws)) {
    return { skipped: true };
  }
  if (String(winnerRow.student_id) === String(walkerStudentId)) {
    return { skipped: true };
  }

  const rev = session.revision != null ? Number(session.revision) : 0;
  const board =
    state.board && typeof state.board === "object"
      ? /** @type {Record<string, unknown>} */ (state.board)
      : null;

  /** @type {Record<string, unknown>} */
  const newState = {
    ...state,
    phase: "finished",
    winnerSeat: ws,
    walkaway: true,
  };
  if (board) {
    newState.board = {
      ...board,
      mustContinueFrom: null,
      ...(Object.prototype.hasOwnProperty.call(board, "winner") ? { winner: ws } : {}),
    };
  }

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

  const fin = await finalizeOutcome(supabase, {
    roomId,
    gameSessionId: session.id,
    winnerSeat: ws,
  });

  if (fin.error) {
    return { error: fin.error };
  }

  return { ok: true, gameSession: updated[0] };
}
