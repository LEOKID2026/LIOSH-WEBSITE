/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ limit?: number, offset?: number }} opts
 */
export async function listArcadeGameHistory(supabase, studentId, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 20, 1), 50);
  const offset = Math.max(Number(opts.offset) || 0, 0);

  const { data, error } = await supabase
    .from("arcade_results")
    .select("id, room_id, game_session_id, result_type, placement, reward_amount, metadata, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (error.code === "42P01") return { ok: true, history: [], total: 0 };
    return { ok: false, code: "db_error", message: error.message };
  }

  return {
    ok: true,
    history: (data || []).map((row) => ({
      id: row.id,
      roomId: row.room_id,
      gameSessionId: row.game_session_id,
      resultType: row.result_type,
      placement: row.placement,
      rewardAmount: row.reward_amount,
      createdAt: row.created_at,
      metadata: row.metadata || {},
      gameKey: row.metadata?.gameKey || row.metadata?.game_key || null,
    })),
    limit,
    offset,
  };
}
