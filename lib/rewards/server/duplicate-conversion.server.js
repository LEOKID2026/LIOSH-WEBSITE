/**
 * Legacy bulk duplicate conversion — disabled in favor of manual shop sellback.
 */

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} _supabase
 * @param {string} _studentId
 * @param {string} _cardId
 */
export async function convertDuplicates(_supabase, _studentId, _cardId) {
  return {
    ok: false,
    code: "feature_disabled",
    message: "המרת כפילויות בוטלה - אפשר למכור עותק כפול בחנות.",
  };
}
