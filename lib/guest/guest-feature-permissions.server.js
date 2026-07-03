import { isGuestStudent } from "./guest-display.js";

/** @type {Record<string, boolean>} */
export const GUEST_FEATURE_DEFAULTS = Object.freeze({
  room_public_create: true,
  room_private_create: true,
  room_join_by_code: true,
  quick_game: true,
  invites_send: false,
  invites_receive: false,
  friends: false,
  safe_messages: true,
  shop: false,
  events: true,
  tournaments: false,
  missions: false,
  personal_room: false,
});

export const GUEST_FEATURE_LABELS_HE = Object.freeze({
  room_public_create: "יצירת חדר ציבורי",
  room_private_create: "יצירת חדר פרטי",
  room_join_by_code: "הצטרפות לפי קוד",
  quick_game: "משחק מהיר",
  invites_send: "שליחת הזמנה למשחק",
  invites_receive: "קבלת הזמנה למשחק",
  friends: "הוספת חבר",
  safe_messages: "הודעות מוכנות",
  shop: "רכישת קוסמטיקה",
  events: "אירוע יומי",
  tournaments: "טורנירים",
  missions: "משימות ארקייד",
  personal_room: "חדר אישי",
});

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadGuestFeaturePermissionsMap(supabase) {
  const { data, error } = await supabase
    .from("guest_feature_permissions")
    .select("feature_key, enabled_for_guest");

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message || "")) {
      return { ...GUEST_FEATURE_DEFAULTS };
    }
    throw new Error(error.message || "guest_feature_permissions_load_failed");
  }

  const map = { ...GUEST_FEATURE_DEFAULTS };
  for (const row of data || []) {
    const key = String(row.feature_key || "").trim();
    if (!key) continue;
    map[key] = row.enabled_for_guest === true;
  }
  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Array<{ featureKey: string, enabledForGuest: boolean }>} items
 */
export async function upsertGuestFeaturePermissions(supabase, items) {
  const now = new Date().toISOString();
  for (const item of items || []) {
    const featureKey = String(item.featureKey || item.feature_key || "").trim();
    if (!featureKey) continue;
    const { error } = await supabase.from("guest_feature_permissions").upsert(
      {
        feature_key: featureKey,
        enabled_for_guest: item.enabledForGuest === true || item.enabled_for_guest === true,
        updated_at: now,
      },
      { onConflict: "feature_key" }
    );
    if (error) throw new Error(error.message || "guest_feature_permissions_upsert_failed");
  }
  return loadGuestFeaturePermissionsMap(supabase);
}

/**
 * Registered students always allowed; guests follow Admin settings.
 * @param {{ account_kind?: string }} studentRow
 * @param {Record<string, boolean>} permissionsMap
 * @param {string} featureKey
 */
export function isGuestFeatureAllowedForStudent(studentRow, permissionsMap, featureKey) {
  if (!isGuestStudent(studentRow || {})) return true;
  const key = String(featureKey || "").trim();
  if (!key) return false;
  const map = permissionsMap || GUEST_FEATURE_DEFAULTS;
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key] === true;
  return GUEST_FEATURE_DEFAULTS[key] === true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} featureKey
 */
export async function assertGuestArcadeFeature(supabase, studentId, featureKey) {
  const { data: studentRow } = await supabase
    .from("students")
    .select("id, account_kind")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentRow?.id) {
    return { ok: false, status: 404, code: "student_not_found", message: "שחקן לא נמצא" };
  }

  if (!isGuestStudent(studentRow)) {
    return { ok: true };
  }

  const map = await loadGuestFeaturePermissionsMap(supabase);
  if (!isGuestFeatureAllowedForStudent(studentRow, map, featureKey)) {
    return {
      ok: false,
      status: 403,
      code: "guest_feature_locked",
      message: "הפעולה לא זמינה לאורחים כרגע",
    };
  }

  return { ok: true };
}
