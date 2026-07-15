import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";
import { getGuestLeoNumber } from "../../guest/guest-display.js";
import { getArcadeDisplayName } from "./player-profile.server.js";
import { normalizeLeoNumber } from "../../guest/guest-leo-number.server.js";

const PRESENCE_TTL_MS = 60 * 1000;
const FRIEND_REQUEST_RATE_LIMIT = 5;
const FRIEND_REQUEST_RATE_WINDOW_MS = 60 * 1000;

function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function touchArcadePresence(supabase, studentId) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("arcade_presence").upsert(
    {
      student_id: studentId,
      last_seen_at: now,
      is_online: true,
    },
    { onConflict: "student_id" }
  );
  if (error && error.code !== "42P01") throw new Error(error.message);
}

export function isPresenceOnline(lastSeenAt) {
  const t = new Date(String(lastSeenAt || "")).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= PRESENCE_TTL_MS;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} query
 */
export async function sendFriendRequest(supabase, studentId, query) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "friends");
  if (!feature.ok) return feature;

  const q = String(query || "").trim();
  if (!q) return { ok: false, code: "empty_query", message: "הזן מספר ליאו או שם תצוגה" };

  let target = null;
  const leo = normalizeLeoNumber(q);
  if (leo) {
    const { data } = await supabase
      .from("students")
      .select("id, account_kind, guest_status, is_active, leo_number")
      .eq("leo_number", leo)
      .maybeSingle();
    target = data;
  } else {
    const { data: profiles } = await supabase
      .from("arcade_player_profiles")
      .select("student_id, display_name")
      .ilike("display_name", q)
      .limit(5);
    if ((profiles || []).length === 1) {
      const { data } = await supabase
        .from("students")
        .select("id, account_kind, guest_status, is_active")
        .eq("id", profiles[0].student_id)
        .maybeSingle();
      target = data;
    } else if ((profiles || []).length > 1) {
      return { ok: false, code: "ambiguous_name", message: "נמצאו כמה שחקנים - נסה מספר ליאו" };
    }
  }

  if (!target?.id) return { ok: false, code: "not_found", message: "שחקן לא נמצא" };
  if (target.id === studentId) return { ok: false, code: "self", message: "לא ניתן להוסיף את עצמך" };
  if (target.is_active === false) return { ok: false, code: "inactive", message: "שחקן לא פעיל" };

  const since = new Date(Date.now() - FRIEND_REQUEST_RATE_WINDOW_MS).toISOString();
  const { count: recentRequests } = await supabase
    .from("arcade_friend_requests")
    .select("*", { count: "exact", head: true })
    .eq("from_student_id", studentId)
    .gte("created_at", since);

  if ((recentRequests || 0) >= FRIEND_REQUEST_RATE_LIMIT) {
    return {
      ok: false,
      code: "rate_limited",
      message: "יותר מדי בקשות חברות - נסה שוב בעוד דקה",
      status: 429,
    };
  }

  const [a, b] = orderedPair(studentId, target.id);
  const { data: existingFriend } = await supabase
    .from("arcade_friendships")
    .select("id")
    .eq("student_a_id", a)
    .eq("student_b_id", b)
    .maybeSingle();
  if (existingFriend?.id) return { ok: false, code: "already_friends", message: "אתם כבר חברים" };

  const { data: pending } = await supabase
    .from("arcade_friend_requests")
    .select("id, status")
    .or(
      `and(from_student_id.eq.${studentId},to_student_id.eq.${target.id}),and(from_student_id.eq.${target.id},to_student_id.eq.${studentId})`
    )
    .eq("status", "pending")
    .maybeSingle();
  if (pending?.id) {
    return { ok: false, code: "pending_exists", message: "כבר נשלחה בקשת חברות" };
  }

  const { error } = await supabase.from("arcade_friend_requests").insert({
    from_student_id: studentId,
    to_student_id: target.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "42P01") return { ok: false, code: "unavailable", message: "מערכת חברים לא זמינה", status: 503 };
    return { ok: false, code: "db_error", message: error.message };
  }

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} requestId
 * @param {'accept'|'decline'} action
 */
export async function respondFriendRequest(supabase, studentId, requestId, action) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "friends");
  if (!feature.ok) return feature;

  const { data: reqRow } = await supabase
    .from("arcade_friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!reqRow?.id || reqRow.to_student_id !== studentId || reqRow.status !== "pending") {
    return { ok: false, code: "not_found", message: "בקשה לא נמצאה" };
  }

  if (action === "decline") {
    await supabase.from("arcade_friend_requests").update({ status: "declined" }).eq("id", requestId);
    return { ok: true, action: "declined" };
  }

  const [a, b] = orderedPair(reqRow.from_student_id, reqRow.to_student_id);
  const { data: existingFriend } = await supabase
    .from("arcade_friendships")
    .select("id")
    .eq("student_a_id", a)
    .eq("student_b_id", b)
    .maybeSingle();
  if (!existingFriend?.id) {
    const { error: friendError } = await supabase
      .from("arcade_friendships")
      .insert({ student_a_id: a, student_b_id: b });
    if (friendError && friendError.code !== "23505") {
      return { ok: false, code: "db_error", message: friendError.message };
    }
  }
  await supabase.from("arcade_friend_requests").update({ status: "accepted" }).eq("id", requestId);
  return { ok: true, action: "accepted" };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function listArcadeFriends(supabase, studentId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "friends");
  if (!feature.ok) {
    return { ok: true, friends: [], pendingIncoming: [], featureLocked: true };
  }

  const { data: friendships } = await supabase
    .from("arcade_friendships")
    .select("id, student_a_id, student_b_id, created_at")
    .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`);

  const friendIds = (friendships || []).map((f) =>
    f.student_a_id === studentId ? f.student_b_id : f.student_a_id
  );

  const friends = [];
  for (const fid of friendIds) {
    const displayName = await getArcadeDisplayName(supabase, fid);
    const { data: presence } = await supabase
      .from("arcade_presence")
      .select("last_seen_at, is_online")
      .eq("student_id", fid)
      .maybeSingle();
    friends.push({
      studentId: fid,
      displayName,
      online: isPresenceOnline(presence?.last_seen_at),
      lastSeenAt: presence?.last_seen_at || null,
    });
  }

  const { data: pendingIncoming } = await supabase
    .from("arcade_friend_requests")
    .select("id, from_student_id, created_at")
    .eq("to_student_id", studentId)
    .eq("status", "pending");

  const incoming = [];
  for (const row of pendingIncoming || []) {
    const { data: fromStudent } = await supabase
      .from("students")
      .select("leo_number")
      .eq("id", row.from_student_id)
      .maybeSingle();
    incoming.push({
      requestId: row.id,
      fromStudentId: row.from_student_id,
      displayName: await getArcadeDisplayName(supabase, row.from_student_id),
      leoNumber: getGuestLeoNumber(fromStudent),
      createdAt: row.created_at,
    });
  }

  return { ok: true, friends, pendingIncoming: incoming, featureLocked: false };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} friendStudentId
 */
export async function removeArcadeFriend(supabase, studentId, friendStudentId) {
  const [a, b] = orderedPair(studentId, friendStudentId);
  await supabase
    .from("arcade_friendships")
    .delete()
    .eq("student_a_id", a)
    .eq("student_b_id", b);
  return { ok: true };
}
