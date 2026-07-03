import { formatGuestDisplayNameHe, isGuestStudent } from "../../guest/guest-display.js";
import { ensureStudentLeoNumber } from "../../guest/ensure-student-leo-number.server.js";

const DISPLAY_NAME_MAX = 20;
const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const FORBIDDEN_DISPLAY_NAME = /[<>{}\[\]|\\/`~]/;

function firstNameFromFullName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[0] || "שחקן ליאו";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ id: string, full_name?: string, account_kind?: string, leo_number?: string }} studentRow
 */
export async function ensureArcadePlayerProfile(supabase, studentRow) {
  if (!studentRow?.id) return null;

  const { data: existing } = await supabase
    .from("arcade_player_profiles")
    .select("*")
    .eq("student_id", studentRow.id)
    .maybeSingle();

  if (existing?.student_id) return existing;

  const defaultName = isGuestStudent(studentRow)
    ? formatGuestDisplayNameHe(studentRow)
    : firstNameFromFullName(studentRow.full_name);

  const { data, error } = await supabase
    .from("arcade_player_profiles")
    .insert({
      student_id: studentRow.id,
      display_name: defaultName.slice(0, DISPLAY_NAME_MAX),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message || "")) return null;
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("arcade_player_profiles")
        .select("*")
        .eq("student_id", studentRow.id)
        .maybeSingle();
      return retry;
    }
    throw new Error(error.message || "profile_create_failed");
  }

  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getArcadeDisplayName(supabase, studentId) {
  const { data: studentRow } = await supabase
    .from("students")
    .select("id, full_name, account_kind, leo_number")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentRow?.id) return "שחקן";

  const profile = await ensureArcadePlayerProfile(supabase, studentRow);
  if (profile?.display_name) return String(profile.display_name);

  return isGuestStudent(studentRow)
    ? formatGuestDisplayNameHe(studentRow)
    : firstNameFromFullName(studentRow.full_name);
}

export function validateDisplayNameInput(raw) {
  const name = String(raw || "").trim();
  if (name.length < DISPLAY_NAME_MIN) {
    return { ok: false, code: "empty_name", message: "שם תצוגה לא יכול להיות ריק" };
  }
  if (name.length > DISPLAY_NAME_MAX) {
    return { ok: false, code: "name_too_long", message: `שם תצוגה עד ${DISPLAY_NAME_MAX} תווים` };
  }
  if (FORBIDDEN_DISPLAY_NAME.test(name)) {
    return { ok: false, code: "invalid_chars", message: "שם תצוגה מכיל תווים לא מותרים" };
  }
  return { ok: true, displayName: name };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} displayName
 */
export async function updateArcadeDisplayName(supabase, studentId, displayName) {
  const validation = validateDisplayNameInput(displayName);
  if (!validation.ok) return validation;

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, full_name, account_kind, leo_number")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentRow?.id) {
    return { ok: false, code: "student_not_found", message: "שחקן לא נמצא", status: 404 };
  }

  await ensureArcadePlayerProfile(supabase, studentRow);

  const { data: current } = await supabase
    .from("arcade_player_profiles")
    .select("display_name, display_name_updated_at")
    .eq("student_id", studentId)
    .maybeSingle();

  if (current?.display_name_updated_at) {
    const last = new Date(String(current.display_name_updated_at)).getTime();
    if (Number.isFinite(last) && Date.now() - last < DISPLAY_NAME_COOLDOWN_MS) {
      return {
        ok: false,
        code: "rate_limited",
        message: "ניתן לשנות שם תצוגה פעם ב-24 שעות",
        status: 429,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("arcade_player_profiles")
    .update({
      display_name: validation.displayName,
      display_name_updated_at: nowIso,
      updated_at: nowIso,
    })
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return { ok: false, code: "profile_unavailable", message: "פרופיל לא זמין", status: 503 };
    }
    return { ok: false, code: "update_failed", message: error.message, status: 500 };
  }

  return { ok: true, profile: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getArcadePlayerProfileView(supabase, studentId, { viewerStudentId = null } = {}) {
  const { data: studentRow } = await supabase
    .from("students")
    .select("id, full_name, account_kind, leo_number")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentRow?.id) return null;

  const profile = await ensureArcadePlayerProfile(supabase, studentRow);
  const isSelf = viewerStudentId && viewerStudentId === studentId;

  const base = {
    studentId: studentRow.id,
    displayName: profile?.display_name || (await getArcadeDisplayName(supabase, studentId)),
    isGuest: isGuestStudent(studentRow),
    totalWins: profile?.total_wins ?? 0,
    totalGames: profile?.total_games ?? 0,
    favoriteGameKey: profile?.favorite_game_key || null,
    avatarId: profile?.avatar_id ?? null,
    titleId: profile?.title_id ?? null,
  };

  if (isSelf) {
    const leoNumber = await ensureStudentLeoNumber(supabase, studentRow.id);
    return {
      ...base,
      fullName: studentRow.full_name || null,
      leoNumber,
    };
  }

  return base;
}

/**
 * Increment stats after game finish.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ won?: boolean, gameKey?: string }} params
 */
export async function bumpArcadePlayerStats(supabase, studentId, params = {}) {
  const { data: studentRow } = await supabase
    .from("students")
    .select("id, full_name, account_kind, leo_number")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentRow?.id) return;

  const profile = await ensureArcadePlayerProfile(supabase, studentRow);
  if (!profile) return;

  const totalGames = (profile.total_games || 0) + 1;
  const totalWins = (profile.total_wins || 0) + (params.won ? 1 : 0);
  const patch = {
    total_games: totalGames,
    total_wins: totalWins,
    updated_at: new Date().toISOString(),
  };

  if (params.won && params.gameKey) {
    patch.favorite_game_key = params.gameKey;
  }

  await supabase.from("arcade_player_profiles").update(patch).eq("student_id", studentId);
}
