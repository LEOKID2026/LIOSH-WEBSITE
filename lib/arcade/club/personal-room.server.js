import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getPersonalRoom(supabase, studentId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "personal_room");
  if (!feature.ok) return { ok: true, room: null, featureLocked: true };

  const { data } = await supabase
    .from("arcade_personal_rooms")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!data) {
    return {
      ok: true,
      room: {
        studentId,
        roomName: "החדר שלי",
        backgroundId: null,
        decorationSlots: [],
      },
      featureLocked: false,
    };
  }

  return {
    ok: true,
    room: {
      studentId: data.student_id,
      roomName: data.room_name,
      backgroundId: data.background_id,
      decorationSlots: data.decoration_slots || [],
    },
    featureLocked: false,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ roomName?: string, backgroundId?: number, decorationSlots?: unknown[] }} patch
 */
export async function updatePersonalRoom(supabase, studentId, patch) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "personal_room");
  if (!feature.ok) return feature;

  const row = {
    student_id: studentId,
    room_name: patch.roomName != null ? String(patch.roomName).slice(0, 40) : undefined,
    background_id: patch.backgroundId != null ? Number(patch.backgroundId) : undefined,
    decoration_slots: Array.isArray(patch.decorationSlots) ? patch.decorationSlots : undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);

  const { data, error } = await supabase
    .from("arcade_personal_rooms")
    .upsert(row, { onConflict: "student_id" })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") return { ok: false, code: "unavailable", message: "חדר אישי לא זמין", status: 503 };
    return { ok: false, code: "db_error", message: error.message };
  }

  return {
    ok: true,
    room: {
      studentId: data.student_id,
      roomName: data.room_name,
      backgroundId: data.background_id,
      decorationSlots: data.decoration_slots || [],
    },
  };
}
