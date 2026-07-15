import crypto from "node:crypto";
import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";
import { getActiveEntryCostAmounts } from "../../rewards/server/economy-config.server.js";
import { assertArcadePlayAccess } from "./arcade-access.server.js";
import { getArcadeDisplayName } from "./player-profile.server.js";
import { createArcadeRoom, fetchGameRow, joinArcadeRoomById } from "../server/arcade-rooms.js";

const INVITE_TTL_MS = 2 * 60 * 1000;
const INVITE_RATE_LIMIT = 5;
const INVITE_RATE_WINDOW_MS = 60 * 1000;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} gameRow
 */
async function resolveInviteEntryCost(supabase, gameRow) {
  const catalog = await getActiveEntryCostAmounts(supabase);
  const allowed = Array.isArray(gameRow.allowed_entry_costs) ? gameRow.allowed_entry_costs : [];
  const candidates = allowed.filter((amount) => catalog.includes(amount)).sort((a, b) => a - b);
  if (candidates.length) return candidates[0];
  if (allowed.length) return Math.min(...allowed);
  if (catalog.length) return Math.min(...catalog);
  return null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} roomId
 * @param {string} gameKey
 */
async function assertInviteRoomForSender(supabase, studentId, roomId, gameKey) {
  const { data: room, error } = await supabase.from("arcade_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error || !room?.id) {
    return { ok: false, code: "room_not_found", message: "חדר לא נמצא" };
  }
  if (String(room.game_key || "") !== String(gameKey || "")) {
    return { ok: false, code: "game_mismatch", message: "משחק לא תואם לחדר" };
  }
  if (room.status !== "waiting") {
    return { ok: false, code: "room_not_invitable", message: "לא ניתן להזמין לחדר זה" };
  }

  const { data: membership } = await supabase
    .from("arcade_room_players")
    .select("id")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership?.id) {
    return { ok: false, code: "not_in_room", message: "לא רשום בחדר" };
  }

  return { ok: true, room };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} fromStudentId
 * @param {string} toStudentId
 * @param {string} gameKey
 * @param {string|null} roomId
 */
export async function sendArcadeInvite(supabase, fromStudentId, toStudentId, gameKey, roomId = null) {
  const sendFeature = await assertGuestArcadeFeature(supabase, fromStudentId, "invites_send");
  if (!sendFeature.ok) return sendFeature;

  if (!toStudentId || fromStudentId === toStudentId) {
    return { ok: false, code: "self_invite", message: "לא ניתן להזמין את עצמך" };
  }

  const since = new Date(Date.now() - INVITE_RATE_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("arcade_invites")
    .select("*", { count: "exact", head: true })
    .eq("from_student_id", fromStudentId)
    .gte("created_at", since);

  if ((recentCount || 0) >= INVITE_RATE_LIMIT) {
    return {
      ok: false,
      code: "rate_limited",
      message: "יותר מדי הזמנות - נסה שוב בעוד דקה",
      status: 429,
    };
  }

  const [a, b] = fromStudentId < toStudentId ? [fromStudentId, toStudentId] : [toStudentId, fromStudentId];
  const { data: friendship } = await supabase
    .from("arcade_friendships")
    .select("id")
    .eq("student_a_id", a)
    .eq("student_b_id", b)
    .maybeSingle();

  if (!friendship?.id) {
    return { ok: false, code: "not_friends", message: "ניתן להזמין רק חברים" };
  }

  const normalizedGameKey = String(gameKey || "").trim();
  if (!normalizedGameKey) {
    return { ok: false, code: "bad_game", message: "משחק לא תקין" };
  }

  const access = await assertArcadePlayAccess(supabase, fromStudentId, normalizedGameKey, {
    roomAction: "private",
  });
  if (!access.ok) {
    return {
      ok: false,
      code: access.code || "forbidden",
      message: access.message || "אין הרשאה למשחק",
      status: access.status || 403,
    };
  }

  let inviteRoomId = roomId ? String(roomId).trim() : null;
  let roomForClient = null;

  if (inviteRoomId) {
    const roomCheck = await assertInviteRoomForSender(supabase, fromStudentId, inviteRoomId, normalizedGameKey);
    if (!roomCheck.ok) return roomCheck;
    roomForClient = roomCheck.room;
  } else {
    const gameLookup = await fetchGameRow(supabase, normalizedGameKey);
    if (gameLookup.error) {
      return {
        ok: false,
        code: gameLookup.error.code || "unknown_game",
        message: gameLookup.error.message || "משחק לא נמצא",
      };
    }
    const entryCost = await resolveInviteEntryCost(supabase, gameLookup.game);
    if (entryCost == null) {
      return { ok: false, code: "entry_cost_unavailable", message: "עלות כניסה לא זמינה" };
    }

    const created = await createArcadeRoom(supabase, {
      studentId: fromStudentId,
      gameKey: normalizedGameKey,
      roomType: "private",
      entryCost,
    });
    if (created.error) {
      const code = created.error.code || "room_create_failed";
      const status = code === "insufficient_funds" ? 402 : 400;
      return { ok: false, code, message: created.error.message, status };
    }
    inviteRoomId = created.room.id;
    roomForClient = created.room;
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("arcade_invites")
    .insert({
      id: crypto.randomUUID(),
      from_student_id: fromStudentId,
      to_student_id: toStudentId,
      room_id: inviteRoomId,
      game_key: normalizedGameKey,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") return { ok: false, code: "unavailable", message: "הזמנות לא זמינות", status: 503 };
    return { ok: false, code: "db_error", message: error.message };
  }

  return { ok: true, invite: data, room: roomForClient };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function listPendingInvites(supabase, studentId) {
  const receiveFeature = await assertGuestArcadeFeature(supabase, studentId, "invites_receive");
  if (!receiveFeature.ok) return { ok: true, invites: [], featureLocked: true };

  const now = new Date().toISOString();
  await supabase
    .from("arcade_invites")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now);

  const { data } = await supabase
    .from("arcade_invites")
    .select("*")
    .eq("to_student_id", studentId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  const invites = [];
  for (const row of data || []) {
    invites.push({
      inviteId: row.id,
      fromStudentId: row.from_student_id,
      fromDisplayName: await getArcadeDisplayName(supabase, row.from_student_id),
      gameKey: row.game_key,
      roomId: row.room_id,
      expiresAt: row.expires_at,
    });
  }

  return { ok: true, invites, featureLocked: false };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} inviteId
 * @param {'accept'|'decline'} action
 */
export async function respondArcadeInvite(supabase, studentId, inviteId, action) {
  const receiveFeature = await assertGuestArcadeFeature(supabase, studentId, "invites_receive");
  if (!receiveFeature.ok) return receiveFeature;

  const { data: invite } = await supabase
    .from("arcade_invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite?.id || invite.to_student_id !== studentId || invite.status !== "pending") {
    return { ok: false, code: "not_found", message: "הזמנה לא נמצאה" };
  }

  if (new Date(String(invite.expires_at)).getTime() < Date.now()) {
    await supabase.from("arcade_invites").update({ status: "expired" }).eq("id", inviteId);
    return { ok: false, code: "expired", message: "ההזמנה פגה" };
  }

  if (action === "decline") {
    await supabase.from("arcade_invites").update({ status: "declined" }).eq("id", inviteId);
    return { ok: true, action: "declined" };
  }

  await supabase.from("arcade_invites").update({ status: "accepted" }).eq("id", inviteId);

  if (invite.room_id) {
    const join = await joinArcadeRoomById(supabase, studentId, invite.room_id);
    if (join.error) return { ok: false, code: join.error.code, message: join.error.message };
    return { ok: true, action: "accepted", room: join.room, player: join.player };
  }

  return { ok: true, action: "accepted", gameKey: invite.game_key };
}
