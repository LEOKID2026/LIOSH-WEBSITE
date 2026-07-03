import { getGuestLeoNumber } from "./guest-display.js";
import { generateUniqueLeoNumber } from "./guest-leo-number.server.js";

/**
 * Ensure every student has a unique 8-digit students.leo_number (registered + guest).
 * Server/service-role only. Never uses login_username.
 * Replaces legacy non-8-digit values (e.g. old 6-digit rows before migration 094).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @returns {Promise<string|null>}
 */
export async function ensureStudentLeoNumber(supabase, studentId) {
  const id = String(studentId || "").trim();
  if (!id) return null;

  const { data: row, error } = await supabase
    .from("students")
    .select("id, leo_number")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message || "leo_number_lookup_failed");
  if (!row?.id) return null;

  const existing = getGuestLeoNumber(row);
  if (existing) return existing;

  const leoNumber = await generateUniqueLeoNumber(supabase);
  const { data: updated, error: updateError } = await supabase
    .from("students")
    .update({ leo_number: leoNumber })
    .eq("id", id)
    .select("leo_number")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "23505") {
      const { data: retryRow } = await supabase
        .from("students")
        .select("leo_number")
        .eq("id", id)
        .maybeSingle();
      return getGuestLeoNumber(retryRow);
    }
    throw new Error(updateError.message || "leo_number_assign_failed");
  }

  if (updated?.leo_number) {
    return getGuestLeoNumber(updated);
  }

  const { data: retryRow } = await supabase
    .from("students")
    .select("leo_number")
    .eq("id", id)
    .maybeSingle();

  return getGuestLeoNumber(retryRow);
}
