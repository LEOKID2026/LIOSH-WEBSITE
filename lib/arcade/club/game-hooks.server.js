import { bumpArcadePlayerStats } from "./player-profile.server.js";

import { bumpMissionProgress, unlockArcadeAchievements } from "./missions.server.js";

import { markDailyEventPlayCompleted } from "./events.server.js";



/**

 * @param {import("@supabase/supabase-js").SupabaseClient} supabase

 * @param {string} studentId

 * @param {string} gameKey

 * @param {{ won?: boolean, joinedPublic?: boolean }} opts

 */

export async function recordArcadeClubActivity(supabase, studentId, gameKey, opts = {}) {

  try {

    if (opts.won) {

      await bumpArcadePlayerStats(supabase, studentId, { won: true, gameKey });

      await bumpMissionProgress(supabase, studentId, { goalType: "win", gameKey });

    } else {

      await bumpArcadePlayerStats(supabase, studentId, { won: false, gameKey });

    }

    await bumpMissionProgress(supabase, studentId, { goalType: "play", gameKey });

    if (opts.joinedPublic) {

      await bumpMissionProgress(supabase, studentId, { goalType: "join", gameKey: null });

    }

    await markDailyEventPlayCompleted(supabase, studentId);

    await unlockArcadeAchievements(supabase, studentId);

  } catch {

    // non-blocking club hooks

  }

}

