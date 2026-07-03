import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";
import { applyArcadeCoinMove } from "../server/arcade-coins.js";
import { isGuestStudent } from "../../guest/guest-display.js";

const DEFAULT_SAFE_MESSAGES = [
  { text_he: "כל הכבוד!", emoji: "👏", category: "praise", min_permission_level: "guest" },
  { text_he: "שחק שוב?", emoji: "🔄", category: "invite", min_permission_level: "guest" },
  { text_he: "כיף לשחק איתך!", emoji: "😊", category: "fun", min_permission_level: "guest" },
  { text_he: "ניצחת!", emoji: "🏆", category: "praise", min_permission_level: "registered" },
  { text_he: "משחק טוב!", emoji: "⭐", category: "praise", min_permission_level: "registered" },
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function ensureDefaultSafeMessages(supabase) {
  const { count } = await supabase
    .from("arcade_safe_messages")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if ((count || 0) > 0) return;

  for (const m of DEFAULT_SAFE_MESSAGES) {
    await supabase.from("arcade_safe_messages").insert({ ...m, active: true });
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function listSafeMessagesForStudent(supabase, studentId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "safe_messages");
  if (!feature.ok) return { ok: true, messages: [], featureLocked: true };

  await ensureDefaultSafeMessages(supabase);

  const { data: studentRow } = await supabase
    .from("students")
    .select("account_kind")
    .eq("id", studentId)
    .maybeSingle();

  const isGuest = isGuestStudent(studentRow || {});
  const minLevel = isGuest ? "guest" : "registered";

  const { data } = await supabase
    .from("arcade_safe_messages")
    .select("*")
    .eq("active", true)
    .in("min_permission_level", isGuest ? ["guest"] : ["guest", "registered"]);

  const messages = (data || [])
    .filter((m) => (isGuest ? m.min_permission_level === "guest" : true))
    .map((m) => ({
      id: m.id,
      textHe: m.text_he,
      emoji: m.emoji,
      category: m.category,
    }));

  return { ok: true, messages, featureLocked: false };
}

/**
 * Append emote to room session state (TTL handled client-side).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} roomId
 * @param {string} messageId
 */
export async function sendSafeMessageToRoom(supabase, studentId, roomId, messageId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "safe_messages");
  if (!feature.ok) return feature;

  const { data: msg } = await supabase
    .from("arcade_safe_messages")
    .select("*")
    .eq("id", messageId)
    .eq("active", true)
    .maybeSingle();

  if (!msg?.id) return { ok: false, code: "message_not_found", message: "הודעה לא נמצאה" };

  const { data: memberRow } = await supabase
    .from("arcade_room_players")
    .select("id")
    .eq("room_id", roomId)
    .eq("student_id", studentId)
    .is("left_at", null)
    .maybeSingle();

  if (!memberRow?.id) {
    return {
      ok: false,
      status: 403,
      code: "not_room_member",
      message: "לא ניתן לשלוח הודעה בחדר זה",
    };
  }

  const { data: session } = await supabase
    .from("arcade_game_sessions")
    .select("id, state")
    .eq("room_id", roomId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session?.id) return { ok: false, code: "no_session", message: "אין משחק פעיל" };

  const state = typeof session.state === "object" && session.state ? { ...session.state } : {};
  const emotes = Array.isArray(state.emotes) ? [...state.emotes] : [];
  emotes.push({
    studentId,
    textHe: msg.text_he,
    emoji: msg.emoji,
    at: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10_000).toISOString(),
  });
  state.emotes = emotes.slice(-20);

  await supabase.from("arcade_game_sessions").update({ state }).eq("id", session.id);

  return { ok: true, emote: emotes[emotes.length - 1] };
}
