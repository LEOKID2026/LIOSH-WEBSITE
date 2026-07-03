import crypto from "node:crypto";
import { getActiveEntryCostAmounts } from "../../rewards/server/economy-config.server.js";
import { refundArcadeEntry, spendArcadeEntry } from "./arcade-coins";
import { assertGameAllowsArcadeSpend, effectiveRoomPlayerCap } from "./arcade-game-policy";
import { evaluateArcadeRoomSessionStart, isFlexStartGameKey, FLEX_START_WAIT_MS } from "./arcade-flex-start-policy";
import { fetchArcadeGameRow } from "./arcade-games-query";
import { resolveFourlineWalkawayOnLeave } from "./fourline-game";
import { resolveArcadeWalkawayOnLeave } from "./arcade-walkaway";
import { finalizeCheckersOutcome } from "./checkers-game";
import { finalizeChessOutcome } from "./chess-game";
import { finalizeDominoesOutcome } from "./dominoes-game";
import { finalizeLudoOutcome } from "./ludo-game";
import { finalizeSnakesAndLaddersOutcome } from "./snakesLaddersGame";

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STALE_WAITING_ROOM_MS = 15 * 60 * 1000;

/** Drop waiting rooms older than STALE_WAITING_ROOM_MS from lobby lists. */
export function filterStaleWaitingRooms(rooms) {
  const cutoff = Date.now() - STALE_WAITING_ROOM_MS;
  return (rooms || []).filter((room) => {
    if (room?.status !== "waiting") return true;
    const created = new Date(String(room.created_at || "")).getTime();
    if (!Number.isFinite(created)) return true;
    return created >= cutoff;
  });
}

export function generateJoinCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += JOIN_CODE_ALPHABET[crypto.randomInt(0, JOIN_CODE_ALPHABET.length)];
  }
  return out;
}

export async function fetchGameRow(supabase, gameKey) {
  return fetchArcadeGameRow(supabase, gameKey);
}

export async function validateEntryCost(supabase, gameRow, entryCost) {
  const c = Number(entryCost);
  const catalog = await getActiveEntryCostAmounts(supabase);
  if (!catalog.includes(c)) {
    return { error: { code: "invalid_entry_cost", message: "עלות כניסה לא חוקית" } };
  }
  const allowed = Array.isArray(gameRow.allowed_entry_costs) ? gameRow.allowed_entry_costs : [];
  if (!allowed.includes(c)) {
    return { error: { code: "entry_cost_not_allowed", message: "עלות לא זמינה למשחק זה" } };
  }
  return { ok: true, entryCost: c };
}

export function normalizeJoinCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * Create a room; host spends entry once (idempotent per room id).
 */
export async function createArcadeRoom(supabase, params) {
  const { studentId, gameKey, roomType, entryCost, maxPlayers: maxPlayersArg } = params;

  const gameLookup = await fetchGameRow(supabase, gameKey);
  if (gameLookup.error) return gameLookup;

  const game = gameLookup.game;

  const spendOk = assertGameAllowsArcadeSpend(game);
  if (spendOk.error) return spendOk;

  const rt = String(roomType || "").trim();
  if (rt !== "public" && rt !== "private" && rt !== "quick") {
    return {
      error: {
        code: "invalid_room_type",
        message: "סוג חדר לא נתמך (מותר public, private או quick)",
      },
    };
  }

  if (rt === "public" && game.supports_public_rooms !== true) {
    return { error: { code: "room_type_not_supported", message: "חדר ציבורי לא נתמך למשחק זה" } };
  }
  if (rt === "quick" && game.supports_quick_match !== true) {
    return { error: { code: "room_type_not_supported", message: "משחק מהיר לא נתמך למשחק זה" } };
  }
  if (rt === "private" && game.supports_private_rooms !== true) {
    return { error: { code: "room_type_not_supported", message: "חדר פרטי לא נתמך למשחק זה" } };
  }

  const costCheck = await validateEntryCost(supabase, game, entryCost);
  if (costCheck.error) return costCheck;

  const catalogMax = effectiveRoomPlayerCap(gameKey, game.max_players);
  let maxPlayers = Number(maxPlayersArg || catalogMax);
  if (!Number.isFinite(maxPlayers) || maxPlayers < game.min_players) {
    maxPlayers = catalogMax;
  }
  maxPlayers = Math.min(Math.max(maxPlayers, game.min_players), catalogMax);

  const roomId = crypto.randomUUID();

  let joinCode = null;
  if (rt === "private") {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = generateJoinCode(6);
      const { data: clash } = await supabase
        .from("arcade_rooms")
        .select("id")
        .eq("join_code", candidate)
        .maybeSingle();
      if (!clash?.id) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) {
      return { error: { code: "join_code_failed", message: "לא ניתן ליצור קוד חדר" } };
    }
  }

  const insertRoom = await supabase.from("arcade_rooms").insert({
    id: roomId,
    game_key: gameKey,
    host_student_id: studentId,
    room_type: rt,
    entry_cost: costCheck.entryCost,
    join_code: joinCode,
    status: "waiting",
    max_players: maxPlayers,
    metadata: {},
  }).select("*").single();

  if (insertRoom.error || !insertRoom.data) {
    return { error: { code: "room_create_failed", message: insertRoom.error?.message || "שגיאה" } };
  }

  const spend = await spendArcadeEntry(supabase, studentId, costCheck.entryCost, `arcade:room:${roomId}:host`, {
    sourceId: roomId,
    gameKey,
    roomType: rt,
  });

  if (!spend.ok) {
    await supabase.from("arcade_rooms").delete().eq("id", roomId);
    if (spend.code === "insufficient_funds") {
      return { error: { code: "insufficient_funds", message: "אין מספיק מטבעות" } };
    }
    return { error: { code: spend.code || "spend_failed", message: spend.message || "שגיאת חיוב" } };
  }

  const insPlayer = await supabase.from("arcade_room_players").insert({
    room_id: roomId,
    student_id: studentId,
    seat_index: 0,
    ready_state: false,
    metadata: { role: "host" },
  }).select("id").single();

  if (insPlayer.error) {
    await refundArcadeEntry(supabase, studentId, costCheck.entryCost, `arcade:refund:room_create_rollback:${roomId}`, {
      sourceId: roomId,
    });
    await supabase.from("arcade_rooms").delete().eq("id", roomId);
    return { error: { code: "player_insert_failed", message: insPlayer.error.message } };
  }

  return { room: insertRoom.data, hostSpend: spend };
}

export async function joinArcadeRoomById(supabase, studentId, roomId) {
  const { data: room, error: rErr } = await supabase
    .from("arcade_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (rErr || !room) return { error: { code: "room_not_found", message: "חדר לא נמצא" } };
  if (room.status !== "waiting") {
    return { error: { code: "room_not_joinable", message: "לא ניתן להצטרף לחדר זה" } };
  }

  const gameLookup = await fetchGameRow(supabase, room.game_key);
  if (gameLookup.error) return gameLookup;
  const spendOk = assertGameAllowsArcadeSpend(gameLookup.game);
  if (spendOk.error) return spendOk;

  const { data: existing } = await supabase
    .from("arcade_room_players")
    .select("id")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (existing?.id) {
    return { error: { code: "already_joined", message: "כבר בחדר" } };
  }

  const { count: playerCount, error: cErr } = await supabase
    .from("arcade_room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .is("left_at", null);

  if (cErr) return { error: { code: "db_error", message: cErr.message } };
  const joinCap = effectiveRoomPlayerCap(String(room.game_key || ""), room.max_players);
  if ((playerCount || 0) >= joinCap) {
    return { error: { code: "room_full", message: "החדר מלא" } };
  }

  const spend = await spendArcadeEntry(
    supabase,
    studentId,
    room.entry_cost,
    `arcade:room:${roomId}:join:${studentId}`,
    { sourceId: roomId, gameKey: room.game_key, roomType: room.room_type },
  );

  if (!spend.ok) {
    if (spend.code === "insufficient_funds") {
      return { error: { code: "insufficient_funds", message: "אין מספיק מטבעות" } };
    }
    return { error: { code: spend.code || "spend_failed", message: spend.message || "שגיאת חיוב" } };
  }

  const seatIndex = playerCount || 0;
  const ins = await supabase.from("arcade_room_players").insert({
    room_id: roomId,
    student_id: studentId,
    seat_index: seatIndex,
    ready_state: false,
    metadata: { role: "player" },
  }).select("*").single();

  if (ins.error) {
    await refundArcadeEntry(supabase, studentId, room.entry_cost, `arcade:refund:join_failed:${roomId}:${studentId}`, {
      sourceId: roomId,
    });
    const msg = String(ins.error.message || "");
    const codePg = String(ins.error.code || "");
    const slotConflict =
      codePg === "23505" ||
      msg.includes("arcade_room_players_active_seat") ||
      msg.includes("arcade_room_players_active_student");
    return {
      error: {
        code: slotConflict ? "seat_taken" : "join_failed",
        message: slotConflict ? "מקום תפוס או החדר התמלא" : ins.error.message,
      },
    };
  }

  const ev = await evaluateArcadeRoomSessionStart(supabase, roomId, {
    triggeringStudentId: studentId,
    triggeringPlayerRowId: ins.data.id,
  });

  if (ev.error) {
    const e = ev.error;
    return {
      error: {
        code: typeof e.code === "string" ? e.code : "session_start_failed",
        message: typeof e.message === "string" ? e.message : "לא ניתן להתחיל את המשחק",
      },
    };
  }

  const { data: roomFresh } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  const baseRoom = roomFresh || room;
  const roomForClient = { ...baseRoom };
  if (baseRoom.host_student_id !== studentId) {
    roomForClient.join_code = null;
  }

  return { room: roomForClient, player: ins.data };
}

export async function joinArcadeRoomByCode(supabase, studentId, rawCode) {
  const code = normalizeJoinCode(rawCode);
  if (code.length < 4) {
    return { error: { code: "invalid_code", message: "קוד לא תקין" } };
  }

  const { data: room, error } = await supabase
    .from("arcade_rooms")
    .select("*")
    .eq("join_code", code)
    .maybeSingle();

  if (error || !room) return { error: { code: "room_not_found", message: "לא נמצא חדר לקוד" } };
  return joinArcadeRoomById(supabase, studentId, room.id);
}

async function refundWaitingPlayer(supabase, room, studentId, reasonKey) {
  return refundArcadeEntry(supabase, studentId, room.entry_cost, `arcade:refund:${reasonKey}:${room.id}:${studentId}`, {
    sourceId: room.id,
    metadata: { reason: reasonKey },
  });
}

/**
 * Leave waiting room: refunds leaver; if host leaves, cancels room and refunds everyone else still present.
 */
export async function leaveArcadeRoom(supabase, studentId, roomId) {
  const { data: room, error: rErr } = await supabase
    .from("arcade_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (rErr || !room) return { error: { code: "room_not_found", message: "חדר לא נמצא" } };

  const { data: membership } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return { error: { code: "not_in_room", message: "לא רשום בחדר" } };
  }

  if (room.status !== "waiting") {
    await supabase
      .from("arcade_room_players")
      .update({ left_at: new Date().toISOString() })
      .eq("id", membership.id);

    if (room.status === "active") {
      switch (room.game_key) {
        case "fourline":
          await resolveFourlineWalkawayOnLeave(supabase, roomId, studentId);
          break;
        case "checkers":
          await resolveArcadeWalkawayOnLeave(supabase, roomId, studentId, finalizeCheckersOutcome);
          break;
        case "chess":
          await resolveArcadeWalkawayOnLeave(supabase, roomId, studentId, finalizeChessOutcome);
          break;
        case "dominoes":
          await resolveArcadeWalkawayOnLeave(supabase, roomId, studentId, finalizeDominoesOutcome);
          break;
        case "ludo":
          await resolveArcadeWalkawayOnLeave(supabase, roomId, studentId, finalizeLudoOutcome);
          break;
        case "snakes-and-ladders":
          await resolveArcadeWalkawayOnLeave(supabase, roomId, studentId, finalizeSnakesAndLaddersOutcome);
          break;
        default:
          break;
      }
    }

    return { ok: true, mode: "left_no_refund", room };
  }

  await refundWaitingPlayer(supabase, room, studentId, "room_leave");

  await supabase
    .from("arcade_room_players")
    .update({ left_at: new Date().toISOString() })
    .eq("id", membership.id);

  const isHost = room.host_student_id === studentId;

  if (isHost) {
    await supabase.from("arcade_rooms").update({ status: "cancelled", ended_at: new Date().toISOString() }).eq("id", roomId);

    const { data: others } = await supabase
      .from("arcade_room_players")
      .select("student_id,id")
      .eq("room_id", roomId)
      .is("left_at", null);

    for (const row of others || []) {
      await refundWaitingPlayer(supabase, room, row.student_id, "room_cancelled_host");
      await supabase
        .from("arcade_room_players")
        .update({ left_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    return { ok: true, mode: "host_cancelled_room", room };
  }

  await evaluateArcadeRoomSessionStart(supabase, roomId, null);

  return { ok: true, mode: "left_refunded", room };
}

/** Hide join code for non-host clients (public/quick have no code). */
export function arcadeRoomForViewer(room, viewerStudentId) {
  if (!room) return room;
  const r = { ...room };
  if (r.host_student_id !== viewerStudentId) {
    r.join_code = null;
  }
  return r;
}

/**
 * First waiting room this student is in for this game + entry cost (any room type).
 */
export async function findStudentCurrentWaitingRoom(supabase, studentId, gameKey, entryCost) {
  const ec = Number(entryCost);
  const { data: memberships, error: mErr } = await supabase
    .from("arcade_room_players")
    .select("room_id")
    .eq("student_id", studentId)
    .is("left_at", null);

  if (mErr || !memberships?.length) return { room: null };

  const ids = memberships.map((m) => m.room_id);
  const { data: room, error: rErr } = await supabase
    .from("arcade_rooms")
    .select("*")
    .in("id", ids)
    .eq("game_key", gameKey)
    .eq("status", "waiting")
    .eq("entry_cost", ec)
    .limit(1)
    .maybeSingle();

  if (rErr || !room) return { room: null };
  return { room };
}

/**
 * Oldest joinable public/quick waiting room with a free seat, excluding rooms where student is already seated.
 */
export async function findJoinableOpenRoom(supabase, studentId, gameKey, entryCost) {
  const ec = Number(entryCost);
  const { data: rooms, error } = await supabase
    .from("arcade_rooms")
    .select("id, max_players, created_at, status")
    .eq("game_key", gameKey)
    .eq("status", "waiting")
    .eq("entry_cost", ec)
    .in("room_type", ["public", "quick"])
    .order("created_at", { ascending: true });

  if (error) return { error: { code: "db_error", message: error.message } };

  for (const room of filterStaleWaitingRooms(rooms)) {
    const { data: mem } = await supabase
      .from("arcade_room_players")
      .select("id")
      .eq("room_id", room.id)
      .eq("student_id", studentId)
      .is("left_at", null)
      .maybeSingle();
    if (mem?.id) continue;

    const { count, error: cErr } = await supabase
      .from("arcade_room_players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id)
      .is("left_at", null);

    if (cErr) continue;
    const openCap = effectiveRoomPlayerCap(gameKey, room.max_players);
    if ((count || 0) < openCap) {
      return { roomId: room.id };
    }
  }
  return { roomId: null };
}

/**
 * Waiting public/quick rooms for lobby list (no join_code). Includes player counts.
 */
export async function listOpenArcadeRooms(supabase, gameKey) {
  const { data: rooms, error } = await supabase
    .from("arcade_rooms")
    .select("id, game_key, room_type, entry_cost, status, max_players, created_at, start_window_started_at")
    .eq("game_key", gameKey)
    .eq("status", "waiting")
    .in("room_type", ["public", "quick"])
    .order("created_at", { ascending: false });

  if (error) return { error: { code: "db_error", message: error.message } };

  const freshRooms = filterStaleWaitingRooms(rooms);

  const gameLookup = await fetchGameRow(supabase, gameKey);
  const gameTitle = gameLookup.game?.title || gameKey;

  const list = [];
  for (const room of freshRooms) {
    const { count, error: cErr } = await supabase
      .from("arcade_room_players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id)
      .is("left_at", null);

    if (cErr) continue;
    const playerCount = count || 0;
    const sw = room.start_window_started_at ?? null;
    let flexAutoStartAt = null;
    if (sw && isFlexStartGameKey(room.game_key)) {
      const t = new Date(String(sw)).getTime();
      if (Number.isFinite(t)) flexAutoStartAt = new Date(t + FLEX_START_WAIT_MS).toISOString();
    }

    list.push({
      roomId: room.id,
      gameKey: room.game_key,
      gameTitle,
      roomType: room.room_type,
      entryCost: room.entry_cost,
      status: room.status,
      playerCount,
      maxPlayers: effectiveRoomPlayerCap(room.game_key, room.max_players),
      startWindowStartedAt: sw,
      flexAutoStartAt,
    });
  }

  return { rooms: list };
}

/**
 * Quick match: reuse current waiting room, or join first open slot, or create a quick room.
 * Always returns a concrete room id when successful (no orphan queue row).
 */
export async function quickMatchArcadeRoom(supabase, params) {
  const { studentId, gameKey, entryCost } = params;

  const gameLookup = await fetchGameRow(supabase, gameKey);
  if (gameLookup.error) return gameLookup;

  const game = gameLookup.game;

  const spendOk = assertGameAllowsArcadeSpend(game);
  if (spendOk.error) return spendOk;

  const costCheck = await validateEntryCost(supabase, game, entryCost);
  if (costCheck.error) return costCheck;

  const waiting = await findStudentCurrentWaitingRoom(
    supabase,
    studentId,
    gameKey,
    costCheck.entryCost,
  );
  if (waiting.room) {
    return {
      room: arcadeRoomForViewer(waiting.room, studentId),
      mode: "already_in_room",
    };
  }

  const slot = await findJoinableOpenRoom(supabase, studentId, gameKey, costCheck.entryCost);
  if (slot.error) return slot;

  if (slot.roomId) {
    const joined = await joinArcadeRoomById(supabase, studentId, slot.roomId);
    if (!joined.error) {
      return { room: joined.room, mode: "joined", player: joined.player };
    }

    const code = joined.error.code;
    if (code === "already_joined") {
      const { data: room } = await supabase.from("arcade_rooms").select("*").eq("id", slot.roomId).maybeSingle();
      if (room) {
        return { room: arcadeRoomForViewer(room, studentId), mode: "already_in_room" };
      }
    }
    if (code === "room_full" || code === "seat_taken") {
      const created = await createArcadeRoom(supabase, {
        studentId,
        gameKey,
        roomType: "quick",
        entryCost: costCheck.entryCost,
      });
      if (created.error) return created;
      return { room: arcadeRoomForViewer(created.room, studentId), mode: "created" };
    }
    return joined;
  }

  const created = await createArcadeRoom(supabase, {
    studentId,
    gameKey,
    roomType: "quick",
    entryCost: costCheck.entryCost,
  });
  if (created.error) return created;
  return { room: arcadeRoomForViewer(created.room, studentId), mode: "created" };
}
