/**
 * Composite read for a student's view of a room (membership enforced).
 */

import { buildFourlineClientSnapshot } from "../fourline/buildFourlineSnapshot";
import { buildLudoClientSnapshot } from "../ludo/buildLudoSnapshot";
import { buildSnakesLaddersClientSnapshot } from "../snakes-ladders/buildSnakesLaddersSnapshot";
import { buildCheckersClientSnapshot } from "../checkers/buildCheckersSnapshot";
import { buildChessClientSnapshot } from "../chess/buildChessSnapshot";
import { buildDominoesClientSnapshot } from "../dominoes/buildDominoesSnapshot";
import {
  evaluateArcadeRoomSessionStart,
  isFlexStartGameKey,
  FLEX_START_WAIT_MS,
} from "./arcade-flex-start-policy";
import { getArcadeDisplayName } from "../club/player-profile.server.js";
import { getEquippedCosmeticsMap } from "../club/shop.server.js";

export async function getArcadeRoomSnapshot(supabase, studentId, roomId) {
  let { data: room, error: roomErr } = await supabase
    .from("arcade_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomErr || !room) {
    return { error: { code: "room_not_found", message: "חדר לא נמצא" } };
  }

  const { data: players, error: pErr } = await supabase
    .from("arcade_room_players")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("seat_index", { ascending: true });

  if (pErr) {
    return { error: { code: "db_error", message: pErr.message } };
  }

  const active = players || [];
  const membership = active.find((row) => row.student_id === studentId);
  if (!membership) {
    return { error: { code: "forbidden", message: "אין גישה לחדר זה" } };
  }

  await evaluateArcadeRoomSessionStart(supabase, roomId, null);
  const { data: roomAfterEval } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomAfterEval) room = roomAfterEval;

  const studentIds = [...new Set(active.map((p) => p.student_id).filter(Boolean))];
  /** @type {Map<string, string>} */
  const nameById = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const cosmeticsById = new Map();
  for (const sid of studentIds) {
    nameById.set(String(sid), await getArcadeDisplayName(supabase, sid));
    cosmeticsById.set(String(sid), await getEquippedCosmeticsMap(supabase, sid));
  }

  const playersWithNames = active.map((p) => ({
    ...p,
    display_name: nameById.get(String(p.student_id)) || "",
    cosmetics: cosmeticsById.get(String(p.student_id)) || {},
  }));

  const { data: gameSession } = await supabase
    .from("arcade_game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  const isHost = room.host_student_id === studentId;
  const roomForClient = { ...room };
  if (!isHost) {
    roomForClient.join_code = null;
  }

  if (
    room.status === "waiting" &&
    isFlexStartGameKey(room.game_key) &&
    room.start_window_started_at
  ) {
    const t0 = new Date(String(room.start_window_started_at)).getTime();
    if (Number.isFinite(t0)) {
      roomForClient.flex_auto_start_at = new Date(t0 + FLEX_START_WAIT_MS).toISOString();
      roomForClient.flex_start_wait_ms = FLEX_START_WAIT_MS;
    }
  }

  /** @type {Record<string, unknown>|null} */
  let fourline = null;
  if (room.game_key === "fourline" && gameSession) {
    fourline = buildFourlineClientSnapshot(gameSession, playersWithNames, studentId, room);
  }

  /** @type {Record<string, unknown>|null} */
  let ludo = null;
  if (room.game_key === "ludo" && gameSession) {
    ludo = buildLudoClientSnapshot(gameSession, playersWithNames, studentId);
  }

  /** @type {Record<string, unknown>|null} */
  let snakesAndLadders = null;
  if (room.game_key === "snakes-and-ladders" && gameSession) {
    snakesAndLadders = buildSnakesLaddersClientSnapshot(gameSession, playersWithNames, studentId);
  }

  /** @type {Record<string, unknown>|null} */
  let checkers = null;
  if (room.game_key === "checkers" && gameSession) {
    checkers = buildCheckersClientSnapshot(gameSession, playersWithNames, studentId, roomForClient);
  }

  /** @type {Record<string, unknown>|null} */
  let chess = null;
  if (room.game_key === "chess" && gameSession) {
    chess = buildChessClientSnapshot(gameSession, playersWithNames, studentId, roomForClient);
  }

  /** @type {Record<string, unknown>|null} */
  let dominoes = null;
  if (room.game_key === "dominoes" && gameSession) {
    dominoes = buildDominoesClientSnapshot(gameSession, playersWithNames, studentId, roomForClient);
  }

  const sessionState =
    gameSession?.state && typeof gameSession.state === "object" ? gameSession.state : {};
  const socialEmotes = Array.isArray(sessionState.emotes)
    ? sessionState.emotes.filter((e) => {
        if (!e?.expiresAt) return true;
        return new Date(String(e.expiresAt)).getTime() > Date.now();
      })
    : [];

  return {
    room: roomForClient,
    players: playersWithNames,
    gameSession: gameSession || null,
    membership,
    socialEmotes,
    fourline,
    ludo,
    snakesAndLadders,
    checkers,
    chess,
    dominoes,
    arcadePlaceholder: null,
  };
}
