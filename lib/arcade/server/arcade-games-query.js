/**
 * קריאות DB קטנות אל arcade_games — נפרד כדי למנוע ייבוא מעגלי (משחקים ↔ arcade-rooms ↔ מדיניות התחלה).
 */

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 */
export async function fetchArcadeGameRow(supabase, gameKey) {
  const { data, error } = await supabase.from("arcade_games").select("*").eq("game_key", gameKey).maybeSingle();
  if (error) return { error: { code: "db_error", message: error.message } };
  if (!data) return { error: { code: "unknown_game", message: "משחק לא קיים" } };
  return { game: data };
}
