import {
  applyPlay,
  chooseFirstSeat,
  dealTwoPlayer,
  enumerateLegalPlays,
  pipSum,
} from "../dominoes/dominoesEngine";
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
export async function maybeStartDominoesSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "dominoes" || room.status !== "waiting") return { skipped: true };

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  if (pErr || !players || players.length !== 2) return { skipped: true };

  const { data: existing } = await supabase.from("arcade_game_sessions").select("id").eq("room_id", roomId).maybeSingle();
  if (existing?.id) return { skipped: true, already: true };

  const p0 = players.find((p) => Number(p.seat_index) === 0);
  const p1 = players.find((p) => Number(p.seat_index) === 1);
  if (!p0 || !p1) return { skipped: true };

  const dealt = dealTwoPlayer();
  const firstSeat = chooseFirstSeat(dealt.hands);
  const firstPlayer = firstSeat === 0 ? p0 : p1;

  const state = {
    phase: "playing",
    winnerSeat: null,
    dominoes: {
      hands: dealt.hands,
      stock: dealt.stock,
      chain: [],
      passesInRow: 0,
    },
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "dominoes",
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
export async function finalizeDominoesOutcome(supabase, params) {
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
    "dominoes",
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
        `arcade:dominoes:win_reward:${gameSessionId}`,
        { sourceId: gameSessionId, roomId, gameKey: "dominoes" },
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
        `arcade:dominoes:draw_refund:${gameSessionId}:${p.student_id}`,
        { sourceId: gameSessionId, roomId, gameKey: "dominoes" },
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
 *   action: string,
 *   tileId?: number|null,
 *   side?: string|null,
 *   expectedRevision: number|null,
 * }} params
 */
export async function applyDominoesAction(supabase, params) {
  const { roomId, studentId, action: rawAction, tileId, side, expectedRevision } = params;
  const action = String(rawAction || "").trim().toLowerCase();

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "dominoes") {
    return { error: { code: "wrong_game", message: "החדר אינו דומינו", status: 400 } };
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

  const dom =
    state.dominoes && typeof state.dominoes === "object"
      ? /** @type {Record<string, unknown>} */ (state.dominoes)
      : {};

  const handsRaw = dom.hands;
  /** @type {number[][]} */
  let hands = [[], []];
  if (Array.isArray(handsRaw) && handsRaw.length >= 2) {
    hands = [
      handsRaw[0].map((x) => Number(x)),
      handsRaw[1].map((x) => Number(x)),
    ];
  }

  const chainRaw = dom.chain;
  /** @type {{ tileId: number, leftPip: number, rightPip: number }[]} */
  let chain = [];
  if (Array.isArray(chainRaw)) {
    chain = chainRaw.map((c) => {
      const o = /** @type {Record<string, unknown>} */ (c);
      return {
        tileId: Number(o.tileId),
        leftPip: Number(o.leftPip),
        rightPip: Number(o.rightPip),
      };
    });
  }

  let passesInRow = Math.floor(Number(dom.passesInRow ?? 0));

  if (String(session.current_turn_student_id || "") !== String(studentId)) {
    return { error: { code: "not_your_turn", message: "לא התור שלך", status: 403 } };
  }

  const { data: players } = await supabase
    .from("arcade_room_players")
    .select("student_id, seat_index")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  const nextSeatId = (s) => (s === 0 ? 1 : 0);

  const finishGame = async (winnerSeatVal, newStateBase) => {
    const ns = {
      ...newStateBase,
      phase: "finished",
      winnerSeat: winnerSeatVal === 0 || winnerSeatVal === 1 ? winnerSeatVal : null,
    };
    const { data: updated, error: uErr } = await supabase
      .from("arcade_game_sessions")
      .update({
        status: "finished",
        state: ns,
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

    const fin = await finalizeDominoesOutcome(supabase, {
      roomId,
      gameSessionId: session.id,
      winnerSeat: winnerSeatVal === 0 || winnerSeatVal === 1 ? winnerSeatVal : null,
    });
    if (fin.error) {
      return { error: { code: "finish_failed", message: fin.error.message || "שגיאת סיום", status: 500 } };
    }

    return { ok: true, gameSession: updated[0] };
  };

  if (action === "pass") {
    const legal = enumerateLegalPlays(hands[mySeat] || [], chain);
    if (legal.length > 0) {
      return { error: { code: "illegal_pass", message: "יש מהלך חוקי - לא ניתן לדלג", status: 400 } };
    }

    passesInRow += 1;
    const nextS = nextSeatId(mySeat);
    const nextP = (players || []).find((p) => Number(p.seat_index) === nextS);

    if (passesInRow >= 2) {
      const p0 = pipSum(hands[0] || []);
      const p1 = pipSum(hands[1] || []);
      /** @type {null|0|1} */
      let winnerSeatVal = null;
      if (p0 < p1) winnerSeatVal = 0;
      else if (p1 < p0) winnerSeatVal = 1;
      else winnerSeatVal = null;

      const newState = {
        ...state,
        dominoes: {
          ...dom,
          hands,
          chain,
          passesInRow,
        },
      };

      return finishGame(winnerSeatVal, newState);
    }

    const newState = {
      ...state,
      dominoes: {
        ...dom,
        hands,
        chain,
        passesInRow,
      },
    };

    const { data: updated, error: uErr } = await supabase
      .from("arcade_game_sessions")
      .update({
        status: "active",
        state: newState,
        revision: rev + 1,
        current_turn_student_id: nextP?.student_id ?? null,
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

  if (action !== "play") {
    return { error: { code: "invalid_action", message: "פעולה לא חוקית", status: 400 } };
  }

  const tid = tileId != null ? Math.floor(Number(tileId)) : NaN;
  if (!Number.isFinite(tid)) {
    return { error: { code: "invalid_move", message: "חסר קלף", status: 400 } };
  }

  const hand = hands[mySeat] || [];
  if (!hand.includes(tid)) {
    return { error: { code: "invalid_move", message: "אין לך את הקלף", status: 400 } };
  }

  const sd = side != null ? String(side).trim().toLowerCase() : "";
  const sideNorm = sd === "left" || sd === "right" ? sd : chain.length === 0 ? "right" : "";

  const legal = enumerateLegalPlays(hand, chain);
  const okPlay = legal.some((x) => x.tileId === tid && (chain.length === 0 || x.side === sideNorm));
  if (!okPlay) {
    return { error: { code: "illegal_move", message: "מהלך לא חוקי", status: 400 } };
  }

  const playSide = chain.length === 0 ? "right" : /** @type {'left'|'right'} */ (sideNorm);
  const applied = applyPlay(chain, tid, playSide);
  if (applied.error || !applied.chain) {
    return { error: { code: "illegal_move", message: "מהלך לא חוקי", status: 400 } };
  }

  const newHand = hand.filter((x) => x !== tid);
  hands[mySeat] = newHand;

  if (newHand.length === 0) {
    const newState = {
      ...state,
      winnerSeat: mySeat,
      dominoes: {
        ...dom,
        hands,
        chain: applied.chain,
        passesInRow: 0,
      },
    };
    return finishGame(/** @type {0|1} */ (mySeat), newState);
  }

  passesInRow = 0;
  const nextS = nextSeatId(mySeat);
  const nextP = (players || []).find((p) => Number(p.seat_index) === nextS);

  const newState = {
    ...state,
    dominoes: {
      ...dom,
      hands,
      chain: applied.chain,
      passesInRow: 0,
    },
  };

  const { data: updated, error: uErr } = await supabase
    .from("arcade_game_sessions")
    .update({
      status: "active",
      state: newState,
      revision: rev + 1,
      current_turn_student_id: nextP?.student_id ?? null,
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
