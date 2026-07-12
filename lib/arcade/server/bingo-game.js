/**
 * בינגו OV2 — לוגיקת שרת מותאמת לארקייד (arcade_rooms + arcade_game_sessions).
 * שומרת על אותם חוקי משחק/תזמונים כמו RPC ב-MLEO (10s בין קריאות, קופה, row 10%, full = שארית).
 */

import crypto from "node:crypto";
import {
  buildDeck,
  canClaimPrize,
  getCardForSeat,
  resolveCallerSeat,
} from "../bingo/ov2BingoEngine";
import { earnArcadeReward, refundArcadeEntry } from "./arcade-coins";
import { resolveArcadeWinnerPot, resolveBingoRowPrize } from "./arcade-payout.server.js";
import { fetchArcadeGameRow } from "./arcade-games-query";
import { getArcadeDisplayName } from "../club/player-profile.server.js";

/**
 * Snapshot אל normalizeOv2BingoAuthoritativeSnapshot (מותאם למשתמש מחובר בחדר).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} roomId
 * @param {string} viewerStudentId
 */
export async function getBingoOv2RpcPayload(supabase, roomId, viewerStudentId) {
  const { data: roomRow, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !roomRow || roomRow.game_key !== "bingo") return null;

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  if (pErr || !players?.length) return null;

  const ids = [...new Set(players.map((p) => p.student_id).filter(Boolean))];
  // Public display name only — never the child's real full_name (privacy: no real name
  // exposure to other players in an online game, matches the rest of the arcade).
  /** @type {Map<string, string>} */
  const nameById = new Map();
  for (const sid of ids) {
    nameById.set(String(sid), await getArcadeDisplayName(supabase, sid));
  }

  const playersWithDisplay = players.map((p) => ({
    ...p,
    display_name: nameById.get(String(p.student_id)) || "",
  }));

  const inRoom = playersWithDisplay.some((p) => String(p.student_id) === String(viewerStudentId));
  if (!inRoom) return null;

  const { data: gameSession } = await supabase.from("arcade_game_sessions").select("*").eq("room_id", roomId).maybeSingle();

  return buildOv2BingoRpcPayload(roomRow, gameSession || null, playersWithDisplay, viewerStudentId);
}

const CALL_COOLDOWN_MS = 10_000;

function makeRoundId() {
  return crypto.randomUUID();
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameSessionId
 */
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
 * @param {unknown[][]} grid
 */
function gridToJson(grid) {
  return grid.map((row) => row.slice());
}

export async function maybeStartBingoSession(supabase, roomId) {
  const { data: room, error: rErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (rErr || !room) return { skipped: true };
  if (room.game_key !== "bingo" || room.status !== "waiting") return { skipped: true };

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
  const matchSeq = 1;
  const roundId = makeRoundId();
  const seed = `${roomId}::${matchSeq}::${roundId}`;
  const deckOrder = buildDeck(seed);

  /** @type {Record<string, unknown>} */
  const cards = {};
  for (const seat of activeSeats) {
    cards[String(seat)] = gridToJson(getCardForSeat({ seed, roundId, seatIndex: seat }));
  }

  const callerSeat = resolveCallerSeat(activeSeats);
  const firstCaller = players.find((p) => Number(p.seat_index) === callerSeat);
  if (!firstCaller?.student_id) return { skipped: true };

  const entryPer = Math.max(0, Math.floor(Number(room.entry_cost ?? 0)));
  const potTotal = entryPer * players.length;
  const rowPrizeAmount = await resolveBingoRowPrize(supabase, potTotal);

  const now = new Date();
  const nextCallAt = new Date(now.getTime() + CALL_COOLDOWN_MS).toISOString();

  const bingoState = {
    phase: "playing",
    match_seq: matchSeq,
    round_id: roundId,
    seed,
    deck_order: deckOrder,
    deck_cards: cards,
    deck_pos: 0,
    called: [],
    last_number: null,
    next_call_at: nextCallAt,
    caller_student_id: String(firstCaller.student_id),
    pot_total: potTotal,
    row_prize_amount: rowPrizeAmount,
    claims: [],
    winner_student_id: null,
    winner_name: null,
    walkover_payout_amount: null,
    /** מפתוחות rematch — לא בשימוש MVP */
    rematch_requested_by_seat: {},
  };

  const state = {
    phase: "playing",
    bingo: bingoState,
    winnerSeat: null,
  };

  const ins = await supabase
    .from("arcade_game_sessions")
    .insert({
      room_id: roomId,
      game_key: "bingo",
      status: "active",
      current_turn_student_id: firstCaller.student_id,
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
      started_at: now.toISOString(),
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
 * בונה את אובייקט ה-snapshot כמו `ov2_bingo_build_snapshot` עבור normalizeOv2BingoAuthoritativeSnapshot.
 *
 * @param {Record<string, unknown>} roomRow — arcade_rooms
 * @param {Record<string, unknown>|null} gameSession
 * @param {Array<Record<string, unknown>>} playersWithDisplay
 * @param {string|null} viewerStudentId
 */
export function buildOv2BingoRpcPayload(roomRow, gameSession, playersWithDisplay, viewerStudentId) {
  const roomId = String(roomRow.id ?? "");
  const hostPk = roomRow.host_student_id != null ? String(roomRow.host_student_id) : "";

  /** @type {unknown[]} */
  const members = (playersWithDisplay || []).map((p) => ({
    participant_key: String(p.student_id ?? ""),
    display_name: String(p.display_name ?? "").trim(),
    seat_index: Number(p.seat_index),
    is_ready: true,
    wallet_state: "committed",
    amount_locked: Math.floor(Number(roomRow.entry_cost ?? 0)),
    meta: {},
  }));

  if (!gameSession) {
    return {
      room: {
        id: roomId,
        lifecycle_phase: "active",
        host_participant_key: hostPk,
        match_seq: 1,
        active_session_id: null,
        product_game_id: "ov2_bingo",
      },
      session: null,
      members,
      claims: [],
    };
  }

  const st = gameSession.state && typeof gameSession.state === "object" ? /** @type {Record<string, unknown>} */ (gameSession.state) : {};
  const bingo = st.bingo && typeof st.bingo === "object" ? /** @type {Record<string, unknown>} */ (st.bingo) : {};
  const phase =
    String(gameSession.status || "") === "finished"
      ? "finished"
      : String(bingo.phase || "") === "finished"
        ? "finished"
        : "playing";

  const deckOrder = Array.isArray(bingo.deck_order) ? bingo.deck_order.map((x) => Number(x)) : [];
  /** @type {Record<string, unknown>} */
  const deckCardsRaw = bingo.deck_cards && typeof bingo.deck_cards === "object" ? bingo.deck_cards : {};
  const deckPos = Math.floor(Number(bingo.deck_pos ?? 0));
  const called = Array.isArray(bingo.called) ? bingo.called.map((x) => Number(x)) : [];
  const sessionRevision = gameSession.revision != null ? Math.floor(Number(gameSession.revision)) : 0;
  const activeSeats = members.map((m) => Number(/** @type {Record<string, unknown>} */ (m).seat_index)).filter((n) => Number.isInteger(n));

  const callerPk = bingo.caller_student_id != null ? String(bingo.caller_student_id) : "";

  const deckObj = {
    order: deckOrder,
    cards: deckCardsRaw,
  };

  const claimsRaw = Array.isArray(bingo.claims) ? bingo.claims : [];
  /** @type {unknown[]} */
  const claims = claimsRaw.map((c) => {
    const r = c && typeof c === "object" ? /** @type {Record<string, unknown>} */ (c) : {};
    return {
      id: r.id != null ? String(r.id) : "",
      prize_key: String(r.prize_key ?? ""),
      claimed_by_participant_key: String(r.claimed_by_participant_key ?? ""),
      claimed_by_name: String(r.claimed_by_name ?? ""),
      seat_index: Math.floor(Number(r.seat_index ?? 0)),
      amount: Number(r.amount ?? 0),
      line_kind: String(r.line_kind ?? ""),
    };
  });

  const sessionPayload = {
    id: String(gameSession.id ?? ""),
    phase,
    match_seq: Math.floor(Number(bingo.match_seq ?? 1)),
    revision: sessionRevision,
    round_id: bingo.round_id != null ? String(bingo.round_id) : "",
    seed: bingo.seed != null ? String(bingo.seed) : "",
    active_seats: activeSeats,
    caller_participant_key: callerPk,
    last_number: bingo.last_number == null ? null : Number(bingo.last_number),
    called,
    deck_pos: deckPos,
    deck: deckObj,
    deck_total: deckOrder.length || 75,
    next_call_at: bingo.next_call_at != null ? String(bingo.next_call_at) : null,
    started_at: gameSession.created_at != null ? String(gameSession.created_at) : null,
    finished_at: gameSession.finished_at != null ? String(gameSession.finished_at) : null,
    entry_fee: Math.floor(Number(roomRow.entry_cost ?? 0)),
    pot_total: Number(bingo.pot_total ?? 0),
    row_prize_amount: Number(bingo.row_prize_amount ?? 0),
    walkover_payout_amount:
      bingo.walkover_payout_amount != null && bingo.walkover_payout_amount !== ""
        ? Math.floor(Number(bingo.walkover_payout_amount))
        : null,
    winner_participant_key: bingo.winner_student_id != null ? String(bingo.winner_student_id) : null,
    winner_name: bingo.winner_name != null ? String(bingo.winner_name) : null,
  };

  return {
    room: {
      id: roomId,
      lifecycle_phase: "active",
      host_participant_key: hostPk,
      match_seq: Math.floor(Number(bingo.match_seq ?? 1)),
      active_session_id: String(gameSession.id ?? ""),
      product_game_id: "ov2_bingo",
    },
    session: sessionPayload,
    members,
    claims,
  };
}

/**
 * סיכום משחק (ניצחון מלא או סיום קלף)
 */
async function finalizeBingoOutcome(supabase, params) {
  const { roomId, gameSessionId, winnerStudentId } = params;

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
    "bingo",
    entryCost,
    players?.length || 0
  );

  let claimsPaidTotal = 0;
  const { data: sessRow } = await supabase.from("arcade_game_sessions").select("state").eq("id", gameSessionId).maybeSingle();
  const st = sessRow?.state && typeof sessRow.state === "object" ? /** @type {Record<string, unknown>} */ (sessRow.state) : {};
  const bingoSt = st.bingo && typeof st.bingo === "object" ? /** @type {Record<string, unknown>} */ (st.bingo) : {};
  const cl = Array.isArray(bingoSt.claims) ? bingoSt.claims : [];
  claimsPaidTotal = claimsPaidSum(cl);

  /** זיכויים לשורות/מלא מגיעים רק מ claim_prize — לא לכפול כאן. סיום ללא מנצח: החזר כניסה רק אם לא חולקו פרסי שורות (קלף נגמר ללא זוכה מלא). */
  if (!winnerStudentId && entryCost > 0 && claimsPaidTotal <= 0) {
    for (const p of players || []) {
      if (!p?.student_id) continue;
      const r = await refundArcadeEntry(
        supabase,
        p.student_id,
        entryCost,
        `arcade:bingo:deck_exhausted:${gameSessionId}:${p.student_id}`,
        { sourceId: roomId },
      );
      if (!r.ok) return { error: { message: r.message || "שגיאת החזר" } };
    }
  }

  await supabase
    .from("arcade_rooms")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", roomId);

  const rows = (players || []).map((p) => {
    const isWinner = Boolean(winnerStudentId && String(p.student_id) === String(winnerStudentId));
    const isDraw = !winnerStudentId;
    return {
      room_id: roomId,
      game_session_id: gameSessionId,
      student_id: p.student_id,
      result_type: isDraw ? "draw" : isWinner ? "win" : "loss",
      placement: isDraw ? null : isWinner ? 1 : 2,
      score: null,
      reward_amount: isDraw ? (claimsPaidTotal <= 0 ? entryCost : 0) : isWinner ? potAmount : 0,
      metadata: isDraw ? { kind: "deck_exhausted", claimsPaidTotal } : {},
    };
  });

  if (rows.length > 0) {
    const ins = await supabase.from("arcade_results").insert(rows);
    if (ins.error) return { error: ins.error };
  }

  return { ok: true };
}

function claimsPaidSum(claims) {
  if (!Array.isArray(claims)) return 0;
  let s = 0;
  for (const c of claims) {
    if (c && typeof c === "object") {
      s += Number(/** @type {Record<string, unknown>} */ (c).amount ?? 0);
    }
  }
  return s;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ roomId: string, studentId: string, action: string, payload?: Record<string, unknown> }} params
 */
export async function applyBingoArcadeAction(supabase, params) {
  const { roomId, studentId, action: rawAction, payload } = params;
  const action = String(rawAction || "").trim().toLowerCase();

  const { data: room, error: roomErr } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא", status: 404 } };
  }
  if (room.game_key !== "bingo") {
    return { error: { code: "wrong_game", message: "לא חדר בינגו", status: 400 } };
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

  const { data: session, error: sErr } = await supabase.from("arcade_game_sessions").select("*").eq("room_id", roomId).maybeSingle();
  if (sErr || !session) {
    return { error: { code: "game_not_ready", message: "אין משחק פעיל", status: 409 } };
  }

  const rev = session.revision != null ? Number(session.revision) : 0;
  const expectedRevision = payload?.expectedRevision != null ? Number(payload.expectedRevision) : null;
  if (expectedRevision != null && expectedRevision !== rev) {
    return { error: { code: "revision_conflict", message: "גרסה לא עדכנית", revision: rev, status: 409 } };
  }

  const state = session.state && typeof session.state === "object" ? /** @type {Record<string, unknown>} */ (session.state) : {};
  const bingo = state.bingo && typeof state.bingo === "object" ? /** @type {Record<string, unknown>} */ (state.bingo) : {};

  if (action === "call_next") {
    if (String(session.status || "") !== "active") {
      return { error: { code: "game_finished", message: "המשחק לא פעיל", status: 409 } };
    }
    if (String(bingo.phase || "") === "finished") {
      return { error: { code: "game_finished", message: "המשחק הסתיים", status: 409 } };
    }
    if (String(bingo.caller_student_id || "") !== String(studentId)) {
      return { error: { code: "not_caller", message: "רק הקריין יכול לקרוא מספר", status: 403 } };
    }

    const now = Date.now();
    const nextAt = bingo.next_call_at ? Date.parse(String(bingo.next_call_at)) : NaN;
    if (Number.isFinite(nextAt) && now < nextAt) {
      return {
        error: {
          code: "call_too_soon",
          message: "עדיין לא זמן לקריאה הבאה",
          status: 400,
          next_call_at: bingo.next_call_at,
        },
      };
    }

    const order = Array.isArray(bingo.deck_order) ? bingo.deck_order.map((x) => Number(x)) : [];
    let deckPos = Math.floor(Number(bingo.deck_pos ?? 0));

    if (order.length !== 75 || deckPos >= 75) {
      const newBingoFin = {
        ...bingo,
        phase: "finished",
        next_call_at: null,
      };
      const updFin = await supabase
        .from("arcade_game_sessions")
        .update({
          status: "finished",
          state: { ...state, bingo: newBingoFin },
          revision: rev + 1,
          finished_at: new Date().toISOString(),
          current_turn_student_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .eq("revision", rev)
        .select("*");

      if (updFin.error || !updFin.data?.length) {
        return { error: { code: "revision_conflict", revision: rev, status: 409 } };
      }
      await finalizeBingoOutcome(supabase, { roomId, gameSessionId: session.id, winnerStudentId: null });
      return { ok: true, gameSession: updFin.data[0] };
    }

    const n = order[deckPos];
    const called = Array.isArray(bingo.called) ? [...bingo.called.map((x) => Number(x)), n] : [n];
    deckPos += 1;
    const finishedByDeck = deckPos >= 75;
    const nextIso = finishedByDeck
      ? null
      : new Date(Date.now() + CALL_COOLDOWN_MS).toISOString();

    const newBingo = {
      ...bingo,
      called,
      last_number: n,
      deck_pos: deckPos,
      next_call_at: nextIso,
      phase: finishedByDeck ? "finished" : "playing",
    };

    const upd = await supabase
      .from("arcade_game_sessions")
      .update({
        status: finishedByDeck ? "finished" : "active",
        state: { ...state, bingo: newBingo },
        revision: rev + 1,
        finished_at: finishedByDeck ? new Date().toISOString() : session.finished_at,
        current_turn_student_id: finishedByDeck ? null : session.current_turn_student_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("revision", rev)
      .select("*");

    if (upd.error || !upd.data?.length) {
      return { error: { code: "revision_conflict", revision: rev, status: 409 } };
    }

    if (finishedByDeck) {
      await finalizeBingoOutcome(supabase, { roomId, gameSessionId: session.id, winnerStudentId: null });
    }

    return { ok: true, gameSession: upd.data[0] };
  }

  if (action === "claim_prize") {
    const prizeKey = payload?.prizeKey != null ? String(payload.prizeKey).trim() : "";
    if (!prizeKey) {
      return { error: { code: "invalid_action", message: "חסר prizeKey", status: 400 } };
    }

    if (String(session.status || "") !== "active") {
      return { error: { code: "game_finished", message: "המשחק לא במצב זכייה", status: 409 } };
    }
    if (String(bingo.phase || "") !== "playing") {
      return { error: { code: "not_playing", message: "לא ניתן לתבוע כעת", status: 409 } };
    }

    const seatIndex = Number(membership.seat_index);
    const deckCards = bingo.deck_cards && typeof bingo.deck_cards === "object" ? bingo.deck_cards : {};
    const card = /** @type {number[][]} */ (deckCards[String(seatIndex)]);
    if (!card) {
      return { error: { code: "no_card", message: "אין כרטיס", status: 400 } };
    }

    const calledNums = bingo.called || [];
    const existingClaims = Array.isArray(bingo.claims) ? bingo.claims : [];

    if (
      !canClaimPrize({
        prizeKey,
        card,
        called: calledNums,
        existingClaims: existingClaims.map((c) => ({
          prize_key: /** @type {Record<string, unknown>} */ (c).prize_key,
        })),
      })
    ) {
      return { error: { code: "prize_not_earned", message: "עדיין לא זכאי", status: 400 } };
    }

    if (existingClaims.some((c) => String(/** @type {Record<string, unknown>} */ (c).prize_key) === prizeKey)) {
      return { error: { code: "already_claimed", message: "פרס כבר נלקח", status: 400 } };
    }

    const potTotal = Number(bingo.pot_total ?? 0);
    const rowAmt = Math.max(0, Number(bingo.row_prize_amount ?? 0));
    let amount = 0;
    let lineKind = "grid_row";

    if (prizeKey === "full") {
      const paid = claimsPaidSum(existingClaims);
      amount = Math.max(0, Math.floor(potTotal - paid));
      lineKind = "grid_full";
    } else {
      amount = Math.floor(rowAmt);
    }

    const claimId = crypto.randomUUID();
    // Public display name only — never the child's real full_name (privacy: no real name
    // exposure to other players in an online game, matches the rest of the arcade).
    let displayName = String(membership.display_name || "").trim();
    if (!displayName) {
      displayName = await getArcadeDisplayName(supabase, studentId);
    }

    const newClaim = {
      id: claimId,
      prize_key: prizeKey,
      claimed_by_participant_key: String(studentId),
      claimed_by_name: displayName,
      seat_index: seatIndex,
      amount,
      line_kind: lineKind,
    };

    const nextClaims = [...existingClaims, newClaim];

    let winnerStudentId = bingo.winner_student_id != null ? String(bingo.winner_student_id) : null;
    let winnerName = bingo.winner_name != null ? String(bingo.winner_name) : null;
    let phase = String(bingo.phase || "playing");
    let sessionStatus = String(session.status || "active");

    if (prizeKey === "full") {
      winnerStudentId = String(studentId);
      winnerName = displayName;
      phase = "finished";
      sessionStatus = "finished";
    }

    const newBingo = {
      ...bingo,
      claims: nextClaims,
      winner_student_id: winnerStudentId,
      winner_name: winnerName,
      phase,
      next_call_at: prizeKey === "full" ? null : bingo.next_call_at,
    };

    const upd = await supabase
      .from("arcade_game_sessions")
      .update({
        status: sessionStatus,
        state: { ...state, bingo: newBingo },
        revision: rev + 1,
        finished_at: prizeKey === "full" ? new Date().toISOString() : session.finished_at,
        current_turn_student_id: prizeKey === "full" ? null : session.current_turn_student_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("revision", rev)
      .select("*");

    if (upd.error || !upd.data?.length) {
      return { error: { code: "revision_conflict", revision: rev, status: 409 } };
    }

    if (amount > 0) {
      const pay = await earnArcadeReward(
        supabase,
        studentId,
        amount,
        `arcade:bingo:claim:${claimId}`,
        { sourceId: session.id, roomId, gameKey: "bingo", prizeKey },
      );
      if (!pay.ok) {
        return { error: { message: pay.message || "זיכוי נכשל", status: 500 } };
      }
    }

    if (prizeKey === "full") {
      const fin = await finalizeBingoOutcome(supabase, {
        roomId,
        gameSessionId: session.id,
        winnerStudentId: String(studentId),
      });
      if (fin.error) {
        return { error: { message: fin.error.message || "סיום נכשל", status: 500 } };
      }
    }

    return { ok: true, gameSession: upd.data[0] };
  }

  if (action === "request_rematch" || action === "cancel_rematch" || action === "start_next_match" || action === "open_session") {
    return { ok: true, gameSession: session, noop: true };
  }

  return { error: { code: "invalid_action", message: "פעולה לא נתמכת", status: 400 } };
}
