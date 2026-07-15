import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";

import { applyArcadeCoinMove } from "../server/arcade-coins.js";



function utcDayBounds() {

  const now = new Date();

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  return { startIso: start.toISOString(), endIso: end.toISOString() };

}



/**

 * Ensure one active daily event exists for the current UTC day.

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 */

export async function ensureDailyEventForToday(supabase) {

  const { startIso, endIso } = utcDayBounds();

  const { data: existing } = await supabase

    .from("arcade_events")

    .select("id")

    .eq("active", true)

    .eq("event_type", "daily")

    .gte("starts_at", startIso)

    .lte("ends_at", endIso)

    .limit(1)

    .maybeSingle();



  if (existing?.id) return existing.id;



  const { data, error } = await supabase

    .from("arcade_events")

    .insert({

      title_he: "אתגר היום - שחק משחק ארקייד",

      game_key: null,

      event_type: "daily",

      reward_coins: 25,

      starts_at: startIso,

      ends_at: endIso,

      active: true,

    })

    .select("id")

    .single();



  if (error?.code === "42P01") return null;

  return data?.id || null;

}



/**

 * Mark daily event completed after playing any arcade game.

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string} studentId

 */

export async function markDailyEventPlayCompleted(supabase, studentId) {

  const feature = await assertGuestArcadeFeature(supabase, studentId, "events");

  if (!feature.ok) return;



  const eventId = await ensureDailyEventForToday(supabase);

  if (!eventId) return;



  const nowIso = new Date().toISOString();

  await supabase.from("arcade_event_participation").upsert(

    {

      student_id: studentId,

      event_id: eventId,

      completed_at: nowIso,

      reward_claimed: false,

    },

    { onConflict: "student_id,event_id" }

  );

}



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string|null} studentId

 */

export async function getActiveDailyEvent(supabase, studentId = null) {

  await ensureDailyEventForToday(supabase);



  const now = new Date().toISOString();

  const { data } = await supabase

    .from("arcade_events")

    .select("*")

    .eq("active", true)

    .eq("event_type", "daily")

    .lte("starts_at", now)

    .gte("ends_at", now)

    .order("starts_at", { ascending: false })

    .limit(1)

    .maybeSingle();



  if (!data?.id) return null;



  let completed = false;

  let claimed = false;

  if (studentId) {

    const { data: part } = await supabase

      .from("arcade_event_participation")

      .select("completed_at, reward_claimed")

      .eq("student_id", studentId)

      .eq("event_id", data.id)

      .maybeSingle();

    completed = Boolean(part?.completed_at);

    claimed = part?.reward_claimed === true;

  }



  return {

    id: data.id,

    titleHe: data.title_he,

    gameKey: data.game_key,

    rewardCoins: data.reward_coins,

    startsAt: data.starts_at,

    endsAt: data.ends_at,

    completed,

    claimed,

    canClaim: completed && !claimed,

  };

}



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string|null} studentId

 */

export async function getActiveTournament(supabase, studentId = null) {

  const { data } = await supabase

    .from("arcade_tournaments")

    .select("*")

    .in("status", ["registration", "active"])

    .order("starts_at", { ascending: true })

    .limit(1)

    .maybeSingle();



  if (!data?.id) return null;



  const { count } = await supabase

    .from("arcade_tournament_players")

    .select("*", { count: "exact", head: true })

    .eq("tournament_id", data.id);



  let registered = false;

  if (studentId) {

    const { data: row } = await supabase

      .from("arcade_tournament_players")

      .select("student_id")

      .eq("tournament_id", data.id)

      .eq("student_id", studentId)

      .maybeSingle();

    registered = Boolean(row?.student_id);

  }



  return {

    id: data.id,

    titleHe: data.title_he,

    gameKey: data.game_key,

    maxPlayers: data.max_players,

    status: data.status,

    playerCount: count || 0,

    startsAt: data.starts_at,

    registrationOpen: data.status === "registration",

    registered,

  };

}



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string} studentId

 * @param {string} eventId

 */

export async function claimEventReward(supabase, studentId, eventId) {

  const feature = await assertGuestArcadeFeature(supabase, studentId, "events");

  if (!feature.ok) return feature;



  const { data: event } = await supabase.from("arcade_events").select("*").eq("id", eventId).maybeSingle();

  if (!event?.id) return { ok: false, code: "not_found", message: "אירוע לא נמצא" };



  const { data: part } = await supabase

    .from("arcade_event_participation")

    .select("*")

    .eq("student_id", studentId)

    .eq("event_id", eventId)

    .maybeSingle();



  if (!part?.completed_at) return { ok: false, code: "not_completed", message: "טרם השלמת את האירוע" };

  if (part.reward_claimed) return { ok: false, code: "already_claimed", message: "הפרס כבר נתבע" };



  if (event.reward_coins > 0) {

    await applyArcadeCoinMove(supabase, {

      studentId,

      direction: "earn",

      amount: event.reward_coins,

      idempotencyKey: `event:${eventId}:${studentId}`,

      sourceType: "arcade_event",

      sourceId: eventId,

      metadata: {},

      reason: "event_reward",

    });

  }



  await supabase

    .from("arcade_event_participation")

    .update({ reward_claimed: true })

    .eq("student_id", studentId)

    .eq("event_id", eventId);



  return { ok: true, rewardCoins: event.reward_coins };

}



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string} studentId

 * @param {string} tournamentId

 */

export async function registerForTournament(supabase, studentId, tournamentId) {

  const feature = await assertGuestArcadeFeature(supabase, studentId, "tournaments");

  if (!feature.ok) return feature;



  const { data: t } = await supabase.from("arcade_tournaments").select("*").eq("id", tournamentId).maybeSingle();

  if (!t?.id || t.status !== "registration") {

    return { ok: false, code: "not_open", message: "ההרשמה לטורניר סגורה" };

  }



  const { count } = await supabase

    .from("arcade_tournament_players")

    .select("*", { count: "exact", head: true })

    .eq("tournament_id", tournamentId);



  if ((count || 0) >= t.max_players) {

    return { ok: false, code: "full", message: "הטורניר מלא" };

  }



  await supabase.from("arcade_tournament_players").upsert(

    { tournament_id: tournamentId, student_id: studentId, seed: (count || 0) + 1 },

    { onConflict: "tournament_id,student_id" }

  );



  return { ok: true };

}



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string} tournamentId

 */

export async function getTournamentBracket(supabase, tournamentId) {

  const { data: t } = await supabase.from("arcade_tournaments").select("*").eq("id", tournamentId).maybeSingle();

  if (!t?.id) return null;



  const { data: players } = await supabase

    .from("arcade_tournament_players")

    .select("student_id, seed, result")

    .eq("tournament_id", tournamentId)

    .order("seed", { ascending: true });



  return {

    id: t.id,

    titleHe: t.title_he,

    status: t.status,

    bracketData: t.bracket_data,

    players: players || [],

  };

}

