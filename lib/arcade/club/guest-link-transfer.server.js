/**
 * Re-link arcade club data from guest student to registered child on parent link.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ guestStudentId: string, targetStudentId: string }} params
 */
export async function transferGuestArcadeClubData(supabase, params) {
  const guestStudentId = params.guestStudentId;
  const targetStudentId = params.targetStudentId;
  if (!guestStudentId || !targetStudentId || guestStudentId === targetStudentId) {
    return { ok: true, skipped: true };
  }

  const social = await transferGuestArcadeSocialGraph(supabase, guestStudentId, targetStudentId);
  if (!social.ok) return social;

  const tablesWithStudentId = [
    "arcade_player_profiles",
    "arcade_player_cosmetics",
    "arcade_player_achievements",
    "arcade_player_mission_progress",
    "arcade_event_participation",
    "arcade_personal_rooms",
    "arcade_presence",
  ];

  let profilesTransferred = 0;

  for (const table of tablesWithStudentId) {
    const { error } = await supabase
      .from(table)
      .update({ student_id: targetStudentId })
      .eq("student_id", guestStudentId);

    if (error && error.code !== "42P01" && !/does not exist/i.test(error.message || "")) {
      if (error.code === "23505" && table === "arcade_player_profiles") {
        const { data: guestProfile } = await supabase
          .from("arcade_player_profiles")
          .select(
            "display_name, display_name_updated_at, total_wins, total_games, favorite_game_key, avatar_id, title_id"
          )
          .eq("student_id", guestStudentId)
          .maybeSingle();

        if (guestProfile) {
          await supabase
            .from("arcade_player_profiles")
            .update({
              display_name: guestProfile.display_name,
              display_name_updated_at: guestProfile.display_name_updated_at,
              total_wins: guestProfile.total_wins,
              total_games: guestProfile.total_games,
              favorite_game_key: guestProfile.favorite_game_key,
              avatar_id: guestProfile.avatar_id,
              title_id: guestProfile.title_id,
              updated_at: new Date().toISOString(),
            })
            .eq("student_id", targetStudentId);
          await supabase.from("arcade_player_profiles").delete().eq("student_id", guestStudentId);
          profilesTransferred += 1;
        }
        continue;
      }
      return { ok: false, code: "arcade_transfer_failed", message: error.message, table };
    }
    if (!error) profilesTransferred += 1;
  }

  await supabase
    .from("arcade_results")
    .update({ student_id: targetStudentId })
    .eq("student_id", guestStudentId);

  return {
    ok: true,
    profilesTransferred,
    friendshipsMerged: social.friendshipsMerged,
    friendshipsDropped: social.friendshipsDropped,
    friendRequestsMerged: social.friendRequestsMerged,
    friendRequestsDropped: social.friendRequestsDropped,
    invitesExpired: social.invitesExpired,
  };
}

/** @param {string} a @param {string} b */
function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message || "");
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} guestStudentId
 * @param {string} targetStudentId
 */
async function transferGuestArcadeSocialGraph(supabase, guestStudentId, targetStudentId) {
  const friendships = await mergeGuestFriendships(supabase, guestStudentId, targetStudentId);
  if (!friendships.ok) return friendships;

  const requests = await mergeGuestFriendRequests(supabase, guestStudentId, targetStudentId);
  if (!requests.ok) return requests;

  const invites = await expireGuestGameInvites(supabase, guestStudentId);
  if (!invites.ok) return invites;

  return {
    ok: true,
    friendshipsMerged: friendships.merged,
    friendshipsDropped: friendships.dropped,
    friendRequestsMerged: requests.merged,
    friendRequestsDropped: requests.dropped,
    invitesExpired: invites.expired,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} guestStudentId
 * @param {string} targetStudentId
 */
async function mergeGuestFriendships(supabase, guestStudentId, targetStudentId) {
  const { data: rows, error } = await supabase
    .from("arcade_friendships")
    .select("id, student_a_id, student_b_id")
    .or(`student_a_id.eq.${guestStudentId},student_b_id.eq.${guestStudentId}`);

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: true, merged: 0, dropped: 0 };
    }
    return { ok: false, code: "friendships_load_failed", message: error.message };
  }

  let merged = 0;
  let dropped = 0;

  for (const row of rows || []) {
    const otherId = row.student_a_id === guestStudentId ? row.student_b_id : row.student_a_id;
    if (!otherId || otherId === targetStudentId) {
      await supabase.from("arcade_friendships").delete().eq("id", row.id);
      dropped += 1;
      continue;
    }

    const [newA, newB] = orderedPair(targetStudentId, otherId);

    const { data: existing } = await supabase
      .from("arcade_friendships")
      .select("id")
      .eq("student_a_id", newA)
      .eq("student_b_id", newB)
      .maybeSingle();

    if (existing?.id && existing.id !== row.id) {
      await supabase.from("arcade_friendships").delete().eq("id", row.id);
      dropped += 1;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("arcade_friendships")
      .update({ student_a_id: newA, student_b_id: newB })
      .eq("id", row.id);

    if (updateErr) {
      if (updateErr.code === "23505") {
        await supabase.from("arcade_friendships").delete().eq("id", row.id);
        dropped += 1;
        continue;
      }
      return { ok: false, code: "friendships_merge_failed", message: updateErr.message };
    }
    merged += 1;
  }

  return { ok: true, merged, dropped };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} guestStudentId
 * @param {string} targetStudentId
 */
async function mergeGuestFriendRequests(supabase, guestStudentId, targetStudentId) {
  const { data: rows, error } = await supabase
    .from("arcade_friend_requests")
    .select("id, from_student_id, to_student_id, status")
    .or(`from_student_id.eq.${guestStudentId},to_student_id.eq.${guestStudentId}`);

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: true, merged: 0, dropped: 0 };
    }
    return { ok: false, code: "friend_requests_load_failed", message: error.message };
  }

  let merged = 0;
  let dropped = 0;

  for (const row of rows || []) {
    const newFrom = row.from_student_id === guestStudentId ? targetStudentId : row.from_student_id;
    const newTo = row.to_student_id === guestStudentId ? targetStudentId : row.to_student_id;

    if (newFrom === newTo) {
      await supabase.from("arcade_friend_requests").delete().eq("id", row.id);
      dropped += 1;
      continue;
    }

    const [friendA, friendB] = orderedPair(newFrom, newTo);
    const { data: friendship } = await supabase
      .from("arcade_friendships")
      .select("id")
      .eq("student_a_id", friendA)
      .eq("student_b_id", friendB)
      .maybeSingle();

    if (friendship?.id) {
      await supabase.from("arcade_friend_requests").delete().eq("id", row.id);
      dropped += 1;
      continue;
    }

    const { data: duplicate } = await supabase
      .from("arcade_friend_requests")
      .select("id")
      .eq("from_student_id", newFrom)
      .eq("to_student_id", newTo)
      .neq("id", row.id)
      .maybeSingle();

    if (duplicate?.id) {
      await supabase.from("arcade_friend_requests").delete().eq("id", row.id);
      dropped += 1;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("arcade_friend_requests")
      .update({ from_student_id: newFrom, to_student_id: newTo })
      .eq("id", row.id);

    if (updateErr) {
      if (updateErr.code === "23505") {
        await supabase.from("arcade_friend_requests").delete().eq("id", row.id);
        dropped += 1;
        continue;
      }
      return { ok: false, code: "friend_requests_merge_failed", message: updateErr.message };
    }
    merged += 1;
  }

  return { ok: true, merged, dropped };
}

/**
 * Pending game invites are session-scoped — expire instead of re-linking.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} guestStudentId
 */
async function expireGuestGameInvites(supabase, guestStudentId) {
  const { data, error } = await supabase
    .from("arcade_invites")
    .update({ status: "expired" })
    .eq("status", "pending")
    .or(`from_student_id.eq.${guestStudentId},to_student_id.eq.${guestStudentId}`)
    .select("id");

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: true, expired: 0 };
    }
    return { ok: false, code: "invites_expire_failed", message: error.message };
  }

  return { ok: true, expired: (data || []).length };
}
